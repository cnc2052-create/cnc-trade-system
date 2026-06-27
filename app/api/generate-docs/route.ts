import { NextRequest, NextResponse } from "next/server";
import { generateMarkingPDF, generatePackingListPDF, generateReceiptPDF } from "@/lib/pdf-generators";
import { generatePackingListExcel } from "@/lib/excel-generators";
import { OrderInfo, FactoryShipmentInfo } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      docType: "marking" | "packing-pdf" | "packing-excel" | "receipt";
      order: OrderInfo;
      shipment: FactoryShipmentInfo;
    };

    const { docType, order, shipment } = body;

    if (!order || !shipment) {
      return NextResponse.json({ error: "수주 정보와 출고 정보가 필요합니다." }, { status: 400 });
    }

    let buffer: Buffer;
    let filename: string;
    let contentType: string;

    switch (docType) {
      case "marking":
        buffer = generateMarkingPDF(order);
        filename = `marking_${order.orderNo}_${order.orderDate}.pdf`;
        contentType = "application/pdf";
        break;

      case "packing-pdf":
        buffer = generatePackingListPDF(order, shipment);
        filename = `packing_list_${order.orderNo}_${shipment.shipDate}.pdf`;
        contentType = "application/pdf";
        break;

      case "packing-excel":
        buffer = generatePackingListExcel(order, shipment);
        filename = `packing_list_${order.orderNo}_${shipment.shipDate}.xlsx`;
        contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        break;

      case "receipt":
        buffer = generateReceiptPDF(order, shipment);
        filename = `receipt_${order.orderNo}_${shipment.shipDate}.pdf`;
        contentType = "application/pdf";
        break;

      default:
        return NextResponse.json({ error: "올바르지 않은 문서 타입입니다." }, { status: 400 });
    }

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (err) {
    console.error("Document generation error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "문서 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

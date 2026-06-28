import { NextRequest, NextResponse } from "next/server";
import { generatePackingListExcel, FactoryShipment } from "@/lib/packing-generator";

export async function POST(req: NextRequest) {
  try {
    const { shipment } = await req.json() as { shipment: FactoryShipment };
    if (!shipment) return NextResponse.json({ error: "데이터 부족" }, { status: 400 });

    const buffer = generatePackingListExcel(shipment);
    const filename = `PackingList_${shipment.shipDate}.xlsx`;
    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "생성 오류" }, { status: 500 });
  }
}

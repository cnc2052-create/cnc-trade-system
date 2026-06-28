import { NextRequest, NextResponse } from "next/server";
import {
  generateChinaOrderExcel,
  generatePackingListExcel,
  generateReceiptExcel,
} from "@/lib/excel-generators";
import { CustomerQuote, MarkingEntry } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      docType: "china-order" | "packing" | "receipt";
      quote: CustomerQuote;
      markings: MarkingEntry[];
    };

    const { docType, quote, markings } = body;
    if (!quote || !markings) {
      return NextResponse.json({ error: "데이터가 부족합니다." }, { status: 400 });
    }

    let buffer: Buffer;
    let filename: string;

    switch (docType) {
      case "china-order":
        buffer = generateChinaOrderExcel(quote, markings);
        filename = `중국발주서_${quote.quoteNo}_${quote.quoteDate}.xlsx`;
        break;
      case "packing":
        buffer = generatePackingListExcel(quote, markings);
        filename = `패킹리스트_${quote.quoteNo}_${quote.quoteDate}.xlsx`;
        break;
      case "receipt":
        buffer = generateReceiptExcel(quote, markings);
        filename = `입고명세서_${quote.quoteNo}_${quote.quoteDate}.xlsx`;
        break;
      default:
        return NextResponse.json({ error: "잘못된 문서 타입" }, { status: 400 });
    }

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "문서 생성 오류" },
      { status: 500 }
    );
  }
}

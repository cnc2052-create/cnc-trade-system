import { NextRequest, NextResponse } from "next/server";
import { generateMarkingExcel } from "@/lib/marking-generator";
import { CustomerQuote, MarkingEntry } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { quote, markings } = await req.json() as { quote: CustomerQuote; markings: MarkingEntry[] };
    if (!quote || !markings) return NextResponse.json({ error: "데이터 부족" }, { status: 400 });

    const buffer = generateMarkingExcel(quote, markings);
    const filename = `마킹_${quote.quoteNo}_${quote.quoteDate}.xlsx`;
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

import { NextRequest, NextResponse } from "next/server";
import { generateMarkingExcel } from "@/lib/marking-generator";
import { CustomerQuote, MarkingEntry } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { quote, markings } = await req.json() as { quote: CustomerQuote; markings: MarkingEntry[] };
    if (!quote || !markings?.length) return NextResponse.json({ error: "데이터 부족" }, { status: 400 });

    console.log(`마킹 생성: ${markings.length}종`, markings.map(m => m.markingName));
    const buffer = await generateMarkingExcel(quote, markings);
    const filename = `마킹_${markings.length}종_${quote.quoteNo}.xlsx`;

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "생성 오류" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { generateChinaOrderHTML } from "@/lib/china-order-html";
import { CustomerQuote, MarkingEntry } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { quote, markings } = await req.json() as { quote: CustomerQuote; markings: MarkingEntry[] };
    if (!quote || !markings) return NextResponse.json({ error: "데이터 부족" }, { status: 400 });

    const html = generateChinaOrderHTML(quote, markings);
    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "생성 오류" }, { status: 500 });
  }
}

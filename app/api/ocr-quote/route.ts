import { NextRequest, NextResponse } from "next/server";
import { extractQuote } from "@/lib/openai";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("image") as File;
    if (!file) return NextResponse.json({ error: "이미지가 없습니다." }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mediaType = file.type || "image/jpeg";

    const quote = await extractQuote(base64, mediaType);
    return NextResponse.json({ success: true, data: quote });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "OCR 오류" },
      { status: 500 }
    );
  }
}

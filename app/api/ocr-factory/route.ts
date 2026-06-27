import { NextRequest, NextResponse } from "next/server";
import { extractShipmentFromFactory } from "@/lib/openai";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("image") as File;

    if (!file) {
      return NextResponse.json({ error: "이미지 파일이 없습니다." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mediaType = file.type || "image/jpeg";

    const shipmentInfo = await extractShipmentFromFactory(base64, mediaType);
    return NextResponse.json({ success: true, data: shipmentInfo });
  } catch (err) {
    console.error("Factory OCR error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "OCR 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

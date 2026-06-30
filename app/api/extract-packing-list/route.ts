import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64) return NextResponse.json({ error: "이미지 없음" }, { status: 400 });

    const res = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text: `이 이미지는 중국 공장에서 보내온 패킹 명세 또는 포장 사진입니다.
아래 JSON 형식으로만 응답하세요. 다른 텍스트는 절대 포함하지 마세요.

{
  "items": [
    {
      "productNameEn": "영문 제품명 (Cream Tube, Cap, Bottle 등 영어로 번역)",
      "productNameKo": "한국어 또는 중국어 원본 제품명",
      "quantity": 총수량 숫자 (박스*개수+나머지 계산),
      "unit": "PCS 또는 CTN 등",
      "boxCount": 총 박스수 숫자,
      "packingBreakdown": "이미지에 표기된 포장 방식 원문 그대로 (예: 5*1914+470 또는 1914×5+470)"
    }
  ]
}

규칙:
- packingBreakdown: 이미지에서 '박스수*박스당수량+나머지' 형태의 숫자 표기를 그대로 추출. 예) 5*1914+470
- boxCount: 위 예시에서 5+1=6 (나머지가 있으면 +1박스 추가)
- quantity: 5*1914+470=10040 처럼 실제 총수량 계산
- productNameEn은 반드시 영어로 작성
- 여러 제품이 있으면 items 배열에 모두 포함`,
          },
          { type: "image_url", image_url: { url: imageBase64, detail: "high" } },
        ],
      }],
      max_tokens: 600,
    });

    const text = res.choices[0].message.content?.trim() || "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ error: "파싱 실패" }, { status: 500 });

    return NextResponse.json({ success: true, data: JSON.parse(match[0]) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "오류" }, { status: 500 });
  }
}

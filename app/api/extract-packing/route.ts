import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64) return NextResponse.json({ error: "이미지 없음" }, { status: 400 });

    const res = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `이 이미지는 중국 공장에서 보내온 패킹리스트 또는 포장 사진입니다.
아래 정보를 추출해서 반드시 JSON으로만 응답하세요. 다른 텍스트는 절대 포함하지 마세요.

{
  "packing": "패킹 수량 정보 (예: 5×1914 + 470 또는 3×2000). 이미지에서 박스수×수량+여분 형태로 추출",
  "productName": "제품명 (없으면 빈 문자열)",
  "deliveryAddress": "배송지 주소 (여러 줄이면 \\n으로 구분, 없으면 빈 문자열)",
  "deliveryDate": "도착예정일 YYYY-MM-DD 형식 (없으면 빈 문자열)",
  "notes": "기타 특이사항 (없으면 빈 문자열)"
}

패킹 형식 규칙:
- "N박스 × M개" 형태 → "N×M"
- "N박스 × M개 + K개 낱개" 형태 → "N×M + K"
- 숫자만 있는 경우 그대로 기입`,
            },
            {
              type: "image_url",
              image_url: { url: imageBase64, detail: "high" },
            },
          ],
        },
      ],
      max_tokens: 500,
    });

    const text = res.choices[0].message.content?.trim() || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: "파싱 실패" }, { status: 500 });

    const data = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "오류" }, { status: 500 });
  }
}

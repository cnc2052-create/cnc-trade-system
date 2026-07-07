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
  "items": [
    {
      "productName": "부품명 또는 제품명 (이미지에서 각 행의 제품명/부품명)",
      "packing": "해당 부품의 패킹 수량 (예: 63×160 + 1×25 + 29×340)"
    }
  ],
  "deliveryAddress": "배송지 주소 (여러 줄이면 \\n으로 구분, 없으면 빈 문자열)",
  "deliveryDate": "출货日期 또는 도착예정일 YYYY-MM-DD 형식 (없으면 빈 문자열)",
  "notes": "기타 특이사항 (없으면 빈 문자열)"
}

중요: 제품이 여러 부품(예: 瓶身, 外盖 등)으로 나뉘어 있으면 items 배열에 각각 분리해서 넣으세요.
패킹 형식 규칙:
- 테이블의 각 행에서 제품명과 박스수×수량 패턴을 추출
- "N박스 × M개" 형태 → "N×M"
- "N박스 × M개 + K개 낱개" 형태 → "N×M + K"
- 여러 박스 규격이 있으면 " + "로 연결 (예: 63×160 + 1×25 + 29×340)`,
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

import OpenAI from "openai";
import { CustomerQuote } from "@/types";

function getClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function extractQuote(
  imageBase64: string,
  mediaType: string
): Promise<CustomerQuote> {
  const response = await getClient().chat.completions.create({
    model: "gpt-4o",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:${mediaType};base64,${imageBase64}`,
              detail: "high",
            },
          },
          {
            type: "text",
            text: `이 이미지는 고객사 발주 견적서입니다.
아래 JSON 형식으로 정보를 추출해주세요. 마크다운 없이 순수 JSON만 반환하세요.

{
  "quoteNo": "견적번호 또는 발주번호",
  "quoteDate": "날짜 (YYYY-MM-DD)",
  "customer": "고객사명",
  "deliveryDate": "납기일 (YYYY-MM-DD, 있으면)",
  "currency": "통화 (KRW/USD/CNY, 기본 KRW)",
  "items": [
    {
      "no": 순번(숫자),
      "productName": "제품명",
      "spec": "규격 (있으면)",
      "postProcess": "후가공 내용 (있으면, 없으면 빈문자열)",
      "quantity": 수량(숫자),
      "unit": "단위 (EA/PCS/SET 등)",
      "unitPrice": 단가(숫자),
      "amount": 금액(숫자),
      "deliveryDate": "해당 품목 납기 (YYYY-MM-DD, 있으면)",
      "remarks": "비고 (있으면)"
    }
  ],
  "totalAmount": 합계(숫자),
  "remarks": "전체 비고 (있으면)"
}

후가공은 도금, 도장, 아노다이징, 열처리, 용접 등 표면처리/가공 내용을 의미합니다.
숫자는 반드시 숫자 타입으로, 없는 항목은 빈 문자열 또는 0으로 반환하세요.`,
          },
        ],
      },
    ],
  });

  const text = response.choices[0]?.message?.content || "";
  try {
    return JSON.parse(text) as CustomerQuote;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]) as CustomerQuote;
    throw new Error("견적서에서 정보를 추출하지 못했습니다.");
  }
}

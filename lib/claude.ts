import Anthropic from "@anthropic-ai/sdk";
import { OrderInfo, FactoryShipmentInfo } from "@/types";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function extractOrderFromERP(
  imageBase64: string,
  mediaType: string
): Promise<OrderInfo> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
              data: imageBase64,
            },
          },
          {
            type: "text",
            text: `이 이미지는 씨앤씨무역의 ERP 수주 화면입니다.
이미지에서 다음 정보를 추출하여 JSON 형식으로 반환해주세요.
반드시 아래 형식의 순수 JSON만 반환하고, 마크다운 코드블록 없이 JSON만 출력하세요:

{
  "orderNo": "수주번호",
  "orderDate": "수주일자 (YYYY-MM-DD)",
  "customer": "고객사명",
  "customerAddr": "고객사 주소 (있으면)",
  "deliveryDate": "납기일 (YYYY-MM-DD, 있으면)",
  "currency": "통화 (KRW/USD/CNY)",
  "items": [
    {
      "productName": "제품명",
      "productNameCn": "중국어 제품명 (있으면)",
      "spec": "규격 (있으면)",
      "unit": "단위",
      "quantity": 수량(숫자),
      "unitPrice": 단가(숫자),
      "amount": 금액(숫자),
      "marking": "마킹 (있으면)"
    }
  ],
  "totalAmount": 합계금액(숫자),
  "remarks": "비고 (있으면)"
}

항목이 명확하지 않은 경우 빈 문자열이나 0을 사용하세요.`,
          },
        ],
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  try {
    return JSON.parse(text) as OrderInfo;
  } catch {
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as OrderInfo;
    }
    throw new Error("ERP 이미지에서 수주 정보를 추출하지 못했습니다.");
  }
}

export async function extractShipmentFromFactory(
  imageBase64: string,
  mediaType: string
): Promise<FactoryShipmentInfo> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
              data: imageBase64,
            },
          },
          {
            type: "text",
            text: `이 이미지는 중국 공장에서 보낸 출고 정보입니다 (중국어).
이미지에서 다음 정보를 추출하여 JSON 형식으로 반환해주세요.
반드시 아래 형식의 순수 JSON만 반환하고, 마크다운 코드블록 없이 JSON만 출력하세요:

{
  "shipDate": "출고일 (YYYY-MM-DD)",
  "factory": "공장명 (있으면)",
  "items": [
    {
      "productName": "제품명 (한국어로 번역)",
      "productNameCn": "중국어 원문 제품명",
      "spec": "규격",
      "quantity": 수량(숫자),
      "unit": "단위",
      "cartons": 박스수(숫자, 있으면),
      "weight": 중량kg(숫자, 있으면),
      "cbm": CBM(숫자, 있으면)
    }
  ],
  "totalQty": 총수량(숫자),
  "totalWeight": 총중량kg(숫자, 있으면),
  "totalCbm": 총CBM(숫자, 있으면),
  "remarks": "비고 (있으면)"
}

중국어를 한국어로 번역하고, 숫자는 반드시 숫자 타입으로 반환하세요.`,
          },
        ],
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  try {
    return JSON.parse(text) as FactoryShipmentInfo;
  } catch {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as FactoryShipmentInfo;
    }
    throw new Error("공장 출고 이미지에서 정보를 추출하지 못했습니다.");
  }
}

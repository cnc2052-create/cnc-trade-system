import OpenAI from "openai";
import { CustomerQuote } from "@/types";
import { FactoryShipment } from "./packing-generator";

function getClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/* ── 고객 견적서 추출 ── */
export async function extractQuote(
  imageBase64: string,
  mediaType: string
): Promise<CustomerQuote> {
  const response = await getClient().chat.completions.create({
    model: "gpt-4o",
    max_tokens: 4096,
    messages: [{
      role: "user",
      content: [
        { type: "image_url", image_url: { url: `data:${mediaType};base64,${imageBase64}`, detail: "high" } },
        { type: "text", text: `이 이미지는 고객사 발주 견적서입니다.
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
      "productCode": "품목코드 컬럼의 값 (품목코드/코드/품번 컬럼. 없으면 빈문자열)",
      "productName": "품목명 컬럼의 값만 추출. 주의: '내용' 컬럼(색상/공법 설명)은 절대 포함하지 말 것. 규격([15ml] 등)도 제외. 예: '19파이 펌족튜브' / '크림용기' / '튜브'",
      "spec": "규격 (품목명 옆 대괄호 안 값. 예: 15ml, 50g 등)",
      "postProcess": "'내용' 컬럼 전체 텍스트를 그대로 추출 (예: 캡-백색유광 / 튜브-백색무광 / 1도 블랙 옵셋). '내용' 컬럼이 없으면 비고/후가공란의 실크인쇄·도금·도장 등 공정명. 둘 다 없으면 빈문자열.",
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

숫자는 반드시 숫자 타입으로, 없는 항목은 빈 문자열 또는 0으로 반환하세요.` },
      ],
    }],
  });

  const text = response.choices[0]?.message?.content || "";
  try { return JSON.parse(text) as CustomerQuote; }
  catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]) as CustomerQuote;
    throw new Error("견적서 정보 추출 실패");
  }
}

/* ── 중국 공장 출고 이미지 추출 ── */
export async function extractFactoryShipment(
  imageBase64: string,
  mediaType: string
): Promise<FactoryShipment> {
  const response = await getClient().chat.completions.create({
    model: "gpt-4o",
    max_tokens: 4096,
    messages: [{
      role: "user",
      content: [
        { type: "image_url", image_url: { url: `data:${mediaType};base64,${imageBase64}`, detail: "high" } },
        { type: "text", text: `이 이미지는 중국 공장에서 보낸 출고(패킹) 정보입니다.
아래 JSON 형식으로 추출하세요. 순수 JSON만 반환하세요.

{
  "shipDate": "출고일 (YYYY-MM-DD)",
  "factory": "공장명 (있으면, 없으면 빈문자열)",
  "items": [
    {
      "itemNameCn": "중국어 원문 제품명",
      "itemNameEn": "영문 번역 제품명 (Bottle/Pump/Cap/Tube/Jar 등 물류 용어)",
      "material": "재질 (PET/PP/ABS/PE/HDPE 등)",
      "packingBreakdown": "포장 방식 (예: 1914 × 5 + 470, 숫자와 × 기호 사용)",
      "quantity": 총수량(숫자),
      "cartons": 총박스수(숫자)
    }
  ]
}

packingBreakdown 형식: [박스당수량] × [박스수] + [나머지수량]
예: 1,914개씩 5박스 + 470개 나머지 → "1914 × 5 + 470"
재질이 불명확하면 중국어에서 추론하세요.
숫자는 반드시 숫자 타입으로 반환하세요.` },
      ],
    }],
  });

  const text = response.choices[0]?.message?.content || "";
  try { return JSON.parse(text) as FactoryShipment; }
  catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]) as FactoryShipment;
    throw new Error("공장 출고 정보 추출 실패");
  }
}

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

function getClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function POST(req: NextRequest) {
  try {
    const { items } = await req.json() as {
      items: { productName: string; postProcess: string }[];
    };

    const prompt = `아래 한국어 제품명과 후가공을 중국어(简体)로 번역해주세요.
화장품 용기 업계 용어를 사용하세요.
JSON 배열만 반환하세요. 다른 설명 없이.

예시:
- 크림용기 → 霜瓶 / 크림 → 面霜
- 캡 → 盖子 / 아우터캡 → 外盖 / 이너캡 → 内盖
- 펌프 → 泵头 / 디스펜서 → 按压泵
- 실크인쇄 → 丝印 / 도금 → 电镀 / 도장 → 喷涂 / 아노다이징 → 氧化
- 사출 → 注塑 / 1도 → 1色

입력:
${JSON.stringify(items)}

출력 형식 (배열 길이는 입력과 동일):
[{"productNameCn":"...","postProcessCn":"...","productNameEn":"영문 제품명 (Cream Jar / Pump Bottle / Cap 등 물류 영문명)"}]`;

    const res = await getClient().chat.completions.create({
      model: "gpt-4o",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text = res.choices[0]?.message?.content || "[]";
    const clean = text.match(/\[[\s\S]*\]/)?.[0] || "[]";
    const translated = JSON.parse(clean);

    return NextResponse.json({ success: true, translated });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "번역 오류" }, { status: 500 });
  }
}

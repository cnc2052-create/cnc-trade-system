export interface ReceiptItem {
  productName: string;
  packing: string;
}

export interface ReceiptData {
  customer: string;
  productName: string;
  packing: string;
  items?: ReceiptItem[];
  deliveryAddress: string;
  deliveryDate: string;
  packingImageBase64?: string;
}

function calcPacking(packing: string): { totalQty: number; totalBoxes: number } {
  if (!packing) return { totalQty: 0, totalBoxes: 0 };
  const clean = packing.replace(/\s/g, "");
  // 복합 패킹: "63×160 + 1×25 + 29×340" 형태 지원
  let totalQty = 0, totalBoxes = 0;
  const parts = clean.split("+");
  for (const part of parts) {
    const m = part.match(/^(\d+)[×xX*](\d+)$/);
    if (m) {
      totalQty += parseInt(m[1]) * parseInt(m[2]);
      totalBoxes += parseInt(m[1]);
    } else {
      const single = parseInt(part);
      if (!isNaN(single)) { totalQty += single; totalBoxes += 1; }
    }
  }
  return { totalQty, totalBoxes };
}

function formatDate(d: string): string {
  if (!d) return "미입력";
  const clean = d.replace(/[./]/g, "-");
  const m = clean.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!m) return d;
  return `${m[1]}-${m[2].padStart(2,"0")}-${m[3].padStart(2,"0")}`;
}

function comma(n: number): string { return n.toLocaleString("ko-KR"); }

export function buildReceiptHTML(data: ReceiptData): string {
  const useItems = data.items && data.items.length > 0;

  const itemsCalc = useItems
    ? data.items!.map(it => ({ ...it, ...calcPacking(it.packing) }))
    : [];
  const totalQtyAll = itemsCalc.reduce((s, it) => s + it.totalQty, 0);
  const totalBoxesAll = itemsCalc.reduce((s, it) => s + it.totalBoxes, 0);

  const singleCalc = useItems ? { totalQty: 0, totalBoxes: 0 } : calcPacking(data.packing);

  const addressText = (data.deliveryAddress || "미입력").replace(/\n/g, " ");

  // 패킹 섹션 생성 함수
  function packingSection(packing: string, calc: { totalQty: number; totalBoxes: number }) {
    return `<div class="field">
      <span class="field-label">패킹</span>
      <span class="field-sep">│</span>
      <span class="field-value">
        <span class="packing-val">${packing || "미입력"}</span>
        ${calc.totalQty > 0 ? `
        <span class="packing-sub">
          <span>📦 총수량 : <strong>${comma(calc.totalQty)}개</strong></span>
          <span class="sub-sep">│</span>
          <span>📦 총박스수 : <strong>${calc.totalBoxes}박스</strong></span>
        </span>` : ""}
      </span>
    </div>`;
  }

  // 부품 섹션 (items 배열)
  function itemsSection() {
    return itemsCalc.map((it, i) => `
    <div class="field">
      <span class="field-label">${itemsCalc.length > 1 ? `부품 ${i+1}` : "제품명"}</span>
      <span class="field-sep">│</span>
      <span class="field-value">
        <span class="packing-val">${it.productName || "미입력"}</span>
        <span class="packing-sub packing-sub-name">${it.packing || ""}</span>
        ${it.totalQty > 0 ? `
        <span class="packing-sub">
          <span>📦 총수량 : <strong>${comma(it.totalQty)}개</strong></span>
          <span class="sub-sep">│</span>
          <span>📦 총박스수 : <strong>${it.totalBoxes}박스</strong></span>
        </span>` : ""}
      </span>
    </div>`).join("") + (itemsCalc.length > 1 ? `
    <div class="field field-total">
      <span class="field-label">합계</span>
      <span class="field-sep">│</span>
      <span class="field-value">
        <span class="packing-sub">
          <span>📦 총수량 : <strong>${comma(totalQtyAll)}개</strong></span>
          <span class="sub-sep">│</span>
          <span>📦 총박스수 : <strong>${totalBoxesAll}박스</strong></span>
        </span>
      </span>
    </div>` : "");
  }

  return `<!DOCTYPE html>
<html lang="ko"><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>입고명세서</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{
  font-family:"Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic",sans-serif;
  background:#fff;color:#111;
  padding:56px 52px;max-width:720px;margin:0 auto;
  font-size:14px;line-height:1.7;
}
.no-print{position:fixed;top:12px;right:12px;display:flex;gap:8px;z-index:999}
.no-print button{padding:8px 18px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;border:none}
.btn-print{background:#111;color:#fff}
.btn-close{background:#eee;color:#333}

h1{
  text-align:center;
  font-size:32px;font-weight:900;
  letter-spacing:14px;
  margin-bottom:20px;
  color:#111;
}
.title-line{border:none;border-top:1.5px solid #222;margin-bottom:28px}
.divider-line{border:none;border-top:1px solid #ddd;margin:20px 0}

/* 필드 행 */
.field{
  display:flex;
  align-items:flex-start;
  padding:10px 0;
  font-size:14px;
  color:#111;
}
.field-label{
  width:80px;min-width:80px;
  font-weight:600;color:#444;
  flex-shrink:0;
}
.field-sep{
  color:#bbb;margin:0 12px;flex-shrink:0;
}
.field-value{
  flex:1;display:flex;flex-direction:column;gap:4px;
}
.packing-val{font-weight:700;font-size:15px;}
.packing-sub{
  display:flex;align-items:center;gap:16px;
  font-size:13px;color:#444;margin-top:2px;
}
.packing-sub-name{font-size:12px;color:#666;font-weight:400;}
.packing-sub strong{font-weight:800;color:#111;font-size:14px;}
.sub-sep{color:#ccc;}
.field-total .field-label{color:#1D4ED8;}
.field-total .packing-sub strong{color:#1D4ED8;}

/* 회사 섹션 */
.company-title{
  font-size:15px;font-weight:800;color:#111;
  margin-bottom:8px;
}

@media print{
  .no-print{display:none}
  body{padding:24px 32px}
  @page{size:A4;margin:16mm}
}
</style></head>
<body>

<div class="no-print">
  <button class="btn-print" onclick="window.print()">🖨 인쇄 / PDF</button>
  <button class="btn-close" onclick="window.close()">닫기</button>
</div>

<h1>입 고 명 세 서</h1>
<hr class="title-line"/>

<div class="field">
  <span class="field-label">고객사명</span>
  <span class="field-sep">│</span>
  <span class="field-value">${data.customer || "미입력"}</span>
</div>

${useItems ? itemsSection() : `
<div class="field">
  <span class="field-label">제품명</span>
  <span class="field-sep">│</span>
  <span class="field-value">${data.productName || "미입력"}</span>
</div>
${packingSection(data.packing, singleCalc)}
`}

<div class="field">
  <span class="field-label">배송지</span>
  <span class="field-sep">│</span>
  <span class="field-value">${addressText}</span>
</div>

<div class="field">
  <span class="field-label">도착예정일</span>
  <span class="field-sep">│</span>
  <span class="field-value">${formatDate(data.deliveryDate)}</span>
</div>

<hr class="divider-line"/>

<div class="company-title">씨앤씨무역 (C&amp;C TRADING)</div>

<div class="field">
  <span class="field-label">대표</span>
  <span class="field-sep">│</span>
  <span class="field-value">최계화 &nbsp;│&nbsp; 010-2276-0123</span>
</div>
<div class="field">
  <span class="field-label">주소</span>
  <span class="field-sep">│</span>
  <span class="field-value">경기도 화성시 동탄첨단산업1로 27 금강펜테리움 IX타워 B동 2053호</span>
</div>
<div class="field">
  <span class="field-label">홈페이지</span>
  <span class="field-sep">│</span>
  <span class="field-value">www.cc009.co.kr</span>
</div>

</body></html>`;
}

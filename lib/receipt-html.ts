export interface ReceiptData {
  customer: string;
  productName: string;
  packing: string;
  deliveryAddress: string;
  deliveryDate: string;
  packingImageBase64?: string;
}

function calcPacking(packing: string): { totalQty: number; totalBoxes: number } {
  const clean = packing.replace(/\s/g, "");
  const m = clean.match(/^(\d+)[×xX*](\d+)(?:\+(\d+))?/);
  if (!m) return { totalQty: 0, totalBoxes: 0 };
  const N = parseInt(m[1]), M = parseInt(m[2]), K = m[3] ? parseInt(m[3]) : 0;
  return { totalQty: N * M + K, totalBoxes: K > 0 ? N + 1 : N };
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
  const { totalQty, totalBoxes } = calcPacking(data.packing);

  const addressHtml = (data.deliveryAddress || "미입력")
    .split(/\n/)
    .map(line => `<div>${line}</div>`)
    .join("");

  const packingCalcHtml = totalQty > 0 ? `
    <div class="packing-calc">
      <span class="calc-item">📦 총수량 : <strong>${comma(totalQty)}개</strong></span>
      <span class="divider">│</span>
      <span class="calc-item">📦 총박스수 : <strong>${totalBoxes}박스</strong></span>
    </div>` : "";

  const imageSection = data.packingImageBase64 ? `
    <div class="img-wrap">
      <div class="img-label">📷 포장 사진</div>
      <img src="${data.packingImageBase64}" alt="포장 사진"/>
    </div>` : "";

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
  padding:48px 40px;max-width:680px;margin:0 auto;
  font-size:14px;
}
.no-print{position:fixed;top:12px;right:12px;display:flex;gap:8px;z-index:999}
.no-print button{padding:8px 18px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;border:none}
.btn-print{background:#111;color:#fff}
.btn-close{background:#eee;color:#333}

/* 제목 */
h1{
  text-align:center;
  font-size:30px;font-weight:900;
  letter-spacing:10px;
  margin-bottom:18px;
  color:#111;
}
.title-line{border:none;border-top:2px solid #222;margin-bottom:24px}

/* 메인 테이블 */
.info-table{
  width:100%;border-collapse:collapse;
  border:1px solid #ddd;border-radius:8px;
  overflow:hidden;margin-bottom:24px;
}
.info-table tr{border-bottom:1px solid #ddd}
.info-table tr:last-child{border-bottom:none}
.info-table td{padding:0;vertical-align:middle}
.label{
  width:110px;min-width:110px;
  padding:16px 14px;
  background:#f7f7f7;
  font-weight:700;font-size:14px;
  text-align:center;color:#333;
  border-right:1px solid #ddd;
}
.value{
  padding:16px 20px;
  font-size:14px;color:#111;line-height:1.6;
}

/* 패킹 계산 */
.packing-text{font-size:15px;font-weight:700;margin-bottom:10px}
.packing-divider{
  border:none;border-top:1px dashed #bbb;
  margin:10px 0;
}
.packing-calc{
  display:flex;align-items:center;gap:16px;
  font-size:14px;color:#333;
  flex-wrap:wrap;
}
.calc-item{display:flex;align-items:center;gap:6px}
.calc-item strong{font-weight:700;color:#111}
.divider{color:#bbb;font-weight:300}

/* 회사 정보 */
.company-box{
  width:100%;border-collapse:collapse;
  border:1px solid #ddd;border-radius:8px;
  overflow:hidden;margin-bottom:24px;
}
.company-title{
  text-align:center;padding:14px;
  font-weight:800;font-size:15px;
  background:#f7f7f7;
  border-bottom:1px solid #ddd;
}
.company-box tr{border-bottom:1px solid #ddd}
.company-box tr:last-child{border-bottom:none}

/* 포장사진 */
.img-wrap{margin-top:20px}
.img-label{font-size:13px;font-weight:700;color:#555;margin-bottom:10px}
.img-wrap img{max-width:100%;border-radius:8px;border:1px solid #ddd}

@media print{
  .no-print{display:none}
  body{padding:20px 24px}
  @page{size:A4;margin:12mm}
}
</style></head>
<body>

<div class="no-print">
  <button class="btn-print" onclick="window.print()">🖨 인쇄 / PDF</button>
  <button class="btn-close" onclick="window.close()">닫기</button>
</div>

<h1>입 고 명 세 서</h1>
<hr class="title-line"/>

<table class="info-table">
  <tr>
    <td class="label">고객사명</td>
    <td class="value">${data.customer || "미입력"}</td>
  </tr>
  <tr>
    <td class="label">제품명</td>
    <td class="value">${data.productName || "미입력"}</td>
  </tr>
  <tr>
    <td class="label">패킹</td>
    <td class="value">
      <div class="packing-text">${data.packing || "미입력"}</div>
      ${totalQty > 0 ? `<hr class="packing-divider"/>${packingCalcHtml}` : ""}
    </td>
  </tr>
  <tr>
    <td class="label">배송지</td>
    <td class="value">${addressHtml}</td>
  </tr>
  <tr>
    <td class="label">도착예정일</td>
    <td class="value"><strong>${formatDate(data.deliveryDate)}</strong></td>
  </tr>
</table>

<table class="company-box">
  <tr>
    <td colspan="2" class="company-title">씨앤씨무역 (C&C TRADING)</td>
  </tr>
  <tr>
    <td class="label">대표</td>
    <td class="value">최계화 &nbsp;│&nbsp; 010-2276-0123</td>
  </tr>
  <tr>
    <td class="label">주소</td>
    <td class="value">
      <div>경기도 화성시 동탄첨단산업1로 27</div>
      <div>금강펜테리움 IX타워 B동 2053호</div>
    </td>
  </tr>
  <tr>
    <td class="label">홈페이지</td>
    <td class="value">www.cc009.co.kr</td>
  </tr>
</table>

${imageSection}

</body></html>`;
}

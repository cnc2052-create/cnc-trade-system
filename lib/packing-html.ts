import { CustomerQuote, MarkingEntry } from "@/types";

export function buildPackingListHTML(
  quote: CustomerQuote,
  markings: MarkingEntry[],
  imageBase64?: string   // "data:image/...;base64,..."
): string {
  const today = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
  const fmt = (n: number) => n.toFixed(3);

  const totalQty = markings.reduce((s, m) => s + m.quantity, 0);
  const totalUsd = markings.reduce((s, m) => s + m.quantity * (m.unitPrice || 0.1), 0);

  const rows = markings.map((m, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${m.markingName || m.productName}</td>
      <td class="r">${m.quantity.toLocaleString()}</td>
      <td class="r">${m.unit || "EA"}</td>
      <td class="r">USD ${fmt(m.unitPrice || 0.1)}</td>
      <td class="r">USD ${fmt(m.quantity * (m.unitPrice || 0.1))}</td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html lang="ko"><head>
<meta charset="UTF-8">
<title>Packing List</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:"Malgun Gothic","Apple SD Gothic Neo",Arial,sans-serif;padding:48px 56px;max-width:860px;margin:0 auto;font-size:13px;color:#000}
.no-print{position:fixed;top:16px;right:16px;display:flex;gap:8px}
.no-print button{padding:8px 20px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;border:none}
.btn-print{background:#111;color:#fff}
.btn-close{background:#eee;color:#333}
h1{font-size:26px;font-weight:700;margin-bottom:4px}
.sub{font-size:13px;color:#444;margin-bottom:28px}
table{width:100%;border-collapse:collapse}
th{font-weight:700;padding:9px 10px;border-bottom:2px solid #333;text-align:left;font-size:13px}
td{padding:9px 10px;border-bottom:1px solid #ddd;font-size:13px}
.r{text-align:right}
.total-row td{font-weight:700;border-top:2px solid #333;border-bottom:none;background:#f9f9f9}
.pkg-img{margin-top:32px}
.pkg-img h3{font-size:14px;font-weight:700;margin-bottom:12px;padding-bottom:6px;border-bottom:1px solid #ccc}
.pkg-img img{max-width:100%;border-radius:6px;border:1px solid #ddd}
@media print{.no-print{display:none}body{padding:16px 24px}@page{size:A4;margin:12mm}}
</style></head>
<body>
<div class="no-print">
  <button class="btn-print" onclick="window.print()">🖨 인쇄 / PDF 저장</button>
  <button class="btn-close" onclick="window.close()">닫기</button>
</div>

<h1>Packing List</h1>
<div class="sub">
  Date: ${today} &nbsp;|&nbsp; Customer: ${quote.customer} &nbsp;|&nbsp; Order No: ${quote.quoteNo}
</div>

<table>
  <thead>
    <tr>
      <th style="width:5%">No.</th>
      <th style="width:35%">Description</th>
      <th class="r" style="width:15%">Q'TY</th>
      <th class="r" style="width:10%">Unit</th>
      <th class="r" style="width:17%">Unit Price</th>
      <th class="r" style="width:18%">Amount</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
    <tr class="total-row">
      <td colspan="2">TOTAL</td>
      <td class="r">${totalQty.toLocaleString()}</td>
      <td></td>
      <td></td>
      <td class="r">USD ${fmt(totalUsd)}</td>
    </tr>
  </tbody>
</table>

${imageBase64 ? `
<div class="pkg-img">
  <h3>📦 포장 사진</h3>
  <img src="${imageBase64}" alt="포장 사진"/>
</div>` : ""}

</body></html>`;
}

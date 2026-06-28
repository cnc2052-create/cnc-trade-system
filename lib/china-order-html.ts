import { CustomerQuote, MarkingEntry } from "@/types";

function fmt2(n: number) { return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
function fmtQty(n: number) { return n.toLocaleString("zh-CN"); }

function formatDeliveryDate(d: string): string {
  if (!d) return "-";
  // 이미 YYYY-MM-DD 형식이면 중국어 날짜로 변환
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[1]}年${parseInt(m[2])}月${parseInt(m[3])}日`;
  // 숫자 날짜 패턴 (예: 8月20日 → 2026年8月20日)
  const m2 = d.match(/(\d+)[月\/](\d+)/);
  if (m2) return `2026年${parseInt(m2[1])}月${parseInt(m2[2])}日`;
  return d;
}

export function generateChinaOrderHTML(
  quote: CustomerQuote,
  markings: MarkingEntry[]
): string {
  const today = new Date().toISOString().slice(0, 10);

  // 제품 행 생성
  const productRows = markings.map(m => {
    const total = m.unitPrice * m.quantity;
    return `
    <tr>
      <td class="td-left">${m.markingName || m.productName}</td>
      <td class="td-left">${m.postProcess || "-"}</td>
      <td class="td-right">¥${fmt2(m.unitPrice)}</td>
      <td class="td-right">${fmtQty(m.quantity)}</td>
    </tr>`;
  }).join("");

  // 합계 계산
  const grandTotal = markings.reduce((s, m) => s + m.unitPrice * m.quantity, 0);
  const deposit = grandTotal * 0.3;
  const balance = grandTotal * 0.7;

  // 납기일 — 마킹 중 첫 번째 유효한 납기
  const deliveryDate = markings.find(m => m.deliveryDate)?.deliveryDate || quote.deliveryDate || "";
  const deliveryStr = formatDeliveryDate(deliveryDate);

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>C&C 订货单 - ${quote.quoteNo}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: "Microsoft YaHei", "PingFang SC", "Helvetica Neue", Arial, sans-serif;
    background: #fff;
    color: #000;
    padding: 48px 56px;
    max-width: 794px;
    margin: 0 auto;
    font-size: 13px;
    line-height: 1.6;
  }

  /* 제목 */
  .title {
    font-size: 24px;
    font-weight: 700;
    letter-spacing: 0.02em;
    margin-bottom: 4px;
  }
  .date {
    font-size: 13px;
    color: #333;
    margin-bottom: 40px;
  }

  /* 테이블 공통 */
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 0;
  }
  th {
    font-weight: 700;
    font-size: 13px;
    padding: 9px 8px;
    border-bottom: 1.5px solid #888;
    text-align: left;
  }
  th.th-right { text-align: right; }
  td { padding: 9px 8px; border-bottom: 1px solid #ddd; }
  .td-left { text-align: left; }
  .td-right { text-align: right; }

  /* 금액 테이블 */
  .amount-table { margin-top: 28px; }
  .amount-table td { padding: 8px 8px; border-bottom: 1px solid #eee; }
  .amount-table .amt-label { font-weight: 500; }
  .amount-table .amt-value { text-align: right; font-weight: 600; }

  /* 하단 2단 */
  .bottom {
    display: flex;
    gap: 48px;
    margin-top: 56px;
  }
  .bottom-col { flex: 1; }
  .bottom-title {
    font-size: 13px;
    font-weight: 700;
    margin-bottom: 10px;
    padding-bottom: 6px;
    border-bottom: 1px solid #ccc;
  }
  .bottom-col p {
    font-size: 12px;
    color: #333;
    line-height: 1.9;
  }

  @media print {
    body { padding: 20px 28px; }
    @page { size: A4; margin: 12mm; }
  }
</style>
</head>
<body>

<div class="title">C&amp;C 订货单</div>
<div class="date">日期：${today}</div>

<!-- 제품 테이블 -->
<table>
  <thead>
    <tr>
      <th style="width:32%">产品名称</th>
      <th style="width:32%">工艺</th>
      <th class="th-right" style="width:18%">单价（¥）</th>
      <th class="th-right" style="width:18%">数量（个）</th>
    </tr>
  </thead>
  <tbody>
    ${productRows}
  </tbody>
</table>

<!-- 금액 테이블 -->
<table class="amount-table" style="max-width:320px;margin-left:auto;margin-top:28px;">
  <tr>
    <td class="amt-label">总金额</td>
    <td class="amt-value">¥${fmt2(grandTotal)}</td>
  </tr>
  <tr>
    <td class="amt-label">定金（30%）</td>
    <td class="amt-value">¥${fmt2(deposit)}</td>
  </tr>
  <tr>
    <td class="amt-label">尾款（70%）</td>
    <td class="amt-value">¥${fmt2(balance)}</td>
  </tr>
  <tr>
    <td class="amt-label">出货日期</td>
    <td class="amt-value">${deliveryStr}</td>
  </tr>
</table>

<!-- 하단 2단 -->
<div class="bottom">
  <div class="bottom-col">
    <div class="bottom-title">📦 发货要求</div>
    <p>请确认样品一致后生产。</p>
    <p>请保证产品无划痕、无污点。</p>
    <p>包装完成后请发送包装图片以及装箱单。</p>
    <p>请按交期安排生产，谢谢！</p>
  </div>
  <div class="bottom-col">
    <div class="bottom-title">联系方式</div>
    <p>C&amp;C 贸易（客户编号：KR5090）</p>
    <p>崔桂华</p>
    <p>010-2276-0123</p>
  </div>
</div>

</body>
</html>`;
}

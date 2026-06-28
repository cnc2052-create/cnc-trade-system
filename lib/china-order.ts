import { CustomerQuote } from "@/types";

export interface ChinaOrderItem {
  productNameCn: string;
  postProcessCn: string;
  unitPrice: number;
  quantity: number;
  unit: string;
  deliveryDate: string;
}

export interface ChinaOrderState {
  items: ChinaOrderItem[];
  factory: string;
  notes: string;
}

export function buildChinaOrderHTML(quote: CustomerQuote, co: ChinaOrderState): string {
  const today = new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" });
  const fmt = (n: number) => n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const fmtDate = (d: string) => {
    const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? `${m[1]}年${+m[2]}月${+m[3]}日` : d || "-";
  };

  const grandTotal = co.items.reduce((s, it) => s + it.unitPrice * it.quantity, 0);
  const deposit = grandTotal * 0.3;
  const balance = grandTotal * 0.7;
  const deliveryStr = fmtDate(co.items.find(it => it.deliveryDate)?.deliveryDate || quote.deliveryDate || "");

  const rows = co.items.map(it => `
    <tr>
      <td>${it.productNameCn || "-"}</td>
      <td>${it.postProcessCn || "-"}</td>
      <td class="r">¥${fmt(it.unitPrice)}</td>
      <td class="r">${it.quantity.toLocaleString()}</td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html lang="zh-CN"><head>
<meta charset="UTF-8">
<title>C&C 订货单</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:"Microsoft YaHei","PingFang SC",Arial,sans-serif;padding:48px 56px;max-width:800px;margin:0 auto;font-size:13px;color:#000}
.no-print{position:fixed;top:16px;right:16px;display:flex;gap:8px}
.no-print button{padding:8px 20px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;border:none}
.btn-print{background:#111;color:#fff}
.btn-close{background:#eee;color:#333}
h1{font-size:26px;font-weight:700;margin-bottom:4px}
.sub{font-size:13px;color:#444;margin-bottom:36px}
table{width:100%;border-collapse:collapse}
th{font-weight:700;padding:9px 8px;border-bottom:2px solid #555;text-align:left;font-size:13px}
td{padding:9px 8px;border-bottom:1px solid #ddd;font-size:13px}
.r{text-align:right}
.amt{max-width:300px;margin-left:auto;margin-top:24px}
.amt td{padding:7px 8px;border-bottom:1px solid #eee}
.amt .v{text-align:right;font-weight:600}
.notes{margin-top:28px;padding:14px;background:#f9f9f9;border:1px solid #eee;border-radius:6px;font-size:12px;color:#444}
.bottom{display:flex;gap:48px;margin-top:52px}
.bottom-col{flex:1}
.bt{font-weight:700;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #ccc;font-size:13px}
.bottom-col p{font-size:12px;color:#333;line-height:1.9}
@media print{.no-print{display:none}body{padding:16px 24px}@page{size:A4;margin:12mm}}
</style></head>
<body>
<div class="no-print">
  <button class="btn-print" onclick="window.print()">🖨 인쇄 / PDF 저장</button>
  <button class="btn-close" onclick="window.close()">닫기</button>
</div>

<h1>C&amp;C 订货单</h1>
<div class="sub">日期：${today}${co.factory ? `　　供货商：${co.factory}` : ""}</div>

<table>
  <thead><tr>
    <th style="width:32%">产品名称</th>
    <th style="width:32%">工艺</th>
    <th class="r" style="width:18%">单价（¥）</th>
    <th class="r" style="width:18%">数量（个）</th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>

<table class="amt">
  <tr><td>总金额</td><td class="v">¥${fmt(grandTotal)}</td></tr>
  <tr><td>定金（30%）</td><td class="v">¥${fmt(deposit)}</td></tr>
  <tr><td>尾款（70%）</td><td class="v">¥${fmt(balance)}</td></tr>
  <tr><td>出货日期</td><td class="v">${deliveryStr}</td></tr>
</table>

${co.notes ? `<div class="notes"><strong>特别要求：</strong> ${co.notes}</div>` : ""}

<div class="bottom">
  <div class="bottom-col">
    <div class="bt">📦 发货要求</div>
    <p>请确认样品一致后生产。</p>
    <p>请保证产品无划痕、无污点。</p>
    <p>包装完成后请发送包装图片以及装箱单。</p>
    <p>请按交期安排生产，谢谢！</p>
  </div>
  <div class="bottom-col">
    <div class="bt">联系方式</div>
    <p>C&amp;C 贸易（客户编号：KR5090）</p>
    <p>崔桂华</p>
    <p>010-2276-0123</p>
  </div>
</div>

</body></html>`;
}

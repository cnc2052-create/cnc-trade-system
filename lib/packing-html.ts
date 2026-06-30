export interface PlItem {
  productNameEn: string;
  productNameKo: string;
  quantity: number;
  unit: string;
  boxCount: number;
  unitPriceUsd?: number;
  packingBreakdown?: string;
  material?: string;
}

export function buildPackingListHTML(
  customer: string,
  customerCode: string,
  items: PlItem[],
): string {
  const totalQty    = items.reduce((s, it) => s + it.quantity, 0);
  const totalCartons = items.reduce((s, it) => s + (it.boxCount || 0), 0);
  const totalUsd    = items.reduce((s, it) => s + (it.unitPriceUsd || 0) * it.quantity, 0);

  const rows = items.map(it => {
    const amt = (it.unitPriceUsd || 0) * it.quantity;
    return `
    <tr>
      <td>${it.productNameEn || it.productNameKo}</td>
      <td>${it.material || "N/A"}</td>
      <td>${it.packingBreakdown || (() => {
        if (!it.boxCount || it.boxCount === 0) return "-";
        const perBox = Math.floor(it.quantity / it.boxCount);
        const rem = it.quantity - perBox * it.boxCount;
        return rem > 0
          ? `${perBox.toLocaleString()} × ${it.boxCount} + ${rem.toLocaleString()}`
          : `${perBox.toLocaleString()} × ${it.boxCount}`;
      })()}</td>
      <td class="r">${it.quantity.toLocaleString()}</td>
      <td class="r">${it.boxCount || "-"}</td>
      <td class="r">${it.unitPriceUsd ? it.unitPriceUsd.toFixed(3) : "-"}</td>
      <td class="r">${it.unitPriceUsd ? amt.toFixed(2) : "-"}</td>
    </tr>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8">
<title>Packing Details</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Arial,"Malgun Gothic","Apple SD Gothic Neo",sans-serif;padding:48px 56px;max-width:900px;margin:0 auto;font-size:13px;color:#111}
  .no-print{position:fixed;top:16px;right:16px;display:flex;gap:8px;z-index:999}
  .no-print button{padding:8px 20px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;border:none}
  .btn-print{background:#111;color:#fff}
  .btn-close{background:#eee;color:#333}
  .header-info{margin-bottom:28px}
  .header-info p{font-size:13px;color:#444;line-height:1.8}
  .header-info .company{font-size:15px;font-weight:600;color:#111;margin-top:2px}
  h1{font-size:22px;font-weight:700;margin-bottom:20px;border-bottom:2px solid #111;padding-bottom:8px}
  table{width:100%;border-collapse:collapse;margin-bottom:32px}
  thead tr{border-bottom:1.5px solid #111}
  th{font-weight:700;padding:10px 8px;text-align:left;font-size:12px;color:#333}
  td{padding:10px 8px;border-bottom:1px solid #e0e0e0;font-size:13px;color:#111}
  .r{text-align:right}
  .summary{margin-top:4px}
  .summary h2{font-size:15px;font-weight:700;margin-bottom:10px}
  .summary ul{list-style:disc;padding-left:20px;line-height:2}
  .summary li{font-size:13px;color:#111}
  .summary li strong{font-weight:700}
  @media print{.no-print{display:none}body{padding:16px 24px}@page{size:A4;margin:12mm}}
</style></head>
<body>
<div class="no-print">
  <button class="btn-print" onclick="window.print()">🖨 Print / Save PDF</button>
  <button class="btn-close" onclick="window.close()">Close</button>
</div>

<div class="header-info">
  <p>Customer Code: <strong>${customerCode || "—"}</strong></p>
  <p class="company">C&amp;C Trading Co., Ltd. (씨앤씨무역)</p>
</div>

<h1>Packing Details</h1>

<table>
  <thead>
    <tr>
      <th style="width:18%">Item</th>
      <th style="width:10%">Material</th>
      <th style="width:18%">Packing Breakdown</th>
      <th class="r" style="width:14%">Quantity (pcs)</th>
      <th class="r" style="width:12%">Cartons (CTNS)</th>
      <th class="r" style="width:14%">Unit Price (USD)</th>
      <th class="r" style="width:14%">Amount (USD)</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
  </tbody>
</table>

<div class="summary">
  <h2>Total Summary</h2>
  <ul>
    <li>Total Quantity: <strong>${totalQty.toLocaleString()} pcs</strong></li>
    <li>Total Cartons: <strong>${totalCartons} CTNS</strong></li>
    ${totalUsd > 0 ? `<li>Total Amount: <strong>USD ${totalUsd.toFixed(2)}</strong></li>` : ""}
  </ul>
</div>

</body></html>`;
}

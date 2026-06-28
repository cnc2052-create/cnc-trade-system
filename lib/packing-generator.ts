import * as XLSX from "xlsx";

export interface FactoryItem {
  itemNameCn: string;        // 중국어 원문
  itemNameEn: string;        // 영문 번역 (AI 추출)
  material: string;          // 재질 (PET/PP/ABS/PE 등)
  packingBreakdown: string;  // 예: 1914 × 5 + 470
  quantity: number;
  cartons: number;
  unitPriceKrw?: number;     // 사용자 입력 단가 (÷7 계산용)
}

export interface FactoryShipment {
  shipDate: string;
  factory?: string;
  items: FactoryItem[];
}

// 재질 → 영문 품목명 매핑
const MATERIAL_MAP: Record<string, string> = {
  "PET": "Bottle",
  "PP":  "Pump",
  "ABS": "Outer Cap",
  "PE":  "Cosmetic Tube",
  "HDPE": "Bottle",
  "LDPE": "Cosmetic Tube",
  "PS":  "Cap",
  "SAN": "Cap",
};

export function translateItem(nameCn: string, material: string): string {
  const mat = material.toUpperCase().trim();
  if (MATERIAL_MAP[mat]) return MATERIAL_MAP[mat];
  // 키워드 기반 번역
  if (nameCn.includes("瓶") || nameCn.includes("bottle")) return "Bottle";
  if (nameCn.includes("泵") || nameCn.includes("pump"))  return "Pump";
  if (nameCn.includes("盖") || nameCn.includes("cap"))   return "Cap";
  if (nameCn.includes("管") || nameCn.includes("tube"))  return "Cosmetic Tube";
  if (nameCn.includes("罐") || nameCn.includes("jar"))   return "Cosmetic Jar";
  if (nameCn.includes("滴")) return "Dropper";
  if (nameCn.includes("喷")) return "Sprayer";
  return nameCn; // fallback
}

// 단가 계산: 사용자 입력 ÷ 7, 소수 3자리
export function calcUnitPrice(krwInput?: number): number {
  if (!krwInput || krwInput === 0) return 0.1;
  return Math.round((krwInput / 7) * 1000) / 1000;
}

// 박스 수 계산 (나머지 있으면 +1)
export function calcCartons(breakdown: string): number {
  // 예: "1914 × 5 + 470" 또는 "808×25+60"
  const m = breakdown.match(/(\d+)\s*[×xX]\s*(\d+)\s*\+\s*(\d+)/);
  if (m) {
    const full = parseInt(m[2]);
    const rem  = parseInt(m[3]);
    return full + (rem > 0 ? 1 : 0);
  }
  // 단순 숫자만 있는 경우
  const simple = breakdown.match(/^(\d+)$/);
  if (simple) return 1;
  return 1;
}

// 수량 계산
export function calcQuantity(breakdown: string): number {
  const m = breakdown.match(/(\d+)\s*[×xX]\s*(\d+)\s*\+\s*(\d+)/);
  if (m) return parseInt(m[1]) * parseInt(m[2]) + parseInt(m[3]);
  const simple = breakdown.match(/^(\d[\d,]*)$/);
  if (simple) return parseInt(simple[1].replace(/,/g, ""));
  return 0;
}

function fmtNum(n: number, dec = 0): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

export function generatePackingListExcel(shipment: FactoryShipment): Buffer {
  const wb = XLSX.utils.book_new();

  const rows: (string | number)[][] = [];

  // 헤더
  rows.push(["Customer Code: KR5090"]);
  rows.push(["C&C Trading Co., Ltd. (씨앤씨무역)"]);
  rows.push([]);
  rows.push(["Packing Details"]);
  rows.push([]);
  rows.push([
    "Item", "Material", "Packing Breakdown",
    "Quantity (pcs)", "Cartons (CTNS)", "Unit Price (USD)", "Amount (USD)"
  ]);

  let totalQty = 0, totalCtns = 0, totalAmt = 0;

  shipment.items.forEach(item => {
    const unitPrice = calcUnitPrice(item.unitPriceKrw);
    const qty   = item.quantity   || calcQuantity(item.packingBreakdown);
    const ctns  = item.cartons    || calcCartons(item.packingBreakdown);
    const amt   = Math.round(unitPrice * qty * 100) / 100;

    totalQty  += qty;
    totalCtns += ctns;
    totalAmt  += amt;

    const itemName = translateItem(item.itemNameCn, item.material);

    rows.push([
      itemName,
      item.material,
      item.packingBreakdown,
      fmtNum(qty),
      ctns,
      unitPrice.toFixed(3),
      fmtNum(amt, 2),
    ]);
  });

  rows.push([]);
  rows.push(["Total Summary"]);
  rows.push(["Total Quantity:", `${fmtNum(totalQty)} pcs`]);
  rows.push(["Total Cartons:", `${fmtNum(totalCtns)} CTNS`]);
  rows.push(["Total Amount:", `USD ${fmtNum(totalAmt, 2)}`]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [
    { wch: 20 }, { wch: 12 }, { wch: 22 },
    { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 16 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Packing Details");

  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

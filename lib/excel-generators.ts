import * as XLSX from "xlsx";
import { CustomerQuote, MarkingEntry } from "@/types";

function styleSheet(ws: XLSX.WorkSheet) {
  return ws;
}

// ① 중국발주서 (Excel)
export function generateChinaOrderExcel(
  quote: CustomerQuote,
  markings: MarkingEntry[]
): Buffer {
  const wb = XLSX.utils.book_new();

  const rows: (string | number)[][] = [
    ["씨앤씨무역 중국 발주서"],
    [],
    ["발주번호", quote.quoteNo, "", "발주일", quote.quoteDate],
    ["고객사", quote.customer, "", "통화", quote.currency],
    [],
    ["No", "제품명 (마킹)", "후가공", "수량", "단위", "단가", "금액", "납기"],
  ];

  markings.forEach((m, i) => {
    rows.push([
      i + 1,
      m.markingName || m.productName,
      m.postProcess || "-",
      m.quantity,
      m.unit,
      m.unitPrice,
      m.amount,
      m.deliveryDate || quote.deliveryDate || "-",
    ]);
  });

  rows.push([]);
  rows.push([
    "", "합  계", "", markings.reduce((s, m) => s + m.quantity, 0),
    "", "", markings.reduce((s, m) => s + m.amount, 0), "",
  ]);

  if (quote.remarks) {
    rows.push([], ["비고", quote.remarks]);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [
    { wch: 5 }, { wch: 30 }, { wch: 20 }, { wch: 10 },
    { wch: 8 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
  ];
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }];
  XLSX.utils.book_append_sheet(wb, ws, "중국발주서");

  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

// ② 패킹리스트 (Excel) — 마킹별 부품 단가 포함
export function generatePackingListExcel(
  quote: CustomerQuote,
  markings: MarkingEntry[]
): Buffer {
  const wb = XLSX.utils.book_new();

  const rows: (string | number)[][] = [
    ["패킹리스트 / PACKING LIST"],
    ["씨앤씨무역 (CNC Trading Co., Ltd.)"],
    [],
    ["발주번호", quote.quoteNo, "", "날짜", quote.quoteDate],
    ["고객사", quote.customer],
    [],
    ["No", "제품명 (마킹)", "후가공", "수량", "단위", "부품단가", "금액", "납기"],
  ];

  markings.forEach((m, i) => {
    rows.push([
      i + 1,
      m.markingName || m.productName,
      m.postProcess || "-",
      m.quantity,
      m.unit,
      m.partUnitPrice ?? "-",
      m.partAmount ?? "-",
      m.deliveryDate || quote.deliveryDate || "-",
    ]);
  });

  rows.push([]);
  const totalQty = markings.reduce((s, m) => s + m.quantity, 0);
  const totalAmt = markings.reduce((s, m) => s + (m.partAmount || 0), 0);
  rows.push(["", "합  계", "", totalQty, "", "", totalAmt || "-", ""]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [
    { wch: 5 }, { wch: 30 }, { wch: 20 }, { wch: 10 },
    { wch: 8 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
  ];
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },
  ];
  XLSX.utils.book_append_sheet(wb, ws, "패킹리스트");

  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

// ③ 입고명세서 (Excel) — 마킹별 수량 기준
export function generateReceiptExcel(
  quote: CustomerQuote,
  markings: MarkingEntry[]
): Buffer {
  const wb = XLSX.utils.book_new();

  const rows: (string | number)[][] = [
    ["입고명세서"],
    ["씨앤씨무역 (CNC Trading Co., Ltd.)"],
    [],
    ["발주번호", quote.quoteNo, "", "날짜", quote.quoteDate],
    ["고객사", quote.customer, "", "납기", quote.deliveryDate || "-"],
    [],
    ["No", "제품명 (마킹)", "후가공", "수량", "단위", "단가", "금액", "비고"],
  ];

  markings.forEach((m, i) => {
    rows.push([
      i + 1,
      m.markingName || m.productName,
      m.postProcess || "-",
      m.quantity,
      m.unit,
      m.unitPrice,
      m.amount,
      "",
    ]);
  });

  rows.push([]);
  rows.push([
    "", "합  계", "",
    markings.reduce((s, m) => s + m.quantity, 0),
    "", "",
    markings.reduce((s, m) => s + m.amount, 0),
    "",
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [
    { wch: 5 }, { wch: 30 }, { wch: 20 }, { wch: 10 },
    { wch: 8 }, { wch: 14 }, { wch: 14 }, { wch: 16 },
  ];
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },
  ];
  XLSX.utils.book_append_sheet(wb, ws, "입고명세서");

  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

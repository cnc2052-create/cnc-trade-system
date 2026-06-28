import * as XLSX from "xlsx";
import { MarkingEntry, CustomerQuote } from "@/types";

export function generateMarkingExcel(
  quote: CustomerQuote,
  markings: MarkingEntry[]
): Buffer {
  const wb = XLSX.utils.book_new();

  markings.forEach((m, idx) => {
    const label = m.markingName || m.productName;

    const ws: XLSX.WorkSheet = {};

    // A1: C&C
    ws["A1"] = { v: "C&C", t: "s" };
    // A2: ITEM
    ws["A2"] = { v: `   ITEM:${label}`, t: "s" };
    // A3: Q`TY — 공장이 수정할 값, 수량을 힌트로만 표기
    ws["A3"] = { v: `    Q\`TY:              pcs    `, t: "s" };
    // A4: C/NO — 공장이 수정
    ws["A4"] = { v: `    C/NO:`, t: "s" };
    // A5: 고객사
    ws["A5"] = { v: quote.customer, t: "s" };
    // A6: MADE IN CHINA
    ws["A6"] = { v: "MADE  IN  CHINA", t: "s" };

    ws["!ref"] = "A1:A6";

    // 원본과 동일한 열 너비 / 행 높이
    ws["!cols"] = [{ wpx: 1073, wch: 133.5 }];
    ws["!rows"] = [
      { hpt: 76.5, hpx: 76.5 }, // A1
      { hpt: 76.5, hpx: 76.5 }, // A2
      { hpt: 76.5, hpx: 76.5 }, // A3
      { hpt: 76.5, hpx: 76.5 }, // A4
      { hpt: 93,   hpx: 93   }, // A5
      { hpt: 76.5, hpx: 76.5 }, // A6
    ];

    // 시트명: 품목번호_마킹명 (31자 이내)
    const sheetName = `${idx + 1}_${label}`.slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

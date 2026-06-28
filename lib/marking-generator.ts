import ExcelJS from "exceljs";
import { MarkingEntry, CustomerQuote } from "@/types";

export async function generateMarkingExcel(
  quote: CustomerQuote,
  markings: MarkingEntry[]
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();

  for (let idx = 0; idx < markings.length; idx++) {
    const m = markings[idx];
    const label = m.markingName || m.productName;
    const sheetName = `${idx + 1}_${label}`.replace(/[\\\/\?\*\[\]:]/g, "").slice(0, 31);

    const ws = wb.addWorksheet(sheetName);

    // 열 너비 설정 (A열만 사용, 매우 넓게)
    ws.getColumn(1).width = 50;

    // 행 높이 & 내용
    const rows = [
      { text: "C&C", height: 57.75 },
      { text: `   ITEM:${label}`, height: 57.75 },
      { text: "    Q`TY:              pcs    ", height: 57.75 },
      { text: "    C/NO:", height: 57.75 },
      { text: quote.customer, height: 70 },
      { text: "MADE  IN  CHINA", height: 57.75 },
    ];

    rows.forEach((r, i) => {
      const row = ws.getRow(i + 1);
      row.height = r.height;
      const cell = row.getCell(1);
      cell.value = r.text;
      cell.font = { name: "Arial", size: 28, bold: i === 0 || i === rows.length - 1 };
      cell.alignment = { vertical: "middle", horizontal: "left" };
    });
  }

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

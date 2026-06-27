import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { OrderInfo, FactoryShipmentInfo, PackingListItem } from "@/types";

// Korean font support - using a basic approach with built-in fonts
// For proper Korean support, we'll use a Unicode approach

function addHeader(doc: jsPDF, title: string, subtitle?: string) {
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(title, doc.internal.pageSize.width / 2, 20, { align: "center" });
  if (subtitle) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(subtitle, doc.internal.pageSize.width / 2, 28, { align: "center" });
  }
  doc.setLineWidth(0.5);
  doc.line(14, 33, doc.internal.pageSize.width - 14, 33);
}

function addCompanyInfo(doc: jsPDF, yStart: number) {
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("CNC Trading Co., Ltd. (C&C Trade)", 14, yStart);
  doc.text("Tel: 010-XXXX-XXXX | Email: cnc2052@gmail.com", 14, yStart + 5);
  return yStart + 12;
}

// 중국발주서 마킹 (China PO Marking)
export function generateMarkingPDF(order: OrderInfo): Buffer {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  addHeader(doc, "CHINA PURCHASE ORDER - MARKING", `Order No: ${order.orderNo}`);

  let y = 40;
  y = addCompanyInfo(doc, y);

  // Order info box
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`Order No: ${order.orderNo}`, 14, y);
  doc.text(`Date: ${order.orderDate}`, 100, y);
  y += 7;
  doc.text(`Customer: ${order.customer}`, 14, y);
  if (order.deliveryDate) {
    doc.text(`Delivery: ${order.deliveryDate}`, 100, y);
  }
  y += 10;

  // Items table
  const tableData = order.items.map((item, i) => [
    i + 1,
    item.productName + (item.productNameCn ? `\n${item.productNameCn}` : ""),
    item.spec || "-",
    item.quantity,
    item.unit,
    item.unitPrice.toLocaleString(),
    item.amount.toLocaleString(),
    item.marking || "-",
  ]);

  autoTable(doc, {
    startY: y,
    head: [["No", "Product / 产品", "Spec", "Qty", "Unit", "U/Price", "Amount", "Marking"]],
    body: tableData,
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 45 },
      2: { cellWidth: 25 },
      3: { cellWidth: 15 },
      4: { cellWidth: 12 },
      5: { cellWidth: 22 },
      6: { cellWidth: 22 },
      7: { cellWidth: 25 },
    },
  });

  const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  doc.setFont("helvetica", "bold");
  doc.text(
    `Total Amount: ${order.currency} ${order.totalAmount.toLocaleString()}`,
    14,
    finalY
  );

  if (order.remarks) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Remarks: ${order.remarks}`, 14, finalY + 8);
  }

  return Buffer.from(doc.output("arraybuffer"));
}

// 패킹리스트 (Packing List)
export function generatePackingListPDF(
  order: OrderInfo,
  shipment: FactoryShipmentInfo
): Buffer {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  addHeader(doc, "PACKING LIST", `CNC Trading Co., Ltd.`);

  let y = 40;
  y = addCompanyInfo(doc, y);

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`Order No: ${order.orderNo}`, 14, y);
  doc.text(`Ship Date: ${shipment.shipDate}`, 100, y);
  doc.text(`Customer: ${order.customer}`, 180, y);
  y += 10;

  const items: PackingListItem[] = shipment.items.map((item, i) => {
    const orderItem = order.items.find(
      (o) =>
        o.productName.includes(item.productName) ||
        item.productName.includes(o.productName)
    );
    return {
      no: i + 1,
      productName: item.productName,
      spec: item.spec,
      quantity: item.quantity,
      unit: item.unit,
      cartons: item.cartons,
      weight: item.weight,
      cbm: item.cbm,
      marking: orderItem?.marking,
    };
  });

  const tableData = items.map((item) => [
    item.no,
    item.productName,
    item.spec || "-",
    item.quantity,
    item.unit,
    item.cartons || "-",
    item.weight ? `${item.weight} KG` : "-",
    item.cbm ? `${item.cbm} CBM` : "-",
    item.marking || "-",
  ]);

  // Totals row
  tableData.push([
    "",
    "TOTAL",
    "",
    shipment.totalQty,
    "",
    items.reduce((s, i) => s + (i.cartons || 0), 0) || "-",
    shipment.totalWeight ? `${shipment.totalWeight} KG` : "-",
    shipment.totalCbm ? `${shipment.totalCbm} CBM` : "-",
    "",
  ]);

  autoTable(doc, {
    startY: y,
    head: [["No", "Description", "Spec", "Qty", "Unit", "Cartons", "G.W.", "CBM", "Marking"]],
    body: tableData,
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [39, 174, 96], textColor: 255, fontStyle: "bold" },
    foot: undefined,
  });

  if (order.remarks) {
    const finalY2 = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Remarks: ${order.remarks}`, 14, finalY2);
  }

  return Buffer.from(doc.output("arraybuffer"));
}

// 입고명세서 (Receipt Statement for domestic customer)
export function generateReceiptPDF(
  order: OrderInfo,
  shipment: FactoryShipmentInfo
): Buffer {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  addHeader(doc, "RECEIPT STATEMENT / 입고명세서", "CNC Trading Co., Ltd.");

  let y = 40;
  y = addCompanyInfo(doc, y);

  // Customer box
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`Customer / 고객사: ${order.customer}`, 14, y);
  y += 6;
  if (order.customerAddr) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Address: ${order.customerAddr}`, 14, y);
    y += 6;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(`Order No / 수주번호: ${order.orderNo}`, 14, y);
  doc.text(`Ship Date / 출고일: ${shipment.shipDate}`, 120, y);
  y += 10;

  const tableData = shipment.items.map((item, i) => {
    const orderItem = order.items[i] || order.items[0];
    return [
      i + 1,
      item.productName,
      item.spec || "-",
      item.quantity,
      item.unit,
      orderItem?.unitPrice ? orderItem.unitPrice.toLocaleString() : "-",
      orderItem?.amount ? orderItem.amount.toLocaleString() : "-",
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [["No", "Product / 제품명", "Spec / 규격", "Qty / 수량", "Unit", "U/Price / 단가", "Amount / 금액"]],
    body: tableData,
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [142, 68, 173], textColor: 255, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 50 },
      2: { cellWidth: 30 },
      3: { cellWidth: 18 },
      4: { cellWidth: 15 },
      5: { cellWidth: 28 },
      6: { cellWidth: 28 },
    },
  });

  const finalY3 = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(
    `Total / 합계: ${order.currency} ${order.totalAmount.toLocaleString()}`,
    14,
    finalY3
  );

  // Signature area
  const sigY = finalY3 + 20;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Confirmed by / 확인:", 14, sigY);
  doc.line(45, sigY, 100, sigY);
  doc.text("Date / 날짜:", 120, sigY);
  doc.line(140, sigY, 180, sigY);

  doc.setFontSize(8);
  doc.text("CNC Trading Co., Ltd.", 14, sigY + 15);
  doc.text(`Issued: ${new Date().toLocaleDateString("ko-KR")}`, 14, sigY + 20);

  return Buffer.from(doc.output("arraybuffer"));
}

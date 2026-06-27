import * as XLSX from "xlsx";
import { OrderInfo, FactoryShipmentInfo } from "@/types";

export function generatePackingListExcel(
  order: OrderInfo,
  shipment: FactoryShipmentInfo
): Buffer {
  const wb = XLSX.utils.book_new();

  // ---- PACKING LIST sheet ----
  const plData: (string | number)[][] = [
    ["PACKING LIST"],
    ["CNC Trading Co., Ltd."],
    [],
    ["Order No:", order.orderNo, "", "Ship Date:", shipment.shipDate],
    ["Customer:", order.customer, "", "Factory:", shipment.factory || ""],
    [],
    ["No", "Description", "Spec", "Qty", "Unit", "Cartons", "G.W. (KG)", "CBM", "Marking"],
  ];

  shipment.items.forEach((item, i) => {
    const orderItem = order.items.find(
      (o) =>
        o.productName.includes(item.productName) ||
        item.productName.includes(o.productName)
    );
    plData.push([
      i + 1,
      item.productName,
      item.spec || "",
      item.quantity,
      item.unit,
      item.cartons || "",
      item.weight || "",
      item.cbm || "",
      orderItem?.marking || "",
    ]);
  });

  // Totals
  plData.push([
    "TOTAL",
    "",
    "",
    shipment.totalQty,
    "",
    shipment.items.reduce((s, i) => s + (i.cartons || 0), 0),
    shipment.totalWeight || "",
    shipment.totalCbm || "",
    "",
  ]);

  const plSheet = XLSX.utils.aoa_to_sheet(plData);

  // Column widths
  plSheet["!cols"] = [
    { wch: 5 }, { wch: 30 }, { wch: 20 }, { wch: 8 }, { wch: 8 },
    { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 20 },
  ];

  // Merge title cell
  plSheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },
  ];

  XLSX.utils.book_append_sheet(wb, plSheet, "Packing List");

  // ---- ORDER SUMMARY sheet ----
  const orderData: (string | number)[][] = [
    ["ORDER SUMMARY / 수주 요약"],
    [],
    ["Order No:", order.orderNo, "Date:", order.orderDate],
    ["Customer:", order.customer, "Delivery:", order.deliveryDate || ""],
    ["Currency:", order.currency],
    [],
    ["No", "Product", "Spec", "Qty", "Unit", "U/Price", "Amount", "Marking"],
  ];

  order.items.forEach((item, i) => {
    orderData.push([
      i + 1,
      item.productName + (item.productNameCn ? ` (${item.productNameCn})` : ""),
      item.spec || "",
      item.quantity,
      item.unit,
      item.unitPrice,
      item.amount,
      item.marking || "",
    ]);
  });

  orderData.push(["", "TOTAL", "", "", "", "", order.totalAmount, ""]);

  if (order.remarks) {
    orderData.push([], ["Remarks:", order.remarks]);
  }

  const orderSheet = XLSX.utils.aoa_to_sheet(orderData);
  orderSheet["!cols"] = [
    { wch: 5 }, { wch: 35 }, { wch: 20 }, { wch: 8 }, { wch: 8 },
    { wch: 15 }, { wch: 15 }, { wch: 20 },
  ];
  orderSheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
  ];

  XLSX.utils.book_append_sheet(wb, orderSheet, "Order Summary");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return Buffer.from(buf);
}

export interface OrderItem {
  productName: string;      // 제품명
  productNameCn?: string;   // 중국어 제품명
  spec?: string;            // 규격
  unit: string;             // 단위
  quantity: number;         // 수량
  unitPrice: number;        // 단가
  amount: number;           // 금액
  marking?: string;         // 마킹 내용
}

export interface OrderInfo {
  orderNo: string;          // 수주번호
  orderDate: string;        // 수주일자
  customer: string;         // 고객사
  customerAddr?: string;    // 고객사 주소
  deliveryDate?: string;    // 납기일
  items: OrderItem[];
  totalAmount: number;
  currency: string;         // KRW / USD / CNY
  remarks?: string;
}

export interface FactoryShipmentInfo {
  shipDate: string;         // 출고일
  factory?: string;         // 공장명
  items: FactoryItem[];
  totalQty: number;
  totalWeight?: number;     // 총 중량 (kg)
  totalCbm?: number;        // 총 부피 (CBM)
  remarks?: string;
}

export interface FactoryItem {
  productName: string;
  productNameCn?: string;
  spec?: string;
  quantity: number;
  unit: string;
  weight?: number;
  cbm?: number;
  cartons?: number;         // 박스 수
}

export interface PackingListItem {
  no: number;
  productName: string;
  spec?: string;
  quantity: number;
  unit: string;
  cartons?: number;
  weight?: number;
  cbm?: number;
  marking?: string;
}

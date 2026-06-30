// 고객 견적서에서 추출된 품목
export interface QuoteItem {
  no: number;
  productCode?: string;   // 품목코드/제품번호
  productName: string;    // 제품명
  spec?: string;          // 규격
  postProcess?: string;   // 후가공
  quantity: number;       // 수량
  unit: string;           // 단위
  unitPrice: number;      // 단가
  amount: number;         // 금액
  deliveryDate?: string;  // 납기
  remarks?: string;
}

// 고객 견적서 전체
export interface CustomerQuote {
  quoteNo: string;
  quoteDate: string;
  customer: string;
  deliveryDate?: string;
  currency: string;
  items: QuoteItem[];
  totalAmount: number;
  remarks?: string;
}

// 마킹 항목 (사용자가 제품명 직접 입력 + 부품 단가)
export interface MarkingEntry {
  itemNo: number;           // QuoteItem.no 참조
  productName: string;      // 원래 제품명 (견적서에서)
  markingName: string;      // 마킹용 제품명 (사용자 입력)
  postProcess: string;      // 후가공
  quantity: number;
  unit: string;
  unitPrice: number;        // 발주 단가
  amount: number;
  deliveryDate: string;
  partUnitPrice?: number;   // 부품별 단가 (패킹리스트용, 사용자 입력)
  partAmount?: number;      // partUnitPrice * quantity
}

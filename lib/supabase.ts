import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, key);

export interface Order {
  id: string;
  order_no: string;
  customer: string;
  product_name: string;
  post_process: string;
  quantity: number;
  unit: string;
  unit_price: number;
  delivery_date: string;
  factory: string;
  status: "ordered" | "production" | "shipped" | "done";
  quote_data: object;
  china_order_data: object;
  markings_data: object;
  shipment_data: object | null;
  manager: string;
  freight: number;
  krw_price: number;
  created_at: string;
  updated_at: string;
}

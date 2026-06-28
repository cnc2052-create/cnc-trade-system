import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// 주문 목록 조회
export async function GET() {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

// 주문 저장
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { data, error } = await supabase
    .from("orders")
    .insert([body])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

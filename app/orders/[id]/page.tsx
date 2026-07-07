"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { CustomerQuote, MarkingEntry } from "@/types";
import { ChinaOrderState, buildChinaOrderHTML } from "@/lib/china-order";
import { buildPackingListHTML } from "@/lib/packing-html";
import { buildReceiptHTML, ReceiptData } from "@/lib/receipt-html";
import { Order } from "@/lib/supabase";

const STATUS = {
  ordered:    { text:"발주완료", color:"#3B82F6", bg:"#EFF6FF", next:"production", nextText:"생산 시작" },
  production: { text:"생산중",   color:"#F59E0B", bg:"#FFFBEB", next:"shipping",   nextText:"운송 시작" },
  shipping:   { text:"운송중",   color:"#8B5CF6", bg:"#F5F3FF", next:"customs",    nextText:"통관완료 처리" },
  customs:    { text:"통관완료", color:"#06B6D4", bg:"#ECFEFF", next:"shipped",    nextText:"출고 처리" },
  shipped:    { text:"출고완료", color:"#10B981", bg:"#ECFDF5", next:"done",       nextText:"완료 처리" },
  done:       { text:"완료",     color:"#6B7280", bg:"#F9FAFB", next:null,         nextText:"" },
} as const;

function Spinner({ size=16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ animation:"spin 1s linear infinite" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.2"/>
      <path d="M8 2a6 6 0 016 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function Card({ children, disabled=false }: { children: React.ReactNode; disabled?: boolean }) {
  return (
    <div style={{ background:"#fff", border:"1px solid #E2E8F0", borderRadius:16, padding:"24px", boxShadow:"0 1px 4px rgba(0,0,0,0.05)", opacity: disabled ? 0.45 : 1, pointerEvents: disabled ? "none" : "auto" }}>
      {children}
    </div>
  );
}

function StepBadge({ n }: { n: number }) {
  return (
    <span style={{ fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:6, background:"#FEF2F2", color:"#DC2626", border:"1px solid #FECACA" }}>
      STEP {n}
    </span>
  );
}

function PdfBtn({ label, onClick, disabled=false }: { label:string; onClick:()=>void; disabled?:boolean }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display:"flex", alignItems:"center", gap:8, height:40, padding:"0 18px", borderRadius:10, border:`1px solid ${hov?"#DC2626":"#E2E8F0"}`, background: hov?"#FEF2F2":"#F8FAFC", color: hov?"#DC2626":"#475569", fontSize:13, fontWeight:600, cursor:"pointer", transition:"all 0.15s", whiteSpace:"nowrap" }}>
      🖨 {label}
    </button>
  );
}

function DlBtn({ label, loading, disabled, onClick }: { label:string; loading:boolean; disabled:boolean; onClick:()=>void }) {
  return (
    <button onClick={onClick} disabled={disabled||loading}
      style={{ display:"flex", alignItems:"center", gap:8, height:38, padding:"0 18px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#DC2626,#991B1B)", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", opacity: disabled&&!loading ? 0.5 : 1, boxShadow:"0 2px 8px rgba(220,38,38,0.25)", whiteSpace:"nowrap" }}>
      {loading ? <Spinner size={14}/> : "⬇"}
      {label}
    </button>
  );
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [packingPrices, setPackingPrices] = useState<Record<number, string>>({});
  const [editMarkings, setEditMarkings] = useState<MarkingEntry[] | null>(null);
  const [editChinaOrder, setEditChinaOrder] = useState<ChinaOrderState | null>(null);
  const [packingImage, setPackingImage] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);

  // 패킹리스트용 이미지 & AI 추출
  const [plImage, setPlImage] = useState<string | null>(null);
  const [plExtracting, setPlExtracting] = useState(false);
  type PlItem = { productNameEn: string; productNameKo: string; quantity: number; unit: string; boxCount: number; packingBreakdown?: string; material?: string };
  const [plItems, setPlItems] = useState<PlItem[]>([]);
  const [receiptData, setReceiptData] = useState<ReceiptData>({
    customer:"", productName:"", packing:"", deliveryAddress:"", deliveryDate:"",
  });

  const quote     = order?.quote_data as CustomerQuote | null;
  const chinaOrder = order?.china_order_data as ChinaOrderState | null;
  const markings  = (order?.markings_data as MarkingEntry[]) || [];

  useEffect(() => {
    fetch(`/api/orders/${id}`).then(r=>r.json()).then(j => {
      const o: Order = j.data;
      setOrder(o);
      if (o.receipt_data) {
        setReceiptData(o.receipt_data as ReceiptData);
      } else {
        setReceiptData(prev => ({ ...prev, customer:o.customer||"", productName:o.product_name||"", deliveryDate:o.delivery_date||"" }));
      }
      setEditMarkings((o.markings_data as MarkingEntry[]) || []);
    });
  }, [id]);

  async function download(key:string, fetcher:()=>Promise<Response>, filename:string) {
    setLoading(key);
    try {
      const res = await fetcher();
      if (!res.ok) throw new Error("생성 오류");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href=url; a.download=filename; a.click();
      URL.revokeObjectURL(url);
    } finally { setLoading(null); }
  }

  const json2 = (body:object) => ({ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body) });

  function openChinaOrder() {
    if (!quote || !chinaOrder) return;
    const w = window.open("","_blank"); w?.document.write(buildChinaOrderHTML(quote,chinaOrder)); w?.document.close();
  }
  function openPackingList() {
    const itemsForPdf = plItems.length > 0
      ? plItems.map((it, i) => ({
          ...it,
          unitPriceUsd: packingPrices[i] ? parseFloat(packingPrices[i]) / 7 : undefined,
        }))
      : markingsWithPrice().map(m => ({
          productNameEn: m.productName,
          productNameKo: m.productName,
          quantity: m.quantity,
          unit: m.unit,
          boxCount: 0,
          unitPriceUsd: m.unitPrice,
        }));
    const customerCode = "KR5090";
    const w = window.open("","_blank");
    w?.document.write(buildPackingListHTML(order?.customer||"", customerCode, itemsForPdf));
    w?.document.close();
  }
  function openReceipt() {
    const w = window.open("","_blank"); w?.document.write(buildReceiptHTML({...receiptData,packingImageBase64:packingImage||undefined})); w?.document.close();
  }

  function handlePackingImage(file:File) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      setPackingImage(base64);
      setExtracting(true);
      try {
        const res = await fetch("/api/extract-packing", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({imageBase64:base64}) });
        const j = await res.json();
        if (j.success && j.data) {
          const d = j.data;
          const items = d.items && d.items.length > 0 ? d.items : null;
          setReceiptData(prev => ({
            ...prev,
            items: items || prev.items,
            packing: items ? (items[0]?.packing || prev.packing) : (d.packing || prev.packing),
            productName: items ? (items[0]?.productName || prev.productName) : (d.productName || prev.productName),
            deliveryAddress: d.deliveryAddress || prev.deliveryAddress,
            deliveryDate: d.deliveryDate || prev.deliveryDate,
          }));
        }
      } finally { setExtracting(false); }
    };
    reader.readAsDataURL(file);
  }

  async function updateStatus(newStatus:string) {
    setSaving(true);
    try {
      const body: Record<string, string> = { status: newStatus };
      if (newStatus === "shipped") body.shipped_date = new Date().toISOString().slice(0, 10);
      const res = await fetch(`/api/orders/${id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body) });
      const j = await res.json(); setOrder(j.data);
    } finally { setSaving(false); }
  }

  async function saveMarkings(updated: MarkingEntry[]) {
    setEditMarkings(updated);
    await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markings_data: updated }),
    });
    setOrder(prev => prev ? { ...prev, markings_data: updated } : prev);
  }

  function handlePlImage(file: File) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      setPlImage(base64);
      setPlExtracting(true);
      try {
        const res = await fetch("/api/extract-packing-list", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64 }),
        });
        const j = await res.json();
        if (j.success && j.data?.items) {
          const markingNames = (editMarkings || markings);
          const mapped = j.data.items.map((it: PlItem, i: number) => ({
            ...it,
            productNameKo: markingNames[i]?.markingName || markingNames[i]?.productName || it.productNameKo,
            productNameEn: it.productNameEn,
          }));
          setPlItems(mapped);
          // 첫 번째 아이템의 패킹 값을 입고명세서에 자동 반영
          const firstBreakdown = mapped[0]?.packingBreakdown || "";
          if (firstBreakdown) setReceiptData(prev => ({ ...prev, packing: firstBreakdown }));
        }
      } finally { setPlExtracting(false); }
    };
    reader.readAsDataURL(file);
  }

  function markingsWithPrice(): MarkingEntry[] {
    return markings.map((m,i) => ({ ...m, unitPrice: packingPrices[i] ? parseFloat(packingPrices[i])/7 : 0.1 }));
  }

  if (!order) return <div style={{ minHeight:"100vh", background:"#F1F5F9", display:"flex", alignItems:"center", justifyContent:"center" }}><Spinner size={28}/></div>;

  const st = STATUS[order.status as keyof typeof STATUS] ?? STATUS.ordered;
  const stepOrder = ["ordered","production","shipping","customs","shipped","done"];
  const currentIdx = stepOrder.indexOf(order.status);
  const stepList = [
    { key:"ordered",    no:1, label:"중국발주" },
    { key:"production", no:2, label:"생산중" },
    { key:"shipping",   no:3, label:"운송중" },
    { key:"customs",    no:4, label:"통관완료" },
    { key:"shipped",    no:5, label:"출고완료" },
  ];

  return (
    <div style={{ minHeight:"100vh", background:"#F1F5F9", fontFamily:"'Apple SD Gothic Neo','Noto Sans KR','Segoe UI',system-ui,sans-serif", color:"#1E293B" }}>

      {/* ── 헤더 ── */}
      <nav style={{ background:"#fff", borderBottom:"1px solid #E2E8F0", position:"sticky", top:0, zIndex:50, boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
        <div style={{ maxWidth:860, margin:"0 auto", padding:"0 24px", height:60, display:"flex", alignItems:"center", gap:10 }}>
          <button onClick={() => router.push("/")}
            style={{ width:32, height:32, borderRadius:8, background:"linear-gradient(135deg,#DC2626,#991B1B)", border:"none", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0 }}>
            <span style={{ color:"#fff", fontSize:9, fontWeight:800 }}>C&C</span>
          </button>
          <button onClick={() => router.push("/")} style={{ background:"none", border:"none", fontSize:13, color:"#94A3B8", cursor:"pointer", fontWeight:500 }}>주문 목록</button>
          <span style={{ color:"#CBD5E1" }}>/</span>
          <span style={{ fontSize:15, fontWeight:700, color:"#0F172A" }}>{order.customer}</span>
          <span style={{ fontSize:11, fontWeight:700, padding:"3px 12px", borderRadius:20, color:st.color, background:st.bg, marginLeft:2 }}>{st.text}</span>

          <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:8 }}>
            {/* 이전 단계 되돌리기 */}
            {currentIdx > 0 && (
              <button onClick={() => updateStatus(stepOrder[currentIdx - 1])} disabled={saving}
                style={{ background:"#F1F5F9", color:"#475569", border:"1px solid #E2E8F0", padding:"8px 16px", borderRadius:10, fontSize:13, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
                ← 이전 단계
              </button>
            )}
            {/* 다음 단계 */}
            {st.next && (
              <button onClick={() => updateStatus(st.next!)} disabled={saving}
                style={{ background:"linear-gradient(135deg,#DC2626,#991B1B)", color:"#fff", border:"none", padding:"8px 20px", borderRadius:10, fontSize:13, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:8, boxShadow:"0 2px 8px rgba(220,38,38,0.25)" }}>
                {saving && <Spinner size={13}/>}
                {st.nextText} →
              </button>
            )}
          </div>
        </div>
      </nav>

      <main style={{ maxWidth:860, margin:"0 auto", padding:"24px", display:"flex", flexDirection:"column", gap:16 }}>

        {/* ── 진행 단계 + 요약 ── */}
        <Card>
          {/* 단계 표시 */}
          <div style={{ display:"flex", gap:8, marginBottom:20 }}>
            {stepList.map((step, i) => {
              const idx = stepOrder.indexOf(step.key);
              const isDone   = idx < currentIdx;
              const isActive = idx === currentIdx;
              return (
                <div key={step.key} style={{ display:"flex", alignItems:"center", gap:8, flex:1 }}>
                  <div style={{ flex:1, display:"flex", alignItems:"center", gap:8, padding:"10px 14px", borderRadius:12,
                    background: isActive ? "#FEF2F2" : isDone ? "#F0FDF4" : "#F8FAFC",
                    border: `1px solid ${isActive ? "#FECACA" : isDone ? "#BBF7D0" : "#E2E8F0"}` }}>
                    <span style={{ width:22, height:22, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, flexShrink:0,
                      background: isActive ? "#DC2626" : isDone ? "#10B981" : "#E2E8F0",
                      color: isActive||isDone ? "#fff" : "#94A3B8" }}>
                      {isDone ? "✓" : step.no}
                    </span>
                    <span style={{ fontSize:12, fontWeight:700, color: isActive ? "#DC2626" : isDone ? "#10B981" : "#94A3B8" }}>
                      {step.label}
                    </span>
                  </div>
                  {i < stepList.length-1 && <div style={{ width:16, height:2, flexShrink:0, borderRadius:1, background: isDone ? "#10B981" : "#E2E8F0" }}/>}
                </div>
              );
            })}
          </div>

          {/* 요약 카드 */}
          <div style={{ display:"grid", gridTemplateColumns:"1.2fr 1fr 0.8fr 0.8fr 0.8fr 0.8fr", gap:10 }}>
            {/* 고객사 — 편집 가능 */}
            <div style={{ background:"#F8FAFC", borderRadius:12, padding:"12px 14px", border:"1px solid #E2E8F0" }}>
              <p style={{ fontSize:10, color:"#94A3B8", marginBottom:4 }}>고객사 <span style={{ color:"#CBD5E1" }}>(수정가능)</span></p>
              <input type="text" value={receiptData.customer}
                onChange={e => setReceiptData(prev => ({...prev, customer:e.target.value}))}
                onFocus={e => e.target.style.borderBottomColor="#DC2626"}
                onBlur={async e => {
                  e.target.style.borderBottomColor="transparent";
                  const v = e.target.value.trim();
                  if (v && v !== order.customer) {
                    await fetch(`/api/orders/${id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({customer:v}) });
                    setOrder(prev => prev ? {...prev, customer:v} : prev);
                  }
                }}
                style={{ width:"100%", background:"transparent", border:"none", borderBottom:"1px solid transparent", outline:"none", fontSize:14, fontWeight:700, color:"#0F172A" }}
              />
            </div>
            {/* 제품명 */}
            <div style={{ background:"#F8FAFC", borderRadius:12, padding:"12px 14px", border:"1px solid #E2E8F0" }}>
              <p style={{ fontSize:10, color:"#94A3B8", marginBottom:4 }}>제품명</p>
              <p style={{ fontSize:14, fontWeight:700, color:"#0F172A" }}>{order.product_name || "—"}</p>
            </div>
            {/* 후가공 */}
            <div style={{ background:"#F8FAFC", borderRadius:12, padding:"12px 14px", border:"1px solid #E2E8F0" }}>
              <p style={{ fontSize:10, color:"#94A3B8", marginBottom:4 }}>후가공</p>
              <p style={{ fontSize:13, fontWeight:600, color:"#475569" }}>{order.post_process || "—"}</p>
            </div>
            {/* 수량 */}
            <div style={{ background:"#F8FAFC", borderRadius:12, padding:"12px 14px", border:"1px solid #E2E8F0" }}>
              <p style={{ fontSize:10, color:"#94A3B8", marginBottom:4 }}>수량</p>
              <p style={{ fontSize:14, fontWeight:700, color:"#0F172A" }}>{order.quantity ? `${order.quantity.toLocaleString()} ${order.unit}` : "—"}</p>
            </div>
            {/* 단가 */}
            <div style={{ background:"#F8FAFC", borderRadius:12, padding:"12px 14px", border:"1px solid #E2E8F0" }}>
              <p style={{ fontSize:10, color:"#94A3B8", marginBottom:4 }}>단가 (₩)</p>
              <p style={{ fontSize:14, fontWeight:700, color:"#DC2626" }}>{order.unit_price ? `₩${Number(order.unit_price).toLocaleString()}` : "—"}</p>
            </div>
            {/* 납기 */}
            <div style={{ background:"#FEF2F2", borderRadius:12, padding:"12px 14px", border:"1px solid #FECACA" }}>
              <p style={{ fontSize:10, color:"#FCA5A5", marginBottom:4 }}>납기</p>
              <p style={{ fontSize:14, fontWeight:700, color:"#DC2626" }}>{order.delivery_date || "미정"}</p>
            </div>
          </div>
        </Card>

        {/* ── STEP 1: 중국발주서 ── */}
        <Card>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:16 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <StepBadge n={1}/>
              <div>
                <h2 style={{ fontSize:16, fontWeight:700, color:"#0F172A" }}>중국발주서</h2>
                <p style={{ fontSize:12, color:"#94A3B8", marginTop:2 }}>공장 전달용 PDF · 발주 시점에 생성</p>
              </div>
            </div>
            <PdfBtn label="PDF 미리보기" onClick={openChinaOrder}/>
          </div>

          {chinaOrder && (() => {
            const isOrdered = order?.status === "ordered";
            const items = editChinaOrder ? editChinaOrder.items : chinaOrder.items;
            const updateItem = (i: number, field: string, val: string) => {
              const base = editChinaOrder || chinaOrder;
              const updated = { ...base, items: base.items.map((it, idx) => idx === i ? { ...it, [field]: field === "unitPrice" ? parseFloat(val)||0 : field === "quantity" ? parseInt(val)||0 : val } : it) };
              setEditChinaOrder(updated);
            };
            const saveChinaOrder = async () => {
              if (!editChinaOrder) return;
              setSaving(true);
              await fetch(`/api/orders/${id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ china_order_data: editChinaOrder }) });
              setOrder(prev => prev ? { ...prev, china_order_data: editChinaOrder } : prev);
              setEditChinaOrder(null);
              setSaving(false);
            };
            return (
            <div style={{ border:"1px solid #E2E8F0", borderRadius:12, overflow:"hidden" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead>
                  <tr style={{ background:"#F8FAFC" }}>
                    {["제품명 (中)","공법 (中)","단가 (¥)","수량","출고일"].map(h => (
                      <th key={h} style={{ padding:"10px 16px", textAlign:"left", color:"#64748B", fontWeight:600, fontSize:12, borderBottom:"1px solid #E2E8F0" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, i) => (
                    <tr key={i} style={{ borderBottom:"1px solid #F1F5F9" }}>
                      <td style={{ padding:"8px 12px", fontWeight:600, color:"#0F172A" }}>
                        {isOrdered ? <input value={it.productNameCn} onChange={e=>updateItem(i,"productNameCn",e.target.value)}
                          style={{ width:"100%", border:"1px solid #E2E8F0", borderRadius:7, padding:"5px 8px", fontSize:13, fontWeight:600, outline:"none", background:"#fff" }}
                          onFocus={e=>e.target.style.borderColor="#DC2626"} onBlur={e=>e.target.style.borderColor="#E2E8F0"}/> : it.productNameCn}
                      </td>
                      <td style={{ padding:"8px 12px", color:"#64748B" }}>
                        {isOrdered ? <input value={it.postProcessCn||""} onChange={e=>updateItem(i,"postProcessCn",e.target.value)}
                          style={{ width:"100%", border:"1px solid #E2E8F0", borderRadius:7, padding:"5px 8px", fontSize:13, outline:"none", background:"#fff" }}
                          onFocus={e=>e.target.style.borderColor="#DC2626"} onBlur={e=>e.target.style.borderColor="#E2E8F0"}/> : (it.postProcessCn||"-")}
                      </td>
                      <td style={{ padding:"8px 12px", color:"#DC2626", fontWeight:600 }}>
                        {isOrdered ? (
                          <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                            <span style={{ fontSize:13, color:"#DC2626", fontWeight:700 }}>¥</span>
                            <input type="number" value={it.unitPrice} onChange={e=>updateItem(i,"unitPrice",e.target.value)}
                              step="0.01" min="0"
                              style={{ width:100, border:"1.5px solid #FECACA", borderRadius:7, padding:"6px 8px", fontSize:14, fontWeight:700, color:"#DC2626", outline:"none", background:"#FFF5F5" }}
                              onFocus={e=>e.target.style.borderColor="#DC2626"} onBlur={e=>e.target.style.borderColor="#FECACA"}/>
                          </div>
                        ) : `¥${it.unitPrice.toFixed(2)}`}
                      </td>
                      <td style={{ padding:"8px 12px", color:"#475569" }}>
                        {isOrdered ? <input type="number" value={it.quantity} onChange={e=>updateItem(i,"quantity",e.target.value)}
                          style={{ width:90, border:"1px solid #E2E8F0", borderRadius:7, padding:"5px 8px", fontSize:13, outline:"none", background:"#fff" }}
                          onFocus={e=>e.target.style.borderColor="#DC2626"} onBlur={e=>e.target.style.borderColor="#E2E8F0"}/> : `${it.quantity.toLocaleString()} ${it.unit}`}
                      </td>
                      <td style={{ padding:"8px 12px", color:"#94A3B8" }}>
                        {isOrdered ? <input value={it.deliveryDate||""} onChange={e=>updateItem(i,"deliveryDate",e.target.value)}
                          style={{ width:110, border:"1px solid #E2E8F0", borderRadius:7, padding:"5px 8px", fontSize:13, outline:"none", background:"#fff" }}
                          onFocus={e=>e.target.style.borderColor="#DC2626"} onBlur={e=>e.target.style.borderColor="#E2E8F0"}/> : (it.deliveryDate||"-")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {isOrdered && editChinaOrder && (
                <div style={{ padding:"10px 16px", borderTop:"1px solid #E2E8F0", display:"flex", justifyContent:"flex-end" }}>
                  <button onClick={saveChinaOrder} disabled={saving}
                    style={{ padding:"8px 20px", borderRadius:8, background:"#DC2626", color:"#fff", border:"none", fontSize:13, fontWeight:700, cursor:"pointer", opacity: saving ? 0.6 : 1 }}>
                    {saving ? "저장 중..." : "💾 저장"}
                  </button>
                </div>
              )}
            </div>
            );
          })()}
        </Card>

        {/* ── STEP 2: 마킹 ── */}
        <Card>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
            <StepBadge n={2}/>
            <h2 style={{ fontSize:16, fontWeight:700, color:"#0F172A" }}>마킹</h2>
            <span style={{ fontSize:12, color:"#94A3B8" }}>· 공장 출고용 마킹 라벨 · 부품별 개별 다운로드</span>
            <button onClick={() => {
              const updated = [...(editMarkings||markings), { itemNo: String((editMarkings||markings).length+1), markingName:"", productName: order.product_name||"", quantity: order.quantity||0, unit: order.unit||"EA" }];
              saveMarkings(updated);
            }}
              style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:6, padding:"6px 14px", borderRadius:8, background:"#F0FDF4", border:"1px solid #BBF7D0", color:"#16A34A", fontSize:12, fontWeight:700, cursor:"pointer" }}>
              + 부품 추가
            </button>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {(editMarkings || markings).map((m, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 16px", borderRadius:12, background:"#F8FAFC", border:"1px solid #E2E8F0" }}>
                <span style={{ fontSize:12, color:"#94A3B8", width:20, textAlign:"center", flexShrink:0 }}>{i+1}</span>

                {/* 마킹명 편집 */}
                <div style={{ flex:1, display:"flex", flexDirection:"column", gap:4 }}>
                  <input value={m.markingName}
                    onChange={e => {
                      const updated = (editMarkings||markings).map((x,idx)=>idx===i?{...x,markingName:e.target.value}:x);
                      setEditMarkings(updated);
                    }}
                    onBlur={() => saveMarkings(editMarkings||markings)}
                    placeholder="마킹명"
                    style={{ fontSize:14, fontWeight:700, color:"#0F172A", background:"transparent", border:"none", borderBottom:"1px solid transparent", outline:"none", width:"100%" }}
                    onFocus={e=>e.target.style.borderBottomColor="#DC2626"}
                    onBlurCapture={e=>e.target.style.borderBottomColor="transparent"}
                  />
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <input value={m.productName}
                      onChange={e => {
                        const updated = (editMarkings||markings).map((x,idx)=>idx===i?{...x,productName:e.target.value}:x);
                        setEditMarkings(updated);
                      }}
                      onBlur={() => saveMarkings(editMarkings||markings)}
                      placeholder="제품명"
                      style={{ fontSize:12, color:"#64748B", background:"transparent", border:"none", borderBottom:"1px dashed transparent", outline:"none", width:120 }}
                      onFocus={e=>e.target.style.borderBottomColor="#94A3B8"}
                      onBlurCapture={e=>e.target.style.borderBottomColor="transparent"}
                    />
                    <span style={{ fontSize:12, color:"#CBD5E1" }}>·</span>
                    <input type="number" value={m.quantity}
                      onChange={e => {
                        const updated = (editMarkings||markings).map((x,idx)=>idx===i?{...x,quantity:Number(e.target.value)}:x);
                        setEditMarkings(updated);
                      }}
                      onBlur={() => saveMarkings(editMarkings||markings)}
                      style={{ fontSize:12, color:"#64748B", background:"transparent", border:"none", borderBottom:"1px dashed transparent", outline:"none", width:70, textAlign:"right" }}
                      onFocus={e=>e.target.style.borderBottomColor="#94A3B8"}
                      onBlurCapture={e=>e.target.style.borderBottomColor="transparent"}
                    />
                    <input value={m.unit}
                      onChange={e => {
                        const updated = (editMarkings||markings).map((x,idx)=>idx===i?{...x,unit:e.target.value}:x);
                        setEditMarkings(updated);
                      }}
                      onBlur={() => saveMarkings(editMarkings||markings)}
                      style={{ fontSize:12, color:"#64748B", background:"transparent", border:"none", borderBottom:"1px dashed transparent", outline:"none", width:40 }}
                      onFocus={e=>e.target.style.borderBottomColor="#94A3B8"}
                      onBlurCapture={e=>e.target.style.borderBottomColor="transparent"}
                    />
                  </div>
                </div>

                <DlBtn label="마킹 다운로드" loading={loading===`marking_${i}`} disabled={!!loading}
                  onClick={async () => {
                    setLoading(`marking_${i}`);
                    try {
                      // 마킹명 중국어 번역
                      let cnName = m.markingName;
                      try {
                        const tr = await fetch("/api/translate", {
                          method:"POST", headers:{"Content-Type":"application/json"},
                          body: JSON.stringify({ items:[{ productName: m.markingName, postProcess:"" }] }),
                        });
                        const tj = await tr.json();
                        cnName = tj.translated?.[0]?.productNameCn || m.markingName;
                      } catch {}
                      const date = new Date().toISOString().slice(0,10).replace(/-/g,"");
                      const filename = `${order.customer}_${cnName}_${date}.xlsx`;
                      const res = await fetch("/api/generate-marking", json2({quote, markings:[m]}));
                      if (!res.ok) throw new Error("생성 오류");
                      const blob = await res.blob();
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a"); a.href=url; a.download=filename; a.click();
                      URL.revokeObjectURL(url);
                    } finally { setLoading(null); }
                  }}/>

                {/* 삭제 버튼 */}
                <button onClick={() => {
                  if (!confirm(`"${m.markingName || i+1}번 부품"을 삭제할까요?`)) return;
                  const updated = (editMarkings||markings).filter((_,idx)=>idx!==i);
                  saveMarkings(updated);
                }}
                  style={{ width:30, height:30, borderRadius:8, background:"#FEF2F2", border:"1px solid #FECACA", color:"#DC2626", fontSize:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  ×
                </button>
              </div>
            ))}
          </div>
        </Card>

        {/* ── STEP 3: 패킹리스트 (운송중) ── */}
        <Card disabled={currentIdx < 2}>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:16 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <StepBadge n={3}/>
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <h2 style={{ fontSize:16, fontWeight:700, color:"#0F172A" }}>패킹리스트</h2>
                  {currentIdx < 2 && <span style={{ fontSize:11, color:"#F59E0B", background:"#FFFBEB", padding:"2px 8px", borderRadius:6, border:"1px solid #FDE68A" }}>운송 단계 활성화</span>}
                </div>
                <p style={{ fontSize:12, color:"#94A3B8", marginTop:2 }}>공장 패킹 이미지 업로드 → AI 자동 추출 → 편집 → PDF</p>
              </div>
            </div>
            <PdfBtn label="패킹리스트 PDF" onClick={openPackingList}/>
          </div>

          {/* 패킹 이미지 업로드 */}
          <div style={{ marginBottom:16 }}>
            {plImage ? (
              <div style={{ position:"relative", marginBottom:12 }}>
                <img src={plImage} alt="패킹" style={{ maxHeight:160, width:"100%", objectFit:"contain", borderRadius:12, border:"1px solid #E2E8F0", background:"#F8FAFC" }}/>
                <div style={{ position:"absolute", top:8, right:8, display:"flex", gap:6 }}>
                  {plExtracting && <span style={{ background:"rgba(0,0,0,0.65)", color:"#fff", fontSize:11, padding:"4px 10px", borderRadius:8, display:"flex", alignItems:"center", gap:6 }}><Spinner size={12}/> AI 분석 중...</span>}
                  <button onClick={() => { setPlImage(null); setPlItems([]); }} style={{ width:28, height:28, borderRadius:"50%", background:"rgba(0,0,0,0.55)", color:"#fff", border:"none", fontSize:16, cursor:"pointer" }}>×</button>
                </div>
              </div>
            ) : (
              <label style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10, height:80, borderRadius:12, border:"2px dashed #E2E8F0", cursor:"pointer", color:"#94A3B8", fontSize:13, background:"#F8FAFC", transition:"all 0.15s" }}
                onDragOver={e=>e.preventDefault()}
                onDrop={e=>{e.preventDefault(); const f=e.dataTransfer.files[0]; if(f?.type.startsWith("image/")) handlePlImage(f);}}
                onMouseEnter={e=>(e.currentTarget as HTMLLabelElement).style.borderColor="#DC2626"}
                onMouseLeave={e=>(e.currentTarget as HTMLLabelElement).style.borderColor="#E2E8F0"}>
                <span style={{ fontSize:24 }}>📦</span>
                <span>공장 패킹 이미지 업로드 → AI가 제품명(영문)·수량 자동 추출</span>
                <input type="file" accept="image/*" style={{ display:"none" }} onChange={e=>{const f=e.target.files?.[0]; if(f) handlePlImage(f);}}/>
              </label>
            )}
          </div>

          {/* 패킹리스트 테이블 — PDF 출력 형식과 동일 */}
          {plItems.length > 0 && (
            <div style={{ border:"1px solid #E2E8F0", borderRadius:12, overflow:"hidden", marginBottom:12 }}>
              <div style={{ background:"#F8FAFC", padding:"10px 16px", borderBottom:"1px solid #E2E8F0" }}>
                <p style={{ fontSize:12, fontWeight:700, color:"#64748B" }}>✨ AI 추출 결과 — 수정 후 PDF에 반영됩니다</p>
              </div>
              <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead>
                  <tr style={{ background:"#FAFAFA", borderBottom:"2px solid #1E293B" }}>
                    {["Item","Material","Packing Breakdown","Quantity (pcs)","Cartons (CTNS)","Unit Price (USD)","Amount (USD)"].map(h=>(
                      <th key={h} style={{ padding:"10px 12px", textAlign: h.includes("Quantity")||h.includes("Cartons")||h.includes("Price")||h.includes("Amount") ? "right":"left", color:"#374151", fontWeight:700, fontSize:11, whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {plItems.map((item, i) => {
                    const cny = parseFloat(packingPrices[i]||"") || 0;
                    const usd = cny / 7;
                    const amt = usd * item.quantity;
                    const breakdown = item.packingBreakdown || (() => {
                      if (!item.boxCount) return "—";
                      const perBox = Math.floor(item.quantity / item.boxCount);
                      const rem = item.quantity - perBox * item.boxCount;
                      return rem > 0 ? `${perBox.toLocaleString()} × ${item.boxCount} + ${rem.toLocaleString()}` : `${perBox.toLocaleString()} × ${item.boxCount}`;
                    })();
                    return (
                    <tr key={i} style={{ borderBottom: i < plItems.length-1 ? "1px solid #F1F5F9":"none" }}>
                      {/* Item */}
                      <td style={{ padding:"10px 12px", minWidth:140 }}>
                        <input value={item.productNameEn}
                          onChange={e=>setPlItems(prev=>prev.map((it,idx)=>idx===i?{...it,productNameEn:e.target.value}:it))}
                          style={{ width:"100%", background:"#fff", border:"1px solid #E2E8F0", borderRadius:7, padding:"5px 8px", fontSize:13, color:"#0F172A", fontWeight:600, outline:"none" }}
                          onFocus={e=>e.target.style.borderColor="#DC2626"}
                          onBlur={e=>e.target.style.borderColor="#E2E8F0"}/>
                        <p style={{ fontSize:10, color:"#94A3B8", marginTop:3 }}>{item.productNameKo}</p>
                      </td>
                      {/* Material */}
                      <td style={{ padding:"10px 12px" }}>
                        <input value={item.material||""}
                          onChange={e=>setPlItems(prev=>prev.map((it,idx)=>idx===i?{...it,material:e.target.value}:it))}
                          placeholder="N/A"
                          style={{ width:90, background:"#fff", border:"1px solid #E2E8F0", borderRadius:7, padding:"5px 8px", fontSize:13, color:"#0F172A", outline:"none" }}
                          onFocus={e=>e.target.style.borderColor="#DC2626"}
                          onBlur={e=>e.target.style.borderColor="#E2E8F0"}/>
                      </td>
                      {/* Packing Breakdown */}
                      <td style={{ padding:"10px 12px", color:"#374151", fontSize:12 }}>{breakdown}</td>
                      {/* Quantity */}
                      <td style={{ padding:"10px 12px", textAlign:"right" }}>
                        <input type="number" value={item.quantity}
                          onChange={e=>setPlItems(prev=>prev.map((it,idx)=>idx===i?{...it,quantity:Number(e.target.value)}:it))}
                          style={{ width:80, background:"#fff", border:"1px solid #E2E8F0", borderRadius:7, padding:"5px 8px", fontSize:13, color:"#0F172A", fontWeight:600, outline:"none", textAlign:"right" }}
                          onFocus={e=>e.target.style.borderColor="#DC2626"}
                          onBlur={e=>e.target.style.borderColor="#E2E8F0"}/>
                      </td>
                      {/* Cartons */}
                      <td style={{ padding:"10px 12px", textAlign:"right", color:"#374151" }}>{item.boxCount||"—"}</td>
                      {/* Unit Price */}
                      <td style={{ padding:"10px 8px", textAlign:"right" }}>
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"flex-end", gap:4 }}>
                          <span style={{ fontSize:10, color:"#94A3B8" }}>¥</span>
                          <input type="number" value={packingPrices[i]||""}
                            onChange={e=>setPackingPrices(prev=>({...prev,[i]:e.target.value}))}
                            placeholder="0.0"
                            style={{ width:72, background:"#fff", border:"1px solid #E2E8F0", borderRadius:7, padding:"5px 8px", fontSize:13, color:"#0F172A", outline:"none", textAlign:"right" }}
                            onFocus={e=>e.target.style.borderColor="#DC2626"}
                            onBlur={e=>e.target.style.borderColor="#E2E8F0"}/>
                        </div>
                        {usd > 0 && <p style={{ fontSize:10, color:"#10B981", textAlign:"right", marginTop:2 }}>$ {usd.toFixed(3)}</p>}
                      </td>
                      {/* Amount */}
                      <td style={{ padding:"10px 12px", textAlign:"right", fontWeight:600, color: amt>0?"#0F172A":"#CBD5E1" }}>
                        {amt > 0 ? `$ ${amt.toFixed(2)}` : "—"}
                      </td>
                    </tr>
                    );
                  })}
                  {/* Total Row */}
                  <tr style={{ borderTop:"2px solid #1E293B", background:"#F8FAFC" }}>
                    <td colSpan={3} style={{ padding:"10px 12px", fontWeight:700, fontSize:12, color:"#374151" }}>TOTAL</td>
                    <td style={{ padding:"10px 12px", textAlign:"right", fontWeight:700 }}>{plItems.reduce((s,it)=>s+it.quantity,0).toLocaleString()}</td>
                    <td style={{ padding:"10px 12px", textAlign:"right", fontWeight:700 }}>{plItems.reduce((s,it)=>s+(it.boxCount||0),0)}</td>
                    <td></td>
                    <td style={{ padding:"10px 12px", textAlign:"right", fontWeight:700, color:"#DC2626" }}>
                      {(() => { const t=plItems.reduce((s,it,i)=>s+(parseFloat(packingPrices[i]||"0")||0)/7*it.quantity,0); return t>0?`$ ${t.toFixed(2)}`:"—"; })()}
                    </td>
                  </tr>
                </tbody>
              </table>
              </div>
            </div>
          )}
        </Card>

        {/* ── STEP 4: 입고명세서 ── */}
        <Card disabled={currentIdx < 2}>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:16 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <StepBadge n={4}/>
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <h2 style={{ fontSize:16, fontWeight:700, color:"#0F172A" }}>입고명세서</h2>
                  {currentIdx < 2 && <span style={{ fontSize:11, color:"#F59E0B", background:"#FFFBEB", padding:"2px 8px", borderRadius:6, border:"1px solid #FDE68A" }}>출고 단계 활성화</span>}
                </div>
                <p style={{ fontSize:12, color:"#94A3B8", marginTop:2 }}>고객사 전달용 · 포장 사진 업로드 → AI 자동 추출 → PDF</p>
              </div>
            </div>
            <PdfBtn label="입고명세서 PDF" onClick={openReceipt}/>
          </div>

          {/* 포장 사진 업로드 */}
          <div style={{ marginBottom:20 }}>
            <p style={{ fontSize:12, fontWeight:600, color:"#475569", marginBottom:8 }}>📦 공장 포장 사진 업로드</p>
            {packingImage ? (
              <div style={{ position:"relative" }}>
                <img src={packingImage} alt="포장사진" style={{ maxHeight:200, width:"100%", objectFit:"contain", borderRadius:12, border:"1px solid #E2E8F0", background:"#F8FAFC" }}/>
                <div style={{ position:"absolute", top:8, right:8, display:"flex", gap:6 }}>
                  {extracting && <span style={{ background:"rgba(0,0,0,0.65)", color:"#fff", fontSize:11, padding:"4px 10px", borderRadius:8, display:"flex", alignItems:"center", gap:6 }}><Spinner size={12}/> AI 분석 중...</span>}
                  <button onClick={() => setPackingImage(null)} style={{ width:28, height:28, borderRadius:"50%", background:"rgba(0,0,0,0.55)", color:"#fff", border:"none", fontSize:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
                </div>
              </div>
            ) : (
              <label style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:8, height:110, borderRadius:12, border:"2px dashed #E2E8F0", cursor:"pointer", color:"#94A3B8", fontSize:13, background:"#F8FAFC", transition:"all 0.15s" }}
                onDragOver={e=>e.preventDefault()}
                onDrop={e=>{e.preventDefault(); const f=e.dataTransfer.files[0]; if(f?.type.startsWith("image/")) handlePackingImage(f);}}
                onMouseEnter={e=>(e.currentTarget as HTMLLabelElement).style.borderColor="#DC2626"}
                onMouseLeave={e=>(e.currentTarget as HTMLLabelElement).style.borderColor="#E2E8F0"}>
                <span style={{ fontSize:28 }}>📷</span>
                <span>공장 포장 사진 클릭 또는 드래그 → AI가 패킹 정보 자동 추출</span>
                <input type="file" accept="image/*" style={{ display:"none" }} onChange={e=>{const f=e.target.files?.[0]; if(f) handlePackingImage(f);}}/>
              </label>
            )}
          </div>

          {/* 입력 필드 */}
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {/* 고객사명 */}
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <span style={{ width:80, fontSize:12, fontWeight:600, color:"#64748B", flexShrink:0 }}>고객사명</span>
              <input type="text" value={receiptData.customer}
                onChange={e=>setReceiptData(prev=>({...prev,customer:e.target.value}))}
                placeholder="고객사명"
                style={{ flex:1, height:38, padding:"0 12px", borderRadius:10, border:"1px solid #E2E8F0", fontSize:13, color:"#0F172A", outline:"none", background:"#fff" }}
                onFocus={e=>e.target.style.borderColor="#DC2626"}
                onBlur={e=>e.target.style.borderColor="#E2E8F0"}/>
            </div>

            {/* 부품별 제품명+패킹 (items 배열) */}
            {receiptData.items && receiptData.items.length > 0 ? (
              <div style={{ border:"1px solid #E2E8F0", borderRadius:12, overflow:"hidden" }}>
                <div style={{ background:"#F8FAFC", padding:"8px 14px", fontSize:11, fontWeight:700, color:"#64748B", borderBottom:"1px solid #E2E8F0" }}>
                  부품별 제품명 &amp; 패킹 ({receiptData.items.length}개)
                </div>
                {receiptData.items.map((item, i) => (
                  <div key={i} style={{ padding:"10px 14px", borderBottom: i < receiptData.items!.length-1 ? "1px solid #F1F5F9" : "none", display:"flex", gap:8, alignItems:"center" }}>
                    <span style={{ width:50, fontSize:11, fontWeight:700, color:"#94A3B8", flexShrink:0 }}>부품 {i+1}</span>
                    <input type="text" value={item.productName}
                      onChange={e=>{ const items=[...receiptData.items!]; items[i]={...items[i],productName:e.target.value}; setReceiptData(prev=>({...prev,items})); }}
                      placeholder="제품명/부품명"
                      style={{ flex:1, height:34, padding:"0 10px", borderRadius:8, border:"1px solid #E2E8F0", fontSize:12, color:"#0F172A", outline:"none", background:"#fff" }}
                      onFocus={e=>e.target.style.borderColor="#DC2626"}
                      onBlur={e=>e.target.style.borderColor="#E2E8F0"}/>
                    <input type="text" value={item.packing}
                      onChange={e=>{ const items=[...receiptData.items!]; items[i]={...items[i],packing:e.target.value}; setReceiptData(prev=>({...prev,items})); }}
                      placeholder="패킹 (예: 63×160 + 1×25)"
                      style={{ flex:1.5, height:34, padding:"0 10px", borderRadius:8, border:"1px solid #E2E8F0", fontSize:12, color:"#0F172A", outline:"none", background:"#fff" }}
                      onFocus={e=>e.target.style.borderColor="#DC2626"}
                      onBlur={e=>e.target.style.borderColor="#E2E8F0"}/>
                    <button onClick={()=>{ const items=receiptData.items!.filter((_,idx)=>idx!==i); setReceiptData(prev=>({...prev,items:items.length>0?items:undefined})); }}
                      style={{ width:28, height:28, borderRadius:6, border:"none", background:"#FEE2E2", color:"#DC2626", cursor:"pointer", fontSize:14, flexShrink:0 }}>×</button>
                  </div>
                ))}
                <div style={{ padding:"8px 14px" }}>
                  <button onClick={()=>setReceiptData(prev=>({...prev,items:[...(prev.items||[]),{productName:"",packing:""}]}))}
                    style={{ fontSize:12, color:"#64748B", background:"none", border:"1px dashed #CBD5E1", borderRadius:8, padding:"4px 12px", cursor:"pointer" }}>
                    + 부품 추가
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <span style={{ width:80, fontSize:12, fontWeight:600, color:"#64748B", flexShrink:0 }}>제품명</span>
                  <input type="text" value={receiptData.productName}
                    onChange={e=>setReceiptData(prev=>({...prev,productName:e.target.value}))}
                    placeholder="제품명"
                    style={{ flex:1, height:38, padding:"0 12px", borderRadius:10, border:"1px solid #E2E8F0", fontSize:13, color:"#0F172A", outline:"none", background:"#fff" }}
                    onFocus={e=>e.target.style.borderColor="#DC2626"}
                    onBlur={e=>e.target.style.borderColor="#E2E8F0"}/>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <span style={{ width:80, fontSize:12, fontWeight:600, color:"#64748B", flexShrink:0 }}>패킹</span>
                  <input type="text" value={receiptData.packing}
                    onChange={e=>setReceiptData(prev=>({...prev,packing:e.target.value}))}
                    placeholder="예: 5×1914 + 470"
                    style={{ flex:1, height:38, padding:"0 12px", borderRadius:10, border:"1px solid #E2E8F0", fontSize:13, color:"#0F172A", outline:"none", background:"#fff" }}
                    onFocus={e=>e.target.style.borderColor="#DC2626"}
                    onBlur={e=>e.target.style.borderColor="#E2E8F0"}/>
                </div>
              </>
            )}

            {/* 도착예정일 */}
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <span style={{ width:80, fontSize:12, fontWeight:600, color:"#64748B", flexShrink:0 }}>도착예정일</span>
              <input type="text" value={receiptData.deliveryDate}
                onChange={e=>setReceiptData(prev=>({...prev,deliveryDate:e.target.value}))}
                placeholder="예: 2026-07-10"
                style={{ flex:1, height:38, padding:"0 12px", borderRadius:10, border:"1px solid #E2E8F0", fontSize:13, color:"#0F172A", outline:"none", background:"#fff" }}
                onFocus={e=>e.target.style.borderColor="#DC2626"}
                onBlur={e=>e.target.style.borderColor="#E2E8F0"}/>
            </div>
            <div style={{ display:"flex", gap:12 }}>
              <span style={{ width:80, fontSize:12, fontWeight:600, color:"#64748B", flexShrink:0, paddingTop:8 }}>배송지</span>
              <textarea value={receiptData.deliveryAddress}
                onChange={e=>setReceiptData(prev=>({...prev,deliveryAddress:e.target.value}))}
                placeholder={"예: 경기도 의왕시 이미로 40\n인덕원 IT밸리 504,505호\n담당자 : 010-0000-0000"}
                rows={3}
                style={{ flex:1, padding:"10px 12px", borderRadius:10, border:"1px solid #E2E8F0", fontSize:13, color:"#0F172A", outline:"none", background:"#fff", resize:"none", fontFamily:"inherit" }}
                onFocus={e=>e.target.style.borderColor="#DC2626"}
                onBlur={e=>e.target.style.borderColor="#E2E8F0"}/>
            </div>
          </div>

          {/* 저장 버튼 */}
          <div style={{ marginTop:16, display:"flex", justifyContent:"flex-end" }}>
            <button
              onClick={async () => {
                setSaving(true);
                await fetch(`/api/orders/${id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ receipt_data: receiptData }) });
                setOrder(prev => prev ? { ...prev, receipt_data: receiptData as unknown as never } : prev);
                setSaving(false);
                alert("저장되었습니다.");
              }}
              disabled={saving}
              style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 28px", borderRadius:10, background:"#0F172A", color:"#fff", border:"none", fontSize:14, fontWeight:700, cursor:"pointer", opacity: saving ? 0.6 : 1 }}>
              {saving ? "저장 중..." : "💾 입고명세서 저장"}
            </button>
          </div>
        </Card>

        {/* ── 수금 문자 템플릿 ── */}
        {currentIdx >= 2 && (
          <div style={{ background:"#fff", borderRadius:16, border:"1px solid #E2E8F0", padding:"20px 24px", boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
              <span style={{ fontSize:18 }}>💬</span>
              <div>
                <p style={{ fontSize:14, fontWeight:700, color:"#475569" }}>잔금 수금 안내 문자</p>
                <p style={{ fontSize:12, color:"#94A3B8" }}>클릭하면 클립보드에 복사됩니다</p>
              </div>
            </div>
            <button
              onClick={() => {
                const msg = `안녕하세요 대표님:)\n\n오늘 통관이 예정되어 있습니다.\n통관이 완료되는 대로 바로 배차를 진행하여 배송해드릴 예정입니다.\n\n원활한 진행을 위해 잔금 입금을 부탁드립니다.\n\n잔금 입금 확인 및 통관 완료가 되는 대로 즉시 배송을 진행하겠습니다.\n\n감사합니다.`;
                navigator.clipboard.writeText(msg).then(() => {
                  const el = document.getElementById("copy-toast");
                  if (el) { el.style.opacity="1"; setTimeout(()=>{ el.style.opacity="0"; },2000); }
                });
              }}
              style={{ width:"100%", textAlign:"left", background:"#F8FAFC", border:"1.5px dashed #CBD5E1", borderRadius:12, padding:"16px 18px", cursor:"pointer", transition:"border-color 0.2s" }}
              onMouseEnter={e=>(e.currentTarget.style.borderColor="#6366F1")}
              onMouseLeave={e=>(e.currentTarget.style.borderColor="#CBD5E1")}
            >
              <p style={{ fontSize:13, color:"#475569", lineHeight:1.9, whiteSpace:"pre-line", fontFamily:"inherit" }}>{`안녕하세요 대표님:)\n\n오늘 통관이 예정되어 있습니다.\n통관이 완료되는 대로 바로 배차를 진행하여 배송해드릴 예정입니다.\n\n원활한 진행을 위해 잔금 입금을 부탁드립니다.\n\n잔금 입금 확인 및 통관 완료가 되는 대로 즉시 배송을 진행하겠습니다.\n\n감사합니다.`}</p>
              <div style={{ marginTop:12, display:"flex", justifyContent:"flex-end" }}>
                <span style={{ fontSize:11, color:"#6366F1", fontWeight:600, background:"#EEF2FF", padding:"4px 10px", borderRadius:6 }}>📋 복사하기</span>
              </div>
            </button>
            <div id="copy-toast" style={{ marginTop:10, textAlign:"center", fontSize:12, color:"#10B981", fontWeight:600, opacity:0, transition:"opacity 0.3s" }}>✓ 클립보드에 복사되었습니다</div>
          </div>
        )}

      </main>

      <footer style={{ borderTop:"1px solid #E2E8F0", padding:"16px 24px", textAlign:"center" }}>
        <p style={{ fontSize:12, color:"#CBD5E1" }}>© 씨앤씨무역 Trading Cloud 2026 · Powered by GPT-4o Vision</p>
      </footer>
    </div>
  );
}

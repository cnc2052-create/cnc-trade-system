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
  production: { text:"생산중",   color:"#F59E0B", bg:"#FFFBEB", next:"shipped",    nextText:"출고 처리" },
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
  const [packingImage, setPackingImage] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
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
      setReceiptData(prev => ({ ...prev, customer:o.customer||"", productName:o.product_name||"", deliveryDate:o.delivery_date||"" }));
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
    if (!quote) return;
    const w = window.open("","_blank"); w?.document.write(buildPackingListHTML(quote,markingsWithPrice(),packingImage||undefined)); w?.document.close();
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
          setReceiptData(prev => ({ ...prev, packing:j.data.packing||prev.packing, productName:j.data.productName||prev.productName, deliveryAddress:j.data.deliveryAddress||prev.deliveryAddress, deliveryDate:j.data.deliveryDate||prev.deliveryDate }));
        }
      } finally { setExtracting(false); }
    };
    reader.readAsDataURL(file);
  }

  async function updateStatus(newStatus:string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({status:newStatus}) });
      const j = await res.json(); setOrder(j.data);
    } finally { setSaving(false); }
  }

  function markingsWithPrice(): MarkingEntry[] {
    return markings.map((m,i) => ({ ...m, unitPrice: packingPrices[i] ? parseFloat(packingPrices[i])/7 : 0.1 }));
  }

  if (!order) return <div style={{ minHeight:"100vh", background:"#F1F5F9", display:"flex", alignItems:"center", justifyContent:"center" }}><Spinner size={28}/></div>;

  const st = STATUS[order.status as keyof typeof STATUS] ?? STATUS.ordered;
  const stepOrder = ["ordered","production","shipped","done"];
  const currentIdx = stepOrder.indexOf(order.status);
  const stepList = [
    { key:"ordered",    no:1, label:"중국발주" },
    { key:"production", no:2, label:"생산중" },
    { key:"shipped",    no:3, label:"패킹리스트" },
    { key:"done",       no:4, label:"입고완료" },
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

          {st.next && (
            <button onClick={() => updateStatus(st.next!)} disabled={saving}
              style={{ marginLeft:"auto", background:"linear-gradient(135deg,#DC2626,#991B1B)", color:"#fff", border:"none", padding:"8px 20px", borderRadius:10, fontSize:13, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:8, boxShadow:"0 2px 8px rgba(220,38,38,0.25)" }}>
              {saving && <Spinner size={13}/>}
              {st.nextText} →
            </button>
          )}
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

          {/* 요약 카드 3칸 */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
            <div style={{ background:"#F8FAFC", borderRadius:12, padding:"14px 16px", border:"1px solid #E2E8F0" }}>
              <p style={{ fontSize:11, color:"#94A3B8", marginBottom:4 }}>고객사 <span style={{ color:"#CBD5E1" }}>(클릭하여 수정)</span></p>
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
                style={{ width:"100%", background:"transparent", border:"none", borderBottom:"1px solid transparent", outline:"none", fontSize:15, fontWeight:700, color:"#0F172A" }}
              />
            </div>
            <div style={{ background:"#F8FAFC", borderRadius:12, padding:"14px 16px", border:"1px solid #E2E8F0" }}>
              <p style={{ fontSize:11, color:"#94A3B8", marginBottom:4 }}>제품명</p>
              <p style={{ fontSize:15, fontWeight:700, color:"#0F172A" }}>{order.product_name}</p>
            </div>
            <div style={{ background:"#F8FAFC", borderRadius:12, padding:"14px 16px", border:"1px solid #E2E8F0" }}>
              <p style={{ fontSize:11, color:"#94A3B8", marginBottom:4 }}>납기</p>
              <p style={{ fontSize:15, fontWeight:700, color:"#DC2626" }}>{order.delivery_date || "미정"}</p>
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

          {chinaOrder && (
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
                  {chinaOrder.items.map((it, i) => (
                    <tr key={i} style={{ borderBottom:"1px solid #F1F5F9" }}>
                      <td style={{ padding:"12px 16px", fontWeight:600, color:"#0F172A" }}>{it.productNameCn}</td>
                      <td style={{ padding:"12px 16px", color:"#64748B" }}>{it.postProcessCn||"-"}</td>
                      <td style={{ padding:"12px 16px", color:"#DC2626", fontWeight:600 }}>¥{it.unitPrice.toFixed(2)}</td>
                      <td style={{ padding:"12px 16px", color:"#475569" }}>{it.quantity.toLocaleString()} {it.unit}</td>
                      <td style={{ padding:"12px 16px", color:"#94A3B8" }}>{it.deliveryDate||"-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* ── STEP 2: 마킹 ── */}
        <Card>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
            <StepBadge n={2}/>
            <h2 style={{ fontSize:16, fontWeight:700, color:"#0F172A" }}>마킹</h2>
            <span style={{ fontSize:12, color:"#94A3B8" }}>· 공장 출고용 마킹 라벨 · 부품별 개별 다운로드</span>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {markings.map((m,i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 16px", borderRadius:12, background:"#F8FAFC", border:"1px solid #E2E8F0" }}>
                <span style={{ fontSize:12, color:"#94A3B8", width:20, textAlign:"center", flexShrink:0 }}>{i+1}</span>
                <div style={{ flex:1 }}>
                  <span style={{ fontSize:14, fontWeight:700, color:"#0F172A" }}>{m.markingName}</span>
                  <span style={{ fontSize:12, color:"#94A3B8", marginLeft:8 }}>{m.productName} · {m.quantity.toLocaleString()} {m.unit}</span>
                </div>
                <DlBtn label="마킹 다운로드" loading={loading===`marking_${i}`} disabled={!!loading}
                  onClick={() => download(`marking_${i}`, () => fetch("/api/generate-marking", json2({quote, markings:[m]})), `마킹_${m.markingName}_${order.order_no}.xlsx`)}/>
              </div>
            ))}
          </div>
        </Card>

        {/* ── STEP 3: 패킹리스트 ── */}
        <Card disabled={currentIdx < 2}>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:16 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <StepBadge n={3}/>
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <h2 style={{ fontSize:16, fontWeight:700, color:"#0F172A" }}>패킹리스트</h2>
                  {currentIdx < 2 && <span style={{ fontSize:11, color:"#F59E0B", background:"#FFFBEB", padding:"2px 8px", borderRadius:6, border:"1px solid #FDE68A" }}>출고 단계 활성화</span>}
                </div>
                <p style={{ fontSize:12, color:"#94A3B8", marginTop:2 }}>포워딩용 · 단가 입력 후 PDF 생성</p>
              </div>
            </div>
            <PdfBtn label="패킹리스트 PDF" onClick={openPackingList}/>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {markings.map((m,i) => {
              const priceVal = packingPrices[i] || "";
              const usd = priceVal ? (parseFloat(priceVal)/7).toFixed(3) : "—";
              return (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 16px", borderRadius:12, background:"#F8FAFC", border:"1px solid #E2E8F0" }}>
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:14, fontWeight:600, color:"#0F172A" }}>{m.markingName}</p>
                    <p style={{ fontSize:12, color:"#94A3B8", marginTop:2 }}>{m.quantity.toLocaleString()} {m.unit}</p>
                  </div>
                  <div>
                    <p style={{ fontSize:11, color:"#94A3B8", marginBottom:4 }}>단가 (¥)</p>
                    <input type="number" value={priceVal}
                      onChange={e => setPackingPrices(prev => ({...prev,[i]:e.target.value}))}
                      placeholder="예: 3.5"
                      style={{ width:100, background:"#fff", border:"1px solid #E2E8F0", borderRadius:8, padding:"6px 10px", fontSize:13, outline:"none", color:"#0F172A" }}
                      onFocus={e => e.target.style.borderColor="#DC2626"}
                      onBlur={e => e.target.style.borderColor="#E2E8F0"}/>
                  </div>
                  <div style={{ textAlign:"right", minWidth:60 }}>
                    <p style={{ fontSize:11, color:"#94A3B8", marginBottom:4 }}>USD</p>
                    <p style={{ fontSize:15, fontWeight:700, color:"#0F172A" }}>{usd}</p>
                  </div>
                </div>
              );
            })}
          </div>
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
            {([
              { key:"customer",     label:"고객사명",   placeholder:"고객사명" },
              { key:"productName",  label:"제품명",     placeholder:"제품명" },
              { key:"packing",      label:"패킹",       placeholder:"예: 5×1914 + 470" },
              { key:"deliveryDate", label:"도착예정일", placeholder:"예: 2026-07-10" },
            ] as {key:keyof ReceiptData; label:string; placeholder:string}[]).map(({key,label,placeholder}) => (
              <div key={key} style={{ display:"flex", alignItems:"center", gap:12 }}>
                <span style={{ width:80, fontSize:12, fontWeight:600, color:"#64748B", flexShrink:0 }}>{label}</span>
                <input type="text" value={receiptData[key] as string}
                  onChange={e=>setReceiptData(prev=>({...prev,[key]:e.target.value}))}
                  placeholder={placeholder}
                  style={{ flex:1, height:38, padding:"0 12px", borderRadius:10, border:"1px solid #E2E8F0", fontSize:13, color:"#0F172A", outline:"none", background:"#fff" }}
                  onFocus={e=>e.target.style.borderColor="#DC2626"}
                  onBlur={e=>e.target.style.borderColor="#E2E8F0"}/>
              </div>
            ))}
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
        </Card>

      </main>

      <footer style={{ borderTop:"1px solid #E2E8F0", padding:"16px 24px", textAlign:"center" }}>
        <p style={{ fontSize:12, color:"#CBD5E1" }}>© 씨앤씨무역 Trading Cloud 2026 · Powered by GPT-4o Vision</p>
      </footer>
    </div>
  );
}

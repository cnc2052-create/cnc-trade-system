"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Order } from "@/lib/supabase";

/* ── 상수 ── */
const EXCHANGE = 200;
const MANAGERS = ["최계화 대표", "정지훈 이사"];

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  ordered:    { label: "발주완료", color: "#3B82F6", bg: "#EFF6FF" },
  production: { label: "생산중",   color: "#F59E0B", bg: "#FFFBEB" },
  shipping:   { label: "운송중",   color: "#8B5CF6", bg: "#F5F3FF" },
  customs:    { label: "통관완료", color: "#06B6D4", bg: "#ECFEFF" },
  shipped:    { label: "출고완료", color: "#10B981", bg: "#ECFDF5" },
  done:       { label: "출고완료", color: "#10B981", bg: "#ECFDF5" },
};

const FILTER_TABS = [
  { key: "all",        label: "전체 주문건", icon: "📦" },
  { key: "ordered",    label: "중국발주",   icon: "📋" },
  { key: "production", label: "생산중",     icon: "🏭" },
  { key: "shipping",   label: "운송중",     icon: "🚢" },
  { key: "customs",    label: "통관완료",   icon: "✅" },
  { key: "shipped",    label: "출고완료",   icon: "📬" },
];

const QUICK_LINKS = [
  { label:"ERP",    sub:"이카운트",      icon:"🖥",  url:"https://login.ecount.com",           accent:"#2563EB" },
  { label:"홈페이지", sub:"cc009.co.kr",  icon:"🏠",  url:"https://cc009.co.kr/",              accent:"#DC2626" },
  { label:"블로그",  sub:"네이버",        icon:"📝",  url:"https://blog.naver.com/cc009",       accent:"#03C75A" },
  { label:"카페",    sub:"코스팩",        icon:"☕",  url:"https://cafe.naver.com/cospack",     accent:"#FF6B35" },
  { label:"인스타",  sub:"cnc_packaging", icon:"📸",  url:"https://instagram.com/cnc_packaging",accent:"#C13584" },
  { label:"카톡상담", sub:"채널톡",        icon:"💬",  url:"https://accounts.kakao.com/login/?continue=https%253A%252F%252Fbusiness.kakao.com%252F_PpXzd%252Fchats&lang=ko#login", accent:"#F59E0B" },
];

function won(n: number) {
  if (Math.abs(n) >= 100_000_000) return `${(n/100_000_000).toFixed(1)}억원`;
  if (Math.abs(n) >= 10_000) return `${Math.round(n/10_000).toLocaleString()}만원`;
  return n.toLocaleString()+"원";
}

function calcProfit(o: Order) {
  const krw = Number(o.unit_price||0) * Number(o.quantity||0);
  const co = o.china_order_data as { items?: { unitPrice?: number; quantity?: number }[] } | null;
  const cnyCost = co?.items
    ? co.items.reduce((s,it)=>s+(Number(it.unitPrice)||0)*(Number(it.quantity)||0),0)
    : Number(o.unit_price||0)*Number(o.quantity||0);
  const freight = Number(o.freight)||0;
  return { krw, cnyKrw: cnyCost*EXCHANGE, freight, profit: krw-cnyCost*EXCHANGE-freight };
}

/* ── 제품정보 카드 모달 ── */
const NO_PREFIX = "NO.CNC";
interface CardInfo { name:string; no:string; price:string; moq:string; lead:string }

function ProductCardModal({ onClose }: { onClose: ()=>void }) {
  const [info, setInfo] = useState<CardInfo>({ name:"", no:"NO.CNC00", price:"", moq:"10000", lead:"45" });
  const [noSuffix, setNoSuffix] = useState("00");
  const [noSkip, setNoSkip] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const set = (k: keyof CardInfo) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setInfo(prev=>({...prev,[k]:e.target.value}));

  async function savePng() {
    if (!cardRef.current) return;
    const { default: html2canvas } = await import("html2canvas");
    const canvas = await html2canvas(cardRef.current, { scale:3, backgroundColor:"#fff" });
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `${info.name||"제품정보"}_카드.png`;
    a.click();
  }

  function savePdf() {
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Apple SD Gothic Neo','Noto Sans KR',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f5f5f5}
  .card{background:#fff;border:2px solid #E2E8F0;border-radius:16px;width:320px;padding:28px;box-shadow:0 4px 24px rgba(0,0,0,0.08)}
  .header{text-align:center;padding-bottom:16px;border-bottom:2px solid #DC2626;margin-bottom:20px}
  .ko{font-size:15px;font-weight:700;color:#0F172A;letter-spacing:1px;margin-bottom:3px}
  .brand{font-size:10px;font-weight:600;color:#DC2626;letter-spacing:2px}
  .row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #F1F5F9}
  .row:last-child{border-bottom:none}
  .label{font-size:11px;color:#94A3B8;font-weight:600}
  .value{font-size:14px;font-weight:700;color:#0F172A}
  @media print{body{background:#fff}.card{box-shadow:none;border:2px solid #E2E8F0}}
</style></head><body>
<div class="card">
  <div class="header"><div class="ko">씨앤씨무역</div><div class="brand">C&C TRADING</div></div>
  ${[["제품명",info.name],["제품번호",info.no],["단가",info.price?(Number(info.price).toLocaleString("ko-KR")+"원 (VAT별도)"):""],["MOQ",info.moq?(Number(info.moq).toLocaleString("ko-KR")+" EA"):""],["납기",info.lead?(info.lead+"일"):""]]
    .map(([l,v])=>`<div class="row"><span class="label">${l}</span><span class="value">${v||"—"}</span></div>`).join("")}
</div>
<script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500)}<\/script>
</body></html>`;
    const w = window.open("","_blank"); w?.document.write(html); w?.document.close();
  }

  function copyText() {
    const priceStr = info.price ? Number(info.price).toLocaleString("ko-KR")+"원 (VAT별도)" : "—";
    const moqStr   = info.moq   ? Number(info.moq).toLocaleString("ko-KR")+" EA"          : "—";
    const leadStr  = info.lead  ? info.lead+"일"                                        : "—";
    const text = `씨앤씨무역  C&C TRADING\n${"─".repeat(20)}\n제품명\t${info.name||"—"}\n제품번호\t${info.no||"—"}\n단가\t${priceStr}\nMOQ\t${moqStr}\n납기\t${leadStr}\n${"─".repeat(20)}`;
    navigator.clipboard.writeText(text).then(()=>alert("클립보드에 복사되었습니다"));
  }

  const inputStyle: React.CSSProperties = {
    width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #E2E8F0",
    fontSize:13, color:"#0F172A", outline:"none", background:"#F8FAFC",
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:100, display:"flex", alignItems:"center", justifyContent:"center" }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:"#fff", borderRadius:20, width:680, maxHeight:"90vh", overflow:"auto", padding:32, boxShadow:"0 20px 60px rgba(0,0,0,0.15)" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
          <h2 style={{ fontSize:18, fontWeight:800, color:"#0F172A" }}>📋 제품정보 카드</h2>
          <button onClick={onClose} style={{ width:32, height:32, borderRadius:8, border:"1px solid #E2E8F0", background:"#F8FAFC", cursor:"pointer", fontSize:18, color:"#64748B" }}>×</button>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24 }}>
          {/* 입력 */}
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <h3 style={{ fontSize:13, fontWeight:700, color:"#64748B", marginBottom:4 }}>입력</h3>
            {/* 1. 제품명 */}
            <div>
              <p style={{ fontSize:11, color:"#94A3B8", fontWeight:600, marginBottom:4 }}>제품명</p>
              <input value={info.name} onChange={set("name")} placeholder="예: 크림용기" style={inputStyle}
                onFocus={e=>e.target.style.borderColor="#DC2626"}
                onBlur={e=>e.target.style.borderColor="#E2E8F0"}/>
            </div>
            {/* 2. 제품번호 — prefix 고정 */}
            <div>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
                <p style={{ fontSize:11, color:"#94A3B8", fontWeight:600 }}>제품번호</p>
                <label style={{ display:"flex", alignItems:"center", gap:5, cursor:"pointer", fontSize:11, color: noSkip?"#DC2626":"#94A3B8", fontWeight:600 }}>
                  <input type="checkbox" checked={noSkip} onChange={e=>{ setNoSkip(e.target.checked); if(e.target.checked) setInfo(prev=>({...prev,no:"이미지 참고"})); else setInfo(prev=>({...prev,no:NO_PREFIX+noSuffix})); }}
                    style={{ accentColor:"#DC2626", width:13, height:13 }}/>
                  번호 없음
                </label>
              </div>
              <div style={{ display:"flex", alignItems:"center", border:"1px solid #E2E8F0", borderRadius:8, background: noSkip?"#F1F5F9":"#F8FAFC", overflow:"hidden", opacity: noSkip?0.5:1, transition:"opacity 0.2s" }}>
                <span style={{ padding:"8px 10px", fontSize:13, color:"#94A3B8", background:"#F1F5F9", borderRight:"1px solid #E2E8F0", fontWeight:600, whiteSpace:"nowrap" }}>{NO_PREFIX}</span>
                <input value={noSkip?"":noSuffix} onChange={e=>{ setNoSuffix(e.target.value); setInfo(prev=>({...prev,no:NO_PREFIX+e.target.value})); }}
                  maxLength={10} disabled={noSkip}
                  style={{ flex:1, padding:"8px 10px", fontSize:13, color:"#0F172A", border:"none", outline:"none", background:"transparent", cursor: noSkip?"not-allowed":"text" }}
                  onFocus={e=>(e.target.parentElement!.style.borderColor="#DC2626")}
                  onBlur={e=>(e.target.parentElement!.style.borderColor="#E2E8F0")}/>
              </div>
            </div>
            {/* 3. 단가 */}
            <div>
              <p style={{ fontSize:11, color:"#94A3B8", fontWeight:600, marginBottom:4 }}>단가</p>
              <div style={{ display:"flex", alignItems:"center", border:"1px solid #E2E8F0", borderRadius:8, background:"#F8FAFC", overflow:"hidden" }}>
                <input type="number" value={info.price} onChange={e=>setInfo(prev=>({...prev,price:e.target.value}))}
                  placeholder="480"
                  style={{ flex:1, padding:"8px 10px", fontSize:13, color:"#0F172A", border:"none", outline:"none", background:"transparent" }}
                  onFocus={e=>(e.target.parentElement!.style.borderColor="#DC2626")}
                  onBlur={e=>(e.target.parentElement!.style.borderColor="#E2E8F0")}/>
                <span style={{ padding:"8px 10px", fontSize:13, color:"#94A3B8", background:"#F1F5F9", borderLeft:"1px solid #E2E8F0", whiteSpace:"nowrap" }}>원 (VAT별도)</span>
              </div>
            </div>
            {/* 4. MOQ */}
            <div>
              <p style={{ fontSize:11, color:"#94A3B8", fontWeight:600, marginBottom:4 }}>MOQ</p>
              <div style={{ display:"flex", alignItems:"center", border:"1px solid #E2E8F0", borderRadius:8, background:"#F8FAFC", overflow:"hidden" }}>
                <input type="number" value={info.moq} onChange={e=>setInfo(prev=>({...prev,moq:e.target.value}))}
                  placeholder="10000"
                  style={{ flex:1, padding:"8px 10px", fontSize:13, color:"#0F172A", border:"none", outline:"none", background:"transparent" }}
                  onFocus={e=>(e.target.parentElement!.style.borderColor="#DC2626")}
                  onBlur={e=>(e.target.parentElement!.style.borderColor="#E2E8F0")}/>
                <span style={{ padding:"8px 10px", fontSize:13, color:"#94A3B8", background:"#F1F5F9", borderLeft:"1px solid #E2E8F0" }}>EA</span>
              </div>
            </div>
            {/* 5. 납기 */}
            <div>
              <p style={{ fontSize:11, color:"#94A3B8", fontWeight:600, marginBottom:4 }}>납기</p>
              <div style={{ display:"flex", alignItems:"center", border:"1px solid #E2E8F0", borderRadius:8, background:"#F8FAFC", overflow:"hidden" }}>
                <input type="number" value={info.lead} onChange={e=>setInfo(prev=>({...prev,lead:e.target.value}))}
                  placeholder="45"
                  style={{ flex:1, padding:"8px 10px", fontSize:13, color:"#0F172A", border:"none", outline:"none", background:"transparent" }}
                  onFocus={e=>(e.target.parentElement!.style.borderColor="#DC2626")}
                  onBlur={e=>(e.target.parentElement!.style.borderColor="#E2E8F0")}/>
                <span style={{ padding:"8px 10px", fontSize:13, color:"#94A3B8", background:"#F1F5F9", borderLeft:"1px solid #E2E8F0" }}>일</span>
              </div>
            </div>
          </div>

          {/* 미리보기 */}
          <div>
            <h3 style={{ fontSize:13, fontWeight:700, color:"#64748B", marginBottom:12 }}>미리보기</h3>
            <div ref={cardRef} style={{ background:"#fff", border:"2px solid #E2E8F0", borderRadius:16, padding:28, boxShadow:"0 4px 16px rgba(0,0,0,0.06)" }}>
              <div style={{ textAlign:"center", paddingBottom:16, borderBottom:"2px solid #DC2626", marginBottom:20 }}>
                <p style={{ fontSize:14, fontWeight:700, color:"#0F172A", letterSpacing:1, marginBottom:3 }}>씨앤씨무역</p>
                <p style={{ fontSize:10, fontWeight:600, color:"#DC2626", letterSpacing:3 }}>C&C TRADING</p>
              </div>
              {([["제품명",info.name],["제품번호",info.no],["단가",info.price?(Number(info.price).toLocaleString("ko-KR")+"원 (VAT별도)"):""],["MOQ",info.moq?(Number(info.moq).toLocaleString("ko-KR")+" EA"):""],["납기",info.lead?(info.lead+"일"):""]] as [string,string][]).map(([label,val],i,arr)=>(
                <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom: i<arr.length-1?"1px solid #F1F5F9":"none" }}>
                  <span style={{ fontSize:11, color:"#94A3B8", fontWeight:600 }}>{label}</span>
                  <span style={{ fontSize:15, fontWeight:700, color: val?"#0F172A":"#CBD5E1" }}>{val||"—"}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 하단 버튼 */}
        <div style={{ display:"flex", gap:10, marginTop:24, justifyContent:"flex-end" }}>
          {[
            { label:"📋 복사",     fn: copyText,  bg:"#F8FAFC", color:"#475569", border:"1px solid #E2E8F0" },
            { label:"🖼 PNG 저장", fn: savePng,   bg:"#EFF6FF", color:"#2563EB", border:"1px solid #BFDBFE" },
            { label:"🖨 PDF 저장", fn: savePdf,   bg:"#FEF2F2", color:"#DC2626", border:"1px solid #FECACA" },
          ].map(btn=>(
            <button key={btn.label} onClick={btn.fn}
              style={{ padding:"10px 20px", borderRadius:10, border:btn.border, background:btn.bg, color:btn.color, fontSize:13, fontWeight:700, cursor:"pointer" }}>
              {btn.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── 메인 대시보드 ── */
export default function Dashboard() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [editFreight, setEditFreight] = useState<Record<string, string>>({});
  const [editOrderDate, setEditOrderDate] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [showCardModal, setShowCardModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; customer: string; product: string } | null>(null);
  const [showShipped, setShowShipped] = useState(false);

  const load = useCallback(() => {
    fetch("/api/orders")
      .then(r=>r.json())
      .then(j=>setOrders(j.data||[]))
      .finally(()=>setLoading(false));
  }, []);
  useEffect(()=>{ load(); },[load]);

  /* 상태별 카운트 */
  const counts: Record<string, number> = { all: orders.length };
  orders.forEach(o=>{ counts[o.status] = (counts[o.status]||0)+1; });
  counts["shipped"] = (counts["shipped"]||0) + (counts["done"]||0);

  const totalKrw   = orders.reduce((s,o)=>s+(Number(o.krw_price)||0),0);
  const allProfit  = orders.reduce((s,o)=>s+calcProfit(o).profit,0);
  const active     = orders.filter(o=>o.status!=="done");
  const nearDeadlineOrders = active.filter(o=>{
    if(!o.delivery_date) return false;
    return (new Date(o.delivery_date).getTime()-Date.now())/86400000<=10;
  });
  const nearDeadline = nearDeadlineOrders.length;

  /* 필터된 주문 목록 */
  const sortByDate = (arr: typeof orders) => [...arr].sort((a,b)=>{
    const da = a.order_date || a.created_at || "";
    const db = b.order_date || b.created_at || "";
    return db.localeCompare(da);
  });
  const filtered = sortByDate(
    filter==="deadline" ? nearDeadlineOrders : filter==="all" ? orders : filter==="shipped" ? orders.filter(o=>o.status==="shipped"||o.status==="done") : orders.filter(o=>o.status===filter)
  );

  async function saveFreight(id: string) {
    const val = Number(editFreight[id]);
    if(isNaN(val)) return;
    setSaving(id);
    await fetch(`/api/orders/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({freight:val})});
    setOrders(prev=>prev.map(o=>o.id===id?{...o,freight:val}:o));
    setSaving(null);
    setEditFreight(prev=>{const n={...prev};delete n[id];return n;});
  }

  async function saveOrderDate(id: string, date: string) {
    await fetch(`/api/orders/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({order_date: date||null})});
    setOrders(prev=>prev.map(o=>o.id===id?{...o,order_date:date||null}:o));
    setEditOrderDate(prev=>{const n={...prev};delete n[id];return n;});
  }

  async function saveManager(id: string, manager: string) {
    await fetch(`/api/orders/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({manager})});
    setOrders(prev=>prev.map(o=>o.id===id?{...o,manager}:o));
  }

  const stats = [
    { label:"진행중 주문", value:`${active.length}건`,  sub:"현재 처리중",       icon:"📦", accent:"#3B82F6", lightBg:"#EFF6FF" },
    { label:"총 수주금액", value:won(totalKrw),          sub:"전체 주문 합계",     icon:"💰", accent:"#10B981", lightBg:"#ECFDF5" },
    { label:"총 예상순익", value:won(allProfit),         sub:"수주 − 원가 − 운임", icon:"📈", accent:allProfit>=0?"#10B981":"#EF4444", lightBg:allProfit>=0?"#ECFDF5":"#FEF2F2" },
    { label:"납기임박",    value:`${nearDeadline}건`,    sub:"10일 이내",          icon:"⏰", accent:"#F59E0B", lightBg:"#FFFBEB", clickable: true },
  ];

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:"#F1F5F9", fontFamily:"'Apple SD Gothic Neo','Noto Sans KR','Segoe UI',system-ui,sans-serif", color:"#1E293B" }}>

      {/* ── 사이드바 ── */}
      <aside style={{ width:220, flexShrink:0, background:"#fff", borderRight:"1px solid #E2E8F0", display:"flex", flexDirection:"column", position:"sticky", top:0, height:"100vh", boxShadow:"2px 0 8px rgba(0,0,0,0.04)" }}>

        {/* 로고 */}
        <div style={{ padding:"22px 20px 18px", borderBottom:"1px solid #F1F5F9" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(135deg,#DC2626,#991B1B)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:800, color:"#fff", boxShadow:"0 4px 12px rgba(220,38,38,0.3)" }}>C&C</div>
            <div>
              <p style={{ fontSize:14, fontWeight:800, color:"#0F172A" }}>씨앤씨무역</p>
              <p style={{ fontSize:10, color:"#DC2626", letterSpacing:2, marginTop:1, fontWeight:600 }}>TRADING CLOUD</p>
            </div>
          </div>
        </div>

        <nav style={{ flex:1, padding:"12px 10px", display:"flex", flexDirection:"column", gap:2, overflowY:"auto" }}>

          {/* 대시보드 / 새 주문 */}
          {[
            { icon:"📊", label:"대시보드",    onClick:()=>setFilter("all") },
            { icon:"＋", label:"새 주문 등록", onClick:()=>router.push("/orders/new") },
          ].map(item=>(
            <button key={item.label} onClick={item.onClick}
              style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 12px", borderRadius:9, border:"none", cursor:"pointer", fontSize:13, fontWeight:600, textAlign:"left", background:"transparent", color:"#64748B", transition:"all 0.12s" }}
              onMouseEnter={e=>{e.currentTarget.style.background="#FEF2F2";e.currentTarget.style.color="#DC2626"}}
              onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="#64748B"}}>
              <span style={{ fontSize:14 }}>{item.icon}</span>{item.label}
            </button>
          ))}

          {/* 구분선 */}
          <div style={{ borderTop:"1px solid #F1F5F9", margin:"8px 0" }}/>

          {/* 주문 현황 필터 */}
          <p style={{ fontSize:10, fontWeight:700, color:"#94A3B8", letterSpacing:1, padding:"2px 12px", marginBottom:2 }}>주문 현황</p>
          {FILTER_TABS.map(tab=>{
            const isActive = filter===tab.key;
            const cnt = counts[tab.key]||0;
            return (
              <button key={tab.key} onClick={()=>setFilter(tab.key)}
                style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px", borderRadius:9, border:"none", cursor:"pointer", fontSize:13, fontWeight: isActive?700:500, textAlign:"left", background: isActive?"#FEF2F2":"transparent", color: isActive?"#DC2626":"#64748B", transition:"all 0.12s" }}
                onMouseEnter={e=>{ if(!isActive){e.currentTarget.style.background="#F8FAFC";e.currentTarget.style.color="#334155"} }}
                onMouseLeave={e=>{ if(!isActive){e.currentTarget.style.background="transparent";e.currentTarget.style.color="#64748B"} }}>
                <span style={{ fontSize:13 }}>{tab.icon}</span>
                <span style={{ flex:1 }}>{tab.label}</span>
                <span style={{ fontSize:11, fontWeight:700, minWidth:20, textAlign:"right", color: isActive?"#DC2626": cnt>0?"#475569":"#CBD5E1" }}>
                  {cnt||0}
                </span>
              </button>
            );
          })}

          {/* 구분선 */}
          <div style={{ borderTop:"1px solid #F1F5F9", margin:"8px 0" }}/>

          {/* 제품정보 카드 */}
          <button onClick={()=>setShowCardModal(true)}
            style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 12px", borderRadius:9, border:"none", cursor:"pointer", fontSize:13, fontWeight:600, textAlign:"left", background:"transparent", color:"#64748B", transition:"all 0.12s" }}
            onMouseEnter={e=>{e.currentTarget.style.background="#FEF2F2";e.currentTarget.style.color="#DC2626"}}
            onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="#64748B"}}>
            <span style={{ fontSize:14 }}>📋</span>제품정보 카드
          </button>
        </nav>

        {/* 환율 */}
        <div style={{ margin:"auto 14px 80px", paddingTop:12, borderTop:"1px solid #F1F5F9" }}>
          <p style={{ fontSize:9, color:"#CBD5E1", fontWeight:400, letterSpacing:1.5, marginBottom:6, textTransform:"uppercase" }}>Exchange Rate</p>
          <div style={{ display:"flex", alignItems:"baseline", gap:4 }}>
            <span style={{ fontSize:10, color:"#CBD5E1", fontWeight:300 }}>CNY</span>
            <span style={{ fontSize:20, fontWeight:200, color:"#94A3B8", letterSpacing:-1, lineHeight:1 }}>{EXCHANGE}</span>
            <span style={{ fontSize:10, color:"#CBD5E1", fontWeight:300 }}>KRW</span>
          </div>
        </div>
      </aside>

      {/* ── 메인 ── */}
      <main style={{ flex:1, overflow:"auto" }}>

        {/* 헤더 */}
        <header style={{ background:"#fff", borderBottom:"1px solid #E2E8F0", padding:"0 32px", height:60, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:10, boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
          <div>
            <h1 style={{ fontSize:17, fontWeight:700, color:"#0F172A" }}>
              {filter==="all" ? "전체 주문 현황" : (STATUS_MAP[filter]?.label||"주문 현황")}
            </h1>
            <p style={{ fontSize:11, color:"#94A3B8", marginTop:1 }}>씨앤씨무역 · {new Date().toLocaleDateString("ko-KR")}</p>
          </div>
          <button onClick={()=>router.push("/orders/new")}
            style={{ background:"linear-gradient(135deg,#DC2626,#991B1B)", color:"#fff", border:"none", padding:"9px 20px", borderRadius:10, fontSize:13, fontWeight:700, cursor:"pointer", boxShadow:"0 4px 12px rgba(220,38,38,0.3)" }}>
            + 새 주문 등록
          </button>
        </header>

        <div style={{ padding:"24px 28px", display:"flex", flexDirection:"column", gap:22 }}>

          {/* 바로가기 */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:10 }}>
            {QUICK_LINKS.map(link=>(
              <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer"
                style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3, padding:"7px 8px", background:"#fff", border:"1px solid #E2E8F0", borderRadius:12, textDecoration:"none", boxShadow:"0 1px 4px rgba(0,0,0,0.05)", transition:"all 0.15s" }}
                onMouseEnter={e=>{const el=e.currentTarget as HTMLAnchorElement;el.style.borderColor=link.accent;el.style.transform="translateY(-2px)";}}
                onMouseLeave={e=>{const el=e.currentTarget as HTMLAnchorElement;el.style.borderColor="#E2E8F0";el.style.transform="none";}}>
                <span style={{ fontSize:24 }}>{link.icon}</span>
                <p style={{ fontSize:12, fontWeight:700, color:"#1E293B" }}>{link.label}</p>
                <p style={{ fontSize:10, color:"#94A3B8" }}>{link.sub}</p>
              </a>
            ))}
          </div>

          {/* 통계 카드 — 전체 보기일 때만 */}
          {filter==="all" && (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14 }}>
              {stats.map(s=>(
                <div key={s.label}
                  onClick={()=>{ if((s as {clickable?:boolean}).clickable) setFilter(filter==="deadline"?"all":"deadline"); }}
                  style={{ background: filter==="deadline"&&(s as {clickable?:boolean}).clickable?"#FFFBEB":"#fff", border: filter==="deadline"&&(s as {clickable?:boolean}).clickable?"1.5px solid #FCD34D":"1px solid #E2E8F0", borderRadius:14, padding:"18px 20px", boxShadow:"0 1px 4px rgba(0,0,0,0.05)", cursor:(s as {clickable?:boolean}).clickable?"pointer":"default", transition:"all 0.15s" }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                    <p style={{ fontSize:12, color:"#64748B", fontWeight:500 }}>{s.label}</p>
                    <div style={{ width:36, height:36, borderRadius:9, background:s.lightBg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>{s.icon}</div>
                  </div>
                  <p style={{ fontSize:22, fontWeight:800, color:s.accent, letterSpacing:-0.5 }}>{loading?"—":s.value}</p>
                  <p style={{ fontSize:11, color:"#94A3B8", marginTop:5 }}>{s.sub}{(s as {clickable?:boolean}).clickable && <span style={{ marginLeft:6, color:"#F59E0B", fontWeight:600 }}>{filter==="deadline"?"▲ 필터 해제":"▼ 클릭하여 보기"}</span>}</p>
                </div>
              ))}
            </div>
          )}

          {/* 📊 월별 + 담당자별 시각화 */}
          {filter==="all" && (() => {
            const monthly: Record<string, { count:number; krw:number; cnyKrw:number; profit:number }> = {};
            orders.forEach(o => {
              const month = (o.order_date || o.created_at || "").slice(0,7);
              if (!month) return;
              const { krw, cnyKrw, profit } = calcProfit(o);
              if (!monthly[month]) monthly[month] = { count:0, krw:0, cnyKrw:0, profit:0 };
              monthly[month].count++; monthly[month].krw+=krw; monthly[month].cnyKrw+=cnyKrw; monthly[month].profit+=profit;
            });
            const mRows = Object.entries(monthly).sort((a,b)=>a[0].localeCompare(b[0]));
            const byMgr: Record<string, { count:number; krw:number; profit:number }> = {};
            orders.forEach(o => {
              const m = o.manager || "미지정";
              const { krw, profit } = calcProfit(o);
              if (!byMgr[m]) byMgr[m] = { count:0, krw:0, profit:0 };
              byMgr[m].count++; byMgr[m].krw+=krw; byMgr[m].profit+=profit;
            });
            const mgRows = Object.entries(byMgr).sort((a,b)=>b[1].profit-a[1].profit);
            if (mRows.length===0 && mgRows.length===0) return null;
            const maxKrw = Math.max(...mRows.map(r=>r[1].krw), 1);
            const maxProfit = Math.max(...mRows.map(r=>r[1].profit), 1);
            const BAR_H = 180;
            return (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                <div style={{ background:"#fff", borderRadius:16, border:"1px solid #E2E8F0", padding:"20px 24px", boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
                    <p style={{ fontSize:17, fontWeight:600, color:"#475569" }}>월별 수주 현황</p>
                    <div style={{ display:"flex", gap:14, alignItems:"center" }}>
                      <span style={{ display:"flex", alignItems:"center", gap:5, fontSize:13, color:"#94A3B8", fontWeight:500 }}><span style={{ width:10, height:10, borderRadius:2, background:"#6366F1", display:"inline-block" }}/>수주금액</span>
                      <span style={{ display:"flex", alignItems:"center", gap:5, fontSize:13, color:"#94A3B8", fontWeight:500 }}><span style={{ width:10, height:10, borderRadius:2, background:"#10B981", display:"inline-block" }}/>순익</span>
                    </div>
                  </div>
                  <p style={{ fontSize:13, color:"#CBD5E1", fontWeight:400, marginBottom:20 }}>월별 수주금액 · 순익 비교</p>
                  {/* 막대그래프 */}
                  <div style={{ display:"flex", alignItems:"flex-end", gap: mRows.length > 3 ? 16 : 32, height:BAR_H, paddingBottom:0 }}>
                    {mRows.map(([month, s]) => (
                      <div key={month} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", height:"100%" }}>
                        {/* 수치 라벨 */}
                        <div style={{ width:"100%", display:"flex", justifyContent:"space-around", marginBottom:8 }}>
                          <span style={{ fontSize:15, color:"#6366F1", fontWeight:800, whiteSpace:"nowrap" }}>{won(s.krw)}</span>
                          <span style={{ fontSize:15, color:"#10B981", fontWeight:800, whiteSpace:"nowrap" }}>{won(s.profit)}</span>
                        </div>
                        {/* 바 영역 */}
                        <div style={{ flex:1, width:"100%", display:"flex", alignItems:"flex-end", gap:6 }}>
                          {/* 수주금액 바 */}
                          <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"flex-end", height:"100%" }}>
                            <div style={{ background:"linear-gradient(180deg,#818CF8,#6366F1)", borderRadius:"6px 6px 0 0", height:`${Math.round(s.krw/maxKrw*100)}%`, minHeight:6 }}/>
                          </div>
                          {/* 순익 바 */}
                          <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"flex-end", height:"100%" }}>
                            <div style={{ background:"linear-gradient(180deg,#34D399,#10B981)", borderRadius:"6px 6px 0 0", height:`${Math.round(s.profit/maxProfit*100)}%`, minHeight:6 }}/>
                          </div>
                        </div>
                        {/* 구분선 */}
                        <div style={{ width:"100%", height:2, background:"#E2E8F0", borderRadius:1, margin:"6px 0 8px" }}/>
                        {/* 월·건수 레이블 */}
                        <span style={{ fontSize:16, fontWeight:800, color:"#334155" }}>{month.slice(5)}월</span>
                        <span style={{ fontSize:12, color:"#fff", fontWeight:700, background:"#6366F1", borderRadius:20, padding:"2px 10px", marginTop:4 }}>{s.count}건</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ background:"#fff", borderRadius:16, border:"1px solid #E2E8F0", padding:"20px 24px", boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
                  <p style={{ fontSize:17, fontWeight:600, color:"#475569", marginBottom:4 }}>담당자별 수익 현황</p>
                  <p style={{ fontSize:13, color:"#CBD5E1", fontWeight:400, marginBottom:20 }}>수주금액 · 순익 비교</p>
                  <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
                    {mgRows.map(([mgr, s], idx) => {
                      const colors = [["#6366F1","#EEF2FF"],["#F59E0B","#FFFBEB"],["#10B981","#ECFDF5"],["#EC4899","#FDF2F8"]];
                      const [clr, bg] = colors[idx % colors.length];
                      const maxMgr = Math.max(...mgRows.map(r=>r[1].krw), 1);
                      return (
                        <div key={mgr} style={{ padding:"18px 0", borderBottom: idx<mgRows.length-1?"1px solid #F1F5F9":"none" }}>
                          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                              <div style={{ width:40, height:40, borderRadius:12, background:bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:800, color:clr, flexShrink:0 }}>{mgr[0]}</div>
                              <div>
                                <p style={{ fontSize:16, fontWeight:700, color:"#1E293B" }}>{mgr}</p>
                                <p style={{ fontSize:12, color:"#94A3B8", marginTop:2 }}>{s.count}건 수주</p>
                              </div>
                            </div>
                            <div style={{ textAlign:"right" }}>
                              <p style={{ fontSize:18, fontWeight:800, color:s.profit>=0?"#10B981":"#EF4444", letterSpacing:-0.5 }}>{(s.profit>=0?"+":"")+won(s.profit)}</p>
                              <p style={{ fontSize:12, color:"#94A3B8", marginTop:2 }}>{won(s.krw)}</p>
                            </div>
                          </div>
                          <div style={{ height:8, borderRadius:4, background:"#F1F5F9", overflow:"hidden" }}>
                            <div style={{ height:"100%", borderRadius:4, background:`linear-gradient(90deg,${clr}66,${clr})`, width:`${Math.round(s.krw/maxMgr*100)}%`, transition:"width 0.4s" }}/>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}


          {/* 주문 테이블 */}
          <div style={{ background:"#fff", border:"1px solid #E2E8F0", borderRadius:14, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
            <div style={{ padding:"16px 22px", borderBottom:"1px solid #F1F5F9", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <h2 style={{ fontSize:15, fontWeight:700, color:"#0F172A" }}>주문별 수익 현황</h2>
                <p style={{ fontSize:11, color:"#94A3B8", marginTop:2 }}>수주가 − 중국원가(×{EXCHANGE}) − 운임 = 순익</p>
              </div>
              <span style={{ fontSize:11, color:"#94A3B8", background:"#F8FAFC", padding:"3px 12px", borderRadius:20, border:"1px solid #E2E8F0" }}>{filtered.length}건</span>
            </div>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead>
                  <tr style={{ background:"#F8FAFC" }}>
                    {["고객사","제품명","담당자","상태","발주일","납기","수주가(KRW)","중국원가(CNY→KRW)","운임(KRW)","순익",""].map(h=>(
                      <th key={h} style={{ padding:"11px 14px", textAlign:"left", color:"#64748B", fontWeight:600, fontSize:11, whiteSpace:"nowrap", borderBottom:"1px solid #E2E8F0" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={11} style={{ padding:48, textAlign:"center", color:"#94A3B8" }}>불러오는 중...</td></tr>
                  ) : filtered.length===0 ? (
                    <tr><td colSpan={11} style={{ padding:48, textAlign:"center", color:"#94A3B8" }}>해당 상태의 주문이 없습니다</td></tr>
                  ) : (() => {
                    const activeRows = filtered.filter(o=>o.status!=="shipped"&&o.status!=="done");
                    const shippedRows = filtered.filter(o=>o.status==="shipped"||o.status==="done");
                    const renderRow = (o: typeof filtered[0], idx: number) => {
                    const { krw, cnyKrw, freight, profit } = calcProfit(o);
                    const st = STATUS_MAP[o.status]??STATUS_MAP.ordered;
                    const freightVal = editFreight[o.id]??String(o.freight??0);
                    const isEditing = o.id in editFreight;
                    return (
                      <tr key={o.id}
                        style={{ borderBottom:"1px solid #F1F5F9", background:idx%2===0?"#fff":"#FAFBFC", cursor:"pointer", transition:"background 0.1s" }}
                        onMouseEnter={e=>(e.currentTarget as HTMLTableRowElement).style.background="#FEF2F2"}
                        onMouseLeave={e=>(e.currentTarget as HTMLTableRowElement).style.background=idx%2===0?"#fff":"#FAFBFC"}>

                        <td style={{ padding:"13px 14px", fontWeight:700, color:"#0F172A" }} onClick={()=>router.push(`/orders/${o.id}`)}>{o.customer}</td>
                        <td style={{ padding:"13px 14px", color:"#475569" }} onClick={()=>router.push(`/orders/${o.id}`)}>{o.product_name}</td>
                        <td style={{ padding:"13px 14px" }} onClick={e=>e.stopPropagation()}>
                          <select value={o.manager||"최계화 대표"} onChange={e=>saveManager(o.id,e.target.value)}
                            style={{ background:"#F8FAFC", color:"#374151", border:"1px solid #E2E8F0", borderRadius:7, padding:"4px 8px", fontSize:12, cursor:"pointer", outline:"none", fontWeight:600 }}>
                            {MANAGERS.map(m=><option key={m} value={m}>{m}</option>)}
                          </select>
                        </td>
                        <td style={{ padding:"13px 14px" }} onClick={()=>router.push(`/orders/${o.id}`)}>
                          <span style={{ fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:20, color:st.color, background:st.bg }}>{st.label}</span>
                        </td>
                        <td style={{ padding:"9px 14px" }} onClick={e=>e.stopPropagation()}>
                          {(() => {
                            const defaultDate = o.order_date || (o.created_at ? o.created_at.slice(0,10) : "");
                            return o.id in editOrderDate ? (
                              <input type="date" value={editOrderDate[o.id]} autoFocus
                                onChange={e=>setEditOrderDate(prev=>({...prev,[o.id]:e.target.value}))}
                                onBlur={()=>saveOrderDate(o.id, editOrderDate[o.id])}
                                onKeyDown={e=>e.key==="Enter"&&saveOrderDate(o.id, editOrderDate[o.id])}
                                style={{ width:130, background:"#EFF6FF", border:"1px solid #93C5FD", borderRadius:7, padding:"5px 8px", fontSize:12, outline:"none", color:"#1E40AF" }}/>
                            ) : (
                              <div onClick={()=>setEditOrderDate(prev=>({...prev,[o.id]:defaultDate}))}
                                style={{ minWidth:80, background:"#F8FAFC", border:"1px solid #E2E8F0", borderRadius:7, padding:"5px 10px", fontSize:12, color:"#64748B", cursor:"text", userSelect:"none", fontWeight:500 }}>
                                {defaultDate}
                              </div>
                            );
                          })()}
                        </td>
                        <td style={{ padding:"13px 14px", fontSize:12, whiteSpace:"nowrap", fontWeight:600, color: o.delivery_date && new Date(o.delivery_date)<new Date() ? "#EF4444" : "#475569" }} onClick={()=>router.push(`/orders/${o.id}`)}>
                          {o.delivery_date || <span style={{ color:"#CBD5E1" }}>—</span>}
                        </td>
                        <td style={{ padding:"10px 14px" }} onClick={()=>router.push(`/orders/${o.id}`)}>
                          {krw ? (
                            <>
                              <p style={{ fontWeight:700, color:"#0F172A", fontSize:13 }}>{krw.toLocaleString()}원</p>
                              <p style={{ fontSize:10, color:"#94A3B8", marginTop:2 }}>공급가액</p>
                            </>
                          ) : <span style={{ color:"#CBD5E1" }}>—</span>}
                        </td>
                        <td style={{ padding:"13px 14px", color:"#EF4444", fontWeight:600 }} onClick={()=>router.push(`/orders/${o.id}`)}>
                          {cnyKrw ? cnyKrw.toLocaleString()+"원" : <span style={{ color:"#CBD5E1" }}>—</span>}
                        </td>
                        <td style={{ padding:"9px 14px" }} onClick={e=>e.stopPropagation()}>
                          <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                            {isEditing ? (
                              <input type="number" value={freightVal} autoFocus
                                onChange={e=>setEditFreight(prev=>({...prev,[o.id]:e.target.value}))}
                                onKeyDown={e=>e.key==="Enter"&&saveFreight(o.id)}
                                onBlur={()=>saveFreight(o.id)}
                                style={{ width:100, background:"#FEF2F2", color:"#1E293B", border:"1px solid #FCA5A5", borderRadius:7, padding:"5px 8px", fontSize:12, outline:"none" }}/>
                            ) : (
                              <div onClick={()=>setEditFreight(prev=>({...prev,[o.id]:String(o.freight??0)}))}
                                style={{ width:100, background:"#F8FAFC", border:"1px solid #E2E8F0", borderRadius:7, padding:"5px 8px", fontSize:12, color:"#1E293B", cursor:"text", userSelect:"none" }}>
                                {Number(o.freight??0).toLocaleString()}
                              </div>
                            )}
                            {isEditing&&<button onClick={()=>saveFreight(o.id)} disabled={saving===o.id} style={{ background:"#DC2626", color:"#fff", border:"none", borderRadius:6, padding:"4px 8px", fontSize:11, fontWeight:700, cursor:"pointer" }}>{saving===o.id?"…":"저장"}</button>}
                          </div>
                        </td>
                        <td style={{ padding:"13px 14px", fontWeight:800, fontSize:14, color:profit>0?"#10B981":profit<0?"#EF4444":"#94A3B8" }} onClick={()=>router.push(`/orders/${o.id}`)}>
                          {krw ? (profit>=0?"+":"")+profit.toLocaleString()+"원" : <span style={{ color:"#CBD5E1" }}>—</span>}
                        </td>
                        <td style={{ padding:"13px 10px" }} onClick={e=>e.stopPropagation()}>
                          <button onClick={()=>setDeleteTarget({id:o.id, customer:o.customer, product:o.product_name})}
                          style={{ width:24, height:24, borderRadius:6, background:"transparent", border:"none", color:"#CBD5E1", fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.15s" }}
                          onMouseEnter={e=>{e.currentTarget.style.color="#EF4444";e.currentTarget.style.background="#FEF2F2"}}
                          onMouseLeave={e=>{e.currentTarget.style.color="#CBD5E1";e.currentTarget.style.background="transparent"}}>
                            ×
                          </button>
                        </td>
                      </tr>
                    );
                    };
                    return (
                      <>
                        {activeRows.map((o,idx)=>renderRow(o,idx))}
                        {shippedRows.length > 0 && (
                          <>
                            <tr>
                              <td colSpan={11} style={{ padding:0 }}>
                                <button onClick={()=>setShowShipped(p=>!p)}
                                  style={{ width:"100%", padding:"10px 16px", background:"#F8FAFC", border:"none", borderTop:"1px solid #E2E8F0", borderBottom: showShipped?"1px solid #E2E8F0":"none", cursor:"pointer", display:"flex", alignItems:"center", gap:8, color:"#64748B", fontSize:12, fontWeight:600 }}>
                                  <span style={{ fontSize:14 }}>{showShipped?"▲":"▼"}</span>
                                  출고완료 {shippedRows.length}건 {showShipped?"접기":"펼치기"}
                                </button>
                              </td>
                            </tr>
                            {showShipped && shippedRows.map((o,idx)=>renderRow(o, activeRows.length+idx))}
                          </>
                        )}
                      </>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </div>

          <p style={{ textAlign:"center", fontSize:11, color:"#CBD5E1" }}>© 씨앤씨무역 Trading Cloud 2026</p>
        </div>
      </main>

      {/* 제품정보 카드 모달 */}
      {showCardModal && <ProductCardModal onClose={()=>setShowCardModal(false)}/>}

      {/* 삭제 확인 모달 */}
      {deleteTarget && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }}
          onClick={()=>setDeleteTarget(null)}>
          <div style={{ background:"#fff", borderRadius:16, padding:"32px 28px", maxWidth:420, width:"90%", boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }}
            onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
              <div style={{ width:44, height:44, borderRadius:12, background:"#FEF2F2", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>🗑️</div>
              <div>
                <p style={{ fontSize:16, fontWeight:800, color:"#0F172A" }}>주문 삭제</p>
                <p style={{ fontSize:12, color:"#94A3B8", marginTop:2 }}>이 작업은 되돌릴 수 없습니다</p>
              </div>
            </div>
            <div style={{ background:"#F8FAFC", borderRadius:10, padding:"14px 16px", marginBottom:20, border:"1px solid #E2E8F0" }}>
              <p style={{ fontSize:13, fontWeight:700, color:"#0F172A", marginBottom:4 }}>{deleteTarget.customer}</p>
              <p style={{ fontSize:12, color:"#64748B" }}>{deleteTarget.product}</p>
            </div>
            <p style={{ fontSize:13, color:"#475569", lineHeight:1.7, marginBottom:24 }}>
              해당 주문을 삭제하면 <strong style={{ color:"#DC2626" }}>견적서·발주서·패킹리스트 등 모든 데이터가 DB에서 완전히 삭제</strong>됩니다. 정말 삭제하시겠습니까?
            </p>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>setDeleteTarget(null)}
                style={{ flex:1, padding:"11px 0", borderRadius:10, border:"1px solid #E2E8F0", background:"#F8FAFC", color:"#475569", fontSize:14, fontWeight:600, cursor:"pointer" }}>
                취소
              </button>
              <button onClick={async()=>{
                  await fetch(`/api/orders/${deleteTarget.id}`,{method:"DELETE"});
                  setOrders(prev=>prev.filter(x=>x.id!==deleteTarget.id));
                  setDeleteTarget(null);
                }}
                style={{ flex:1, padding:"11px 0", borderRadius:10, border:"none", background:"#DC2626", color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer" }}>
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

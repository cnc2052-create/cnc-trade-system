"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Order } from "@/lib/supabase";

const EXCHANGE = 200;
const MANAGERS = ["최계화 대표", "정지훈 이사"];

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  ordered:    { label: "발주완료", color: "#3B82F6", bg: "#EFF6FF" },
  production: { label: "생산중",   color: "#F59E0B", bg: "#FFFBEB" },
  shipped:    { label: "출고완료", color: "#10B981", bg: "#ECFDF5" },
  done:       { label: "완료",     color: "#6B7280", bg: "#F9FAFB" },
};

function won(n: number) {
  if (Math.abs(n) >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억원`;
  if (Math.abs(n) >= 10_000) return `${Math.round(n / 10_000).toLocaleString()}만원`;
  return n.toLocaleString() + "원";
}

function calcProfit(o: Order) {
  const krw = Number(o.krw_price) || 0;
  const co = o.china_order_data as { items?: { unitPrice?: number; quantity?: number }[] } | null;
  const cnyCost = co?.items
    ? co.items.reduce((s, it) => s + (Number(it.unitPrice) || 0) * (Number(it.quantity) || 0), 0)
    : Number(o.unit_price || 0) * Number(o.quantity || 0);
  const cnyKrw = cnyCost * EXCHANGE;
  const freight = Number(o.freight) || 0;
  return { krw, cnyKrw, freight, profit: krw - cnyKrw - freight };
}

const QUICK_LINKS = [
  { label: "ERP",    sub: "이카운트",      icon: "🖥",  url: "https://login.ecount.com",           accent: "#2563EB" },
  { label: "홈페이지", sub: "cc009.co.kr",  icon: "🏠",  url: "https://cc009.co.kr/",              accent: "#DC2626" },
  { label: "블로그",  sub: "네이버 블로그",  icon: "📝",  url: "https://blog.naver.com/cc009",       accent: "#03C75A" },
  { label: "카페",    sub: "코스팩",        icon: "☕",  url: "https://cafe.naver.com/cospack",     accent: "#FF6B35" },
  { label: "인스타",  sub: "cnc_packaging", icon: "📸",  url: "https://instagram.com/cnc_packaging",accent: "#C13584" },
  { label: "카톡상담", sub: "채널톡",        icon: "💬",  url: "https://accounts.kakao.com/login/?continue=https%253A%252F%252Fbusiness.kakao.com%252F_PpXzd%252Fchats&lang=ko#login", accent: "#F59E0B" },
];

export default function Dashboard() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [editFreight, setEditFreight] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [navHover, setNavHover] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/orders")
      .then(r => r.json())
      .then(j => setOrders(j.data || []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const active   = orders.filter(o => o.status !== "done");
  const allProfit = orders.reduce((s, o) => s + calcProfit(o).profit, 0);
  const totalKrw  = orders.reduce((s, o) => s + (Number(o.krw_price) || 0), 0);
  const nearDeadline = active.filter(o => {
    if (!o.delivery_date) return false;
    const diff = (new Date(o.delivery_date).getTime() - Date.now()) / 86400000;
    return diff >= 0 && diff <= 7;
  }).length;

  async function saveFreight(id: string) {
    const val = Number(editFreight[id]);
    if (isNaN(val)) return;
    setSaving(id);
    await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ freight: val }),
    });
    setOrders(prev => prev.map(o => o.id === id ? { ...o, freight: val } : o));
    setSaving(null);
    setEditFreight(prev => { const n = { ...prev }; delete n[id]; return n; });
  }

  async function saveManager(id: string, manager: string) {
    await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ manager }),
    });
    setOrders(prev => prev.map(o => o.id === id ? { ...o, manager } : o));
  }

  const stats = [
    { label: "진행중 주문",  value: loading ? "—" : `${active.length}건`,  sub: "현재 처리중",        icon: "📦", accent: "#3B82F6", lightBg: "#EFF6FF" },
    { label: "총 수주금액",  value: loading ? "—" : won(totalKrw),         sub: "전체 주문 합계",      icon: "💰", accent: "#10B981", lightBg: "#ECFDF5" },
    { label: "총 예상순익",  value: loading ? "—" : won(allProfit),        sub: "수주 − 원가 − 운임",  icon: "📈", accent: allProfit >= 0 ? "#10B981" : "#EF4444", lightBg: allProfit >= 0 ? "#ECFDF5" : "#FEF2F2" },
    { label: "납기임박",     value: loading ? "—" : `${nearDeadline}건`,   sub: "7일 이내",            icon: "⏰", accent: "#F59E0B", lightBg: "#FFFBEB" },
  ];

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:"#F1F5F9", fontFamily:"'Apple SD Gothic Neo','Noto Sans KR','Segoe UI',system-ui,sans-serif", color:"#1E293B" }}>

      {/* ── 사이드바 ── */}
      <aside style={{ width:230, flexShrink:0, background:"#fff", borderRight:"1px solid #E2E8F0", display:"flex", flexDirection:"column", position:"sticky", top:0, height:"100vh", boxShadow:"2px 0 8px rgba(0,0,0,0.04)" }}>
        {/* 로고 */}
        <div style={{ padding:"24px 20px 20px", borderBottom:"1px solid #F1F5F9" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:38, height:38, borderRadius:10, background:"linear-gradient(135deg,#DC2626,#991B1B)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:800, color:"#fff", letterSpacing:0.5, boxShadow:"0 4px 12px rgba(220,38,38,0.3)" }}>C&C</div>
            <div>
              <p style={{ fontSize:15, fontWeight:800, color:"#0F172A", letterSpacing:-0.3 }}>씨앤씨무역</p>
              <p style={{ fontSize:10, color:"#DC2626", letterSpacing:2, marginTop:1, fontWeight:600 }}>TRADING CLOUD</p>
            </div>
          </div>
        </div>

        {/* 네비 */}
        <nav style={{ flex:1, padding:"12px 10px", display:"flex", flexDirection:"column", gap:2 }}>
          {[
            { icon:"⬛", label:"대시보드",   href:"/",            active:true },
            { icon:"＋", label:"새 주문 등록", href:"/orders/new", active:false },
          ].map(item => (
            <button key={item.href}
              onClick={() => router.push(item.href)}
              onMouseEnter={() => setNavHover(item.href)}
              onMouseLeave={() => setNavHover(null)}
              style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", borderRadius:10, border:"none", cursor:"pointer", fontSize:14, fontWeight:600, textAlign:"left", transition:"all 0.15s",
                background: item.active ? "#FEF2F2" : navHover === item.href ? "#F8FAFC" : "transparent",
                color: item.active ? "#DC2626" : navHover === item.href ? "#334155" : "#64748B",
              }}>
              <span style={{ fontSize:15 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* 환율 */}
        <div style={{ margin:"0 10px 16px", padding:"14px 16px", background:"#FEF2F2", borderRadius:12 }}>
          <p style={{ fontSize:11, color:"#EF4444", fontWeight:600, marginBottom:4 }}>📊 적용 환율</p>
          <p style={{ fontSize:18, fontWeight:800, color:"#DC2626" }}>1 CNY = {EXCHANGE}원</p>
        </div>
      </aside>

      {/* ── 메인 ── */}
      <main style={{ flex:1, overflow:"auto" }}>

        {/* 헤더 */}
        <header style={{ background:"#fff", borderBottom:"1px solid #E2E8F0", padding:"0 32px", height:64, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:10, boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
          <div>
            <h1 style={{ fontSize:18, fontWeight:700, color:"#0F172A" }}>대시보드</h1>
            <p style={{ fontSize:12, color:"#94A3B8", marginTop:1 }}>씨앤씨무역 수주 현황 · 오늘 {new Date().toLocaleDateString("ko-KR")}</p>
          </div>
          <button onClick={() => router.push("/orders/new")}
            style={{ background:"linear-gradient(135deg,#DC2626,#991B1B)", color:"#fff", border:"none", padding:"10px 22px", borderRadius:10, fontSize:13, fontWeight:700, cursor:"pointer", boxShadow:"0 4px 12px rgba(220,38,38,0.3)" }}>
            + 새 주문 등록
          </button>
        </header>

        <div style={{ padding:"28px 32px", display:"flex", flexDirection:"column", gap:24 }}>

          {/* 통계 카드 */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16 }}>
            {stats.map(s => (
              <div key={s.label} style={{ background:"#fff", border:"1px solid #E2E8F0", borderRadius:16, padding:"20px 22px", boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
                  <p style={{ fontSize:13, color:"#64748B", fontWeight:500 }}>{s.label}</p>
                  <div style={{ width:40, height:40, borderRadius:10, background:s.lightBg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>{s.icon}</div>
                </div>
                <p style={{ fontSize:26, fontWeight:800, color:s.accent, letterSpacing:-1 }}>{s.value}</p>
                <p style={{ fontSize:11, color:"#94A3B8", marginTop:6 }}>{s.sub}</p>
              </div>
            ))}
          </div>

          {/* 바로가기 */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:12 }}>
            {QUICK_LINKS.map(link => (
              <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer"
                style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:8, padding:"18px 10px", background:"#fff", border:"1px solid #E2E8F0", borderRadius:14, textDecoration:"none", boxShadow:"0 1px 4px rgba(0,0,0,0.05)", transition:"all 0.15s" }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.borderColor=link.accent; el.style.boxShadow=`0 4px 16px ${link.accent}22`; el.style.transform="translateY(-2px)"; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.borderColor="#E2E8F0"; el.style.boxShadow="0 1px 4px rgba(0,0,0,0.05)"; el.style.transform="none"; }}>
                <span style={{ fontSize:28 }}>{link.icon}</span>
                <div style={{ textAlign:"center" }}>
                  <p style={{ fontSize:13, fontWeight:700, color:"#1E293B" }}>{link.label}</p>
                  <p style={{ fontSize:11, color:"#94A3B8", marginTop:2 }}>{link.sub}</p>
                </div>
              </a>
            ))}
          </div>

          {/* 주문 수익 테이블 */}
          <div style={{ background:"#fff", border:"1px solid #E2E8F0", borderRadius:16, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
            <div style={{ padding:"20px 24px", borderBottom:"1px solid #F1F5F9", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <h2 style={{ fontSize:16, fontWeight:700, color:"#0F172A" }}>주문별 수익 현황</h2>
                <p style={{ fontSize:12, color:"#94A3B8", marginTop:3 }}>수주가 − 중국원가(×{EXCHANGE}) − 운임 = 순익</p>
              </div>
              <span style={{ fontSize:12, color:"#94A3B8", background:"#F8FAFC", padding:"4px 12px", borderRadius:20, border:"1px solid #E2E8F0" }}>{orders.length}건</span>
            </div>

            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead>
                  <tr style={{ background:"#F8FAFC" }}>
                    {["고객사","제품명","담당자","상태","수주가 (KRW)","중국원가 (CNY→KRW)","운임 (KRW)","순익"].map(h => (
                      <th key={h} style={{ padding:"12px 16px", textAlign:"left", color:"#64748B", fontWeight:600, fontSize:11, whiteSpace:"nowrap", borderBottom:"1px solid #E2E8F0" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={8} style={{ padding:48, textAlign:"center", color:"#94A3B8" }}>불러오는 중...</td></tr>
                  ) : orders.length === 0 ? (
                    <tr><td colSpan={8} style={{ padding:48, textAlign:"center", color:"#94A3B8" }}>등록된 주문이 없습니다</td></tr>
                  ) : orders.map((o, idx) => {
                    const { krw, cnyKrw, freight, profit } = calcProfit(o);
                    const st = STATUS_MAP[o.status] ?? STATUS_MAP.ordered;
                    const freightVal = editFreight[o.id] ?? String(o.freight ?? 0);
                    const isEditing  = o.id in editFreight;
                    return (
                      <tr key={o.id}
                        style={{ borderBottom:"1px solid #F1F5F9", background: idx % 2 === 0 ? "#fff" : "#FAFBFC", cursor:"pointer", transition:"background 0.1s" }}
                        onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background="#FEF2F2"}
                        onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background=idx%2===0?"#fff":"#FAFBFC"}>

                        <td style={{ padding:"14px 16px", fontWeight:700, color:"#0F172A" }} onClick={() => router.push(`/orders/${o.id}`)}>
                          {o.customer}
                        </td>
                        <td style={{ padding:"14px 16px", color:"#475569" }} onClick={() => router.push(`/orders/${o.id}`)}>
                          {o.product_name}
                        </td>
                        <td style={{ padding:"14px 16px" }} onClick={e => e.stopPropagation()}>
                          <select value={o.manager || "최계화 대표"} onChange={e => saveManager(o.id, e.target.value)}
                            style={{ background:"#F8FAFC", color:"#374151", border:"1px solid #E2E8F0", borderRadius:8, padding:"5px 10px", fontSize:12, cursor:"pointer", outline:"none", fontWeight:600 }}>
                            {MANAGERS.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                        </td>
                        <td style={{ padding:"14px 16px" }} onClick={() => router.push(`/orders/${o.id}`)}>
                          <span style={{ fontSize:11, fontWeight:700, padding:"4px 12px", borderRadius:20, color:st.color, background:st.bg }}>
                            {st.label}
                          </span>
                        </td>
                        <td style={{ padding:"14px 16px", fontWeight:700, color:"#0F172A" }} onClick={() => router.push(`/orders/${o.id}`)}>
                          {krw ? krw.toLocaleString()+"원" : <span style={{ color:"#CBD5E1" }}>미입력</span>}
                        </td>
                        <td style={{ padding:"14px 16px", color:"#EF4444", fontWeight:600 }} onClick={() => router.push(`/orders/${o.id}`)}>
                          {cnyKrw ? cnyKrw.toLocaleString()+"원" : <span style={{ color:"#CBD5E1" }}>—</span>}
                        </td>
                        <td style={{ padding:"10px 16px" }} onClick={e => e.stopPropagation()}>
                          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                            <input type="number" value={freightVal}
                              onChange={e => setEditFreight(prev => ({ ...prev, [o.id]: e.target.value }))}
                              onFocus={() => setEditFreight(prev => ({ ...prev, [o.id]: String(o.freight ?? 0) }))}
                              onKeyDown={e => e.key === "Enter" && saveFreight(o.id)}
                              style={{ width:90, background:isEditing?"#FEF2F2":"#F8FAFC", color:"#1E293B", border:`1px solid ${isEditing?"#FCA5A5":"#E2E8F0"}`, borderRadius:8, padding:"5px 8px", fontSize:12, outline:"none" }}
                            />
                            {isEditing && (
                              <button onClick={() => saveFreight(o.id)} disabled={saving===o.id}
                                style={{ background:"#DC2626", color:"#fff", border:"none", borderRadius:6, padding:"5px 10px", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                                {saving===o.id ? "…" : "저장"}
                              </button>
                            )}
                          </div>
                        </td>
                        <td style={{ padding:"14px 16px", fontWeight:800, fontSize:14, color: profit>0?"#10B981":profit<0?"#EF4444":"#94A3B8" }} onClick={() => router.push(`/orders/${o.id}`)}>
                          {krw ? (profit>=0?"+":"")+profit.toLocaleString()+"원" : <span style={{ color:"#CBD5E1" }}>—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <p style={{ textAlign:"center", fontSize:12, color:"#CBD5E1", paddingBottom:8 }}>© 씨앤씨무역 Trading Cloud 2026</p>
        </div>
      </main>
    </div>
  );
}

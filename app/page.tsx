"use client";

import { useState, useRef, useCallback } from "react";
import { CustomerQuote, MarkingEntry } from "@/types";

/* ── 스피너 ── */
function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className="animate-spin">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.2" />
      <path d="M8 2a6 6 0 016 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/* ── 업로드 아이콘 ── */
function IcoUp() {
  return (
    <svg width="22" height="22" viewBox="0 0 18 18" fill="none">
      <path d="M9 12V4M9 4L6.5 6.5M9 4L11.5 6.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3 13.5v1.5a1 1 0 001 1h10a1 1 0 001-1v-1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

/* ── 다운로드 아이콘 ── */
function IcoDl() {
  return (
    <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
      <path d="M7 1v8M7 9L4.5 6.5M7 9L9.5 6.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M1.5 11.5h11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

/* ── 업로드존 ── */
function UploadZone({ hint, preview, uploading, error, onFile }: {
  hint: string; preview: string | null; uploading: boolean; error: string | null;
  onFile: (f: File) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f?.type.startsWith("image/")) onFile(f);
  }, [onFile]);

  if (uploading) return (
    <div className="h-44 rounded-xl border border-gray-100 bg-gray-50 flex flex-col items-center justify-center gap-3">
      {preview && <img src={preview} className="h-20 object-contain opacity-20 rounded" alt="" />}
      <div className="flex items-center gap-2 text-[15px] text-gray-400"><Spinner size={16} /> AI가 정보를 추출 중...</div>
    </div>
  );

  return (
    <label
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
      className={`flex flex-col items-center justify-center gap-3 h-44 rounded-xl border-[1.5px] border-dashed cursor-pointer transition-all
        ${drag ? "border-gray-400 bg-gray-50" : "border-gray-200 bg-gray-50/40 hover:border-gray-300 hover:bg-gray-50"}`}
    >
      <input ref={ref} type="file" accept="image/*" className="sr-only"
        onChange={e => { if (e.target.files?.[0]) onFile(e.target.files[0]); }} />
      <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-400"><IcoUp /></div>
      <div className="text-center">
        <p className="text-[15px] font-medium text-gray-600">클릭하거나 드래그하여 업로드</p>
        <p className="text-[13px] text-gray-400 mt-1">{hint}</p>
      </div>
      {error && <p className="text-[13px] text-red-500 mt-1">{error}</p>}
    </label>
  );
}

/* ── 문서 출력 버튼 ── */
function DocBtn({ label, sublabel, ext, loading, disabled, onClick }: {
  label: string; sublabel?: string; ext: string; loading: boolean; disabled: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick} disabled={disabled || loading}
      className="flex items-center gap-2.5 h-11 px-5 rounded-xl bg-zinc-900 hover:bg-zinc-700 text-white text-[14px] font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.97] whitespace-nowrap">
      {loading ? <Spinner size={15} /> : <IcoDl />}
      <span>{label}</span>
      {sublabel && <span className="text-[11px] text-white/50">{sublabel}</span>}
      <span className="text-[10px] bg-white/15 rounded px-1.5 py-0.5 font-bold tracking-wider">{ext}</span>
    </button>
  );
}

/* ── 스텝 헤더 ── */
function StepHeader({ no, color, title, sub }: { no: number; color: string; title: string; sub: string }) {
  const colors: Record<string, string> = {
    blue: "text-blue-500 bg-blue-50",
    orange: "text-orange-500 bg-orange-50",
    violet: "text-violet-500 bg-violet-50",
    teal: "text-teal-600 bg-teal-50",
    green: "text-green-600 bg-green-50",
  };
  return (
    <div className="flex items-start gap-3 mb-5">
      <span className={`shrink-0 mt-0.5 text-[11px] font-bold rounded-md px-2.5 py-1 ${colors[color]}`}>STEP {no}</span>
      <div>
        <h2 className="text-[18px] font-semibold text-gray-900">{title}</h2>
        <p className="text-[13px] text-gray-400 mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

/* ════════════════════════════════ MAIN ════════════════════════════════ */
export default function Page() {
  const [quote, setQuote] = useState<CustomerQuote | null>(null);
  const [quotePreview, setQuotePreview] = useState<string | null>(null);
  const [quoteUploading, setQuoteUploading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // markings: 부품 flat 배열 (itemNo 로 제품 연결, 1제품 N부품)
  const [markings, setMarkings] = useState<MarkingEntry[]>([]);
  // 패킹리스트용 부품별 단가 (idx → 단가)
  const [packingPrices, setPackingPrices] = useState<Record<number, string>>({});

  const [loading, setLoading] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  /* 견적서 업로드 */
  async function handleQuoteFile(file: File) {
    setQuoteError(null); setQuoteUploading(true);
    setQuotePreview(URL.createObjectURL(file));
    try {
      const fd = new FormData(); fd.append("image", file);
      const res = await fetch("/api/ocr-quote", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setQuote(json.data as CustomerQuote);
      setMarkings([]);
      setPackingPrices({});
    } catch (e) { setQuoteError(e instanceof Error ? e.message : "오류"); setQuotePreview(null); }
    finally { setQuoteUploading(false); }
  }

  /* 부품 추가 */
  function addPart(item: CustomerQuote["items"][0]) {
    setMarkings(prev => [...prev, {
      itemNo: item.no,
      productName: item.productName,
      markingName: "",
      postProcess: item.postProcess || "",
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      amount: item.amount,
      deliveryDate: item.deliveryDate || quote?.deliveryDate || "",
    }]);
  }

  /* 부품 삭제 */
  function removePart(idx: number) {
    setMarkings(prev => prev.filter((_, i) => i !== idx));
    setPackingPrices(prev => {
      const next = { ...prev };
      delete next[idx];
      return next;
    });
  }

  /* 마킹명 업데이트 */
  function updateMarkingName(idx: number, val: string) {
    setMarkings(prev => prev.map((m, i) => i !== idx ? m : { ...m, markingName: val }));
  }

  /* 다운로드 공통 */
  async function download(type: string, fetchFn: () => Promise<Response>, filename: string, isHtml = false) {
    setLoading(type); setGlobalError(null);
    try {
      const res = await fetchFn();
      if (!res.ok) { const j = await res.json(); throw new Error(j.error); }
      if (isHtml) {
        const html = await res.text();
        const win = window.open("", "_blank");
        if (win) { win.document.write(html); win.document.close(); }
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { setGlobalError(e instanceof Error ? e.message : "오류"); }
    finally { setLoading(null); }
  }

  const hasMarkings = markings.length > 0 && markings.every(m => m.markingName.trim());
  const json = (body: object) => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

  /* 패킹리스트용 마킹 (단가 반영) */
  function markingsWithPrice(): MarkingEntry[] {
    return markings.map((m, i) => ({
      ...m,
      partUnitPrice: packingPrices[i] ? parseFloat(packingPrices[i]) : undefined,
    }));
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* 네비 */}
      <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center">
            <span className="text-white text-[10px] font-bold">C&C</span>
          </div>
          <span className="text-[16px] font-semibold tracking-tight">씨앤씨무역</span>
          <span className="ml-2 text-[13px] text-gray-400">Trading Cloud</span>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-5">

        {/* 전역 오류 */}
        {globalError && (
          <div className="flex items-center gap-3 px-5 py-4 bg-red-50 border border-red-100 rounded-xl text-[14px] text-red-600">
            <span>⚠</span><span className="flex-1">{globalError}</span>
            <button onClick={() => setGlobalError(null)} className="text-xl text-red-300 hover:text-red-500">×</button>
          </div>
        )}

        {/* ── STEP 1: 견적서 업로드 ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-6">
          <div className="flex items-start justify-between">
            <StepHeader no={1} color="blue" title="고객 발주 견적서 업로드"
              sub="AI가 제품명 · 후가공 · 납기 · 단가를 자동 추출합니다" />
            {quote && (
              <button onClick={() => { setQuote(null); setMarkings([]); setPackingPrices({}); setQuotePreview(null); }}
                className="text-[13px] text-gray-400 hover:text-gray-700 font-medium shrink-0">재업로드</button>
            )}
          </div>

          {!quote ? (
            <UploadZone hint="고객사 발주 견적서 이미지 (PNG · JPG)"
              preview={quotePreview} uploading={quoteUploading} error={quoteError} onFile={handleQuoteFile} />
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-[12px] text-gray-400 mb-1">견적번호</p>
                  <p className="text-[15px] font-semibold text-gray-900">{quote.quoteNo}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-[12px] text-gray-400 mb-1">고객사</p>
                  <p className="text-[15px] font-semibold text-gray-900">{quote.customer}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-[12px] text-gray-400 mb-1">납기</p>
                  <input type="date" value={quote.deliveryDate || ""}
                    onChange={e => setQuote({ ...quote, deliveryDate: e.target.value })}
                    className="w-full text-[15px] font-semibold text-gray-900 bg-transparent border-none outline-none cursor-pointer" />
                </div>
              </div>
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                <table className="w-full text-[14px]">
                  <thead className="bg-gray-50">
                    <tr>
                      {["No", "제품명", "후가공", "수량", "단가", "납기"].map(h => (
                        <th key={h} className="px-4 py-3 text-left font-semibold text-gray-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {quote.items.map((item, i) => (
                      <tr key={i} className="border-t border-gray-50">
                        <td className="px-4 py-3 text-gray-400">{item.no}</td>
                        <td className="px-4 py-3 font-semibold text-gray-800">{item.productName}</td>
                        <td className="px-4 py-3 text-gray-600">{item.postProcess || "-"}</td>
                        <td className="px-4 py-3 text-gray-700">{item.quantity.toLocaleString()} {item.unit}</td>
                        <td className="px-4 py-3 text-gray-700">{item.unitPrice.toLocaleString()}</td>
                        <td className="px-4 py-3 text-gray-500">{item.deliveryDate || quote.deliveryDate || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ── STEP 2: 중국발주서 ── */}
        {quote && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-6">
            <StepHeader no={2} color="orange" title="중국발주서"
              sub="공장 전달용 · 중국어 A4 · 새 탭에서 바로 인쇄 / 위챗 캡처" />
            <div className="flex items-center justify-between p-5 rounded-xl bg-zinc-50 border border-zinc-100">
              <div>
                <p className="text-[15px] font-semibold text-gray-900">C&C 订货单</p>
                <p className="text-[13px] text-gray-400 mt-1">
                  제품명 · 후가공 · 수량 · 단가 · 납기 · 30%/70% 금액 자동 계산
                </p>
              </div>
              <DocBtn label="발주서 열기" ext="HTML"
                loading={loading === "china-order"} disabled={!!loading}
                onClick={() => download("china-order",
                  () => fetch("/api/generate-china-order", json({ quote, markings })),
                  "", true
                )} />
            </div>
          </div>
        )}

        {/* ── STEP 3: 마킹 ── */}
        {quote && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-6">
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className="shrink-0 text-[11px] font-bold text-violet-500 bg-violet-50 rounded-md px-2.5 py-1">STEP 3</span>
                  <h2 className="text-[18px] font-semibold text-gray-900">마킹</h2>
                </div>
                <p className="text-[13px] text-gray-400 ml-16">공장 출고용 · 용기별 부품을 추가하고 마킹명을 입력하세요</p>
              </div>
              {hasMarkings && (
                <DocBtn label="마킹 다운로드" ext="Excel"
                  loading={loading === "marking"} disabled={!!loading}
                  onClick={() => download("marking",
                    () => fetch("/api/generate-marking", json({ quote, markings })),
                    `마킹_${quote.quoteNo}.xlsx`
                  )} />
              )}
            </div>

            <div className="space-y-3">
              {quote.items.map((item) => {
                const parts = markings.filter(m => m.itemNo === item.no);
                return (
                  <div key={item.no} className="rounded-xl border border-gray-100 overflow-hidden">
                    {/* 제품 헤더 */}
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        <span className="text-[12px] font-bold text-gray-400">#{item.no}</span>
                        <span className="text-[15px] font-semibold text-gray-800">{item.productName}</span>
                        <span className="text-[13px] text-gray-400">{item.quantity.toLocaleString()} {item.unit}</span>
                      </div>
                      <button
                        onClick={() => addPart(item)}
                        className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-700 text-white text-[13px] font-medium transition-all"
                      >
                        <span className="text-base leading-none">+</span> 부품 추가
                      </button>
                    </div>
                    {/* 부품 목록 */}
                    {parts.length === 0 ? (
                      <p className="px-4 py-4 text-[13px] text-gray-300 text-center">
                        부품을 추가하세요 (Bottle, Cap, Pump 등)
                      </p>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {parts.map((m) => {
                          const idx = markings.indexOf(m);
                          return (
                            <div key={idx} className="flex items-center gap-3 px-4 py-3">
                              <span className="text-[13px] text-gray-300 w-5 text-center shrink-0">
                                {parts.indexOf(m) + 1}
                              </span>
                              <input
                                type="text"
                                value={m.markingName}
                                onChange={e => updateMarkingName(idx, e.target.value)}
                                placeholder="마킹 제품명 (예: 크림용기 캡)"
                                className="flex-1 h-9 px-3 rounded-lg border border-gray-200 text-[14px] text-gray-900 bg-white focus:outline-none focus:border-gray-400 transition-colors placeholder:text-gray-300"
                              />
                              <button
                                onClick={() => removePart(idx)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-all text-xl shrink-0"
                              >×</button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── STEP 4: 패킹리스트 ── */}
        {hasMarkings && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-6">
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className="shrink-0 text-[11px] font-bold text-teal-600 bg-teal-50 rounded-md px-2.5 py-1">STEP 4</span>
                  <h2 className="text-[18px] font-semibold text-gray-900">패킹리스트</h2>
                </div>
                <p className="text-[13px] text-gray-400 ml-16">포워딩용 · 부품별 단가 입력 후 다운로드 (미입력 시 USD 0.100)</p>
              </div>
              <DocBtn label="패킹리스트" ext="Excel"
                loading={loading === "packing"} disabled={!!loading}
                onClick={() => download("packing",
                  () => fetch("/api/generate-marking", json({ quote, markings: markingsWithPrice() })),
                  `PackingList_${quote?.quoteNo}.xlsx`
                )} />
            </div>

            <div className="space-y-2">
              {markings.map((m, i) => {
                const priceVal = packingPrices[i] || "";
                const usd = priceVal ? (parseFloat(priceVal) / 7).toFixed(3) : "0.100";
                return (
                  <div key={i} className="flex items-center gap-4 px-4 py-3 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-gray-800 truncate">{m.markingName}</p>
                      <p className="text-[12px] text-gray-400">{m.productName} · {m.quantity.toLocaleString()} {m.unit}</p>
                    </div>
                    <div className="w-36 shrink-0">
                      <label className="text-[11px] font-semibold text-gray-400 mb-1 block">단가 입력 (￥)</label>
                      <input
                        type="number"
                        value={priceVal}
                        onChange={e => setPackingPrices(prev => ({ ...prev, [i]: e.target.value }))}
                        placeholder="예: 3.5"
                        className="w-full h-9 px-3 rounded-lg border border-gray-200 text-[14px] text-gray-900 bg-white focus:outline-none focus:border-gray-400 transition-colors placeholder:text-gray-300"
                      />
                    </div>
                    <div className="text-right w-24 shrink-0">
                      <p className="text-[11px] text-gray-400 mb-0.5">USD</p>
                      <p className="text-[16px] font-semibold text-gray-900">{usd}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── STEP 5: 입고명세서 ── */}
        {hasMarkings && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-6">
            <div className="flex items-center justify-between">
              <StepHeader no={5} color="green" title="입고명세서"
                sub="고객사 전달용 · 마킹별 수량 기준 자동 생성" />
              <DocBtn label="입고명세서" ext="Excel"
                loading={loading === "receipt"} disabled={!!loading}
                onClick={() => download("receipt",
                  () => fetch("/api/generate-docs", json({ docType: "receipt", quote, markings })),
                  `입고명세서_${quote?.quoteNo}.xlsx`
                )} />
            </div>
          </div>
        )}

      </main>

      <footer className="border-t border-gray-100 mt-8">
        <div className="max-w-4xl mx-auto px-6 py-5 flex justify-between">
          <span className="text-[13px] text-gray-400">씨앤씨무역 Trading Cloud</span>
          <span className="text-[13px] text-gray-300">Powered by GPT-4o Vision</span>
        </div>
      </footer>
    </div>
  );
}

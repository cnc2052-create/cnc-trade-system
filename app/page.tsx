"use client";

import { useState, useRef, useCallback } from "react";
import { CustomerQuote, MarkingEntry } from "@/types";
import { FactoryShipment } from "@/lib/packing-generator";

/* ── icons ── */
function Spinner({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className="animate-spin">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.2" />
      <path d="M8 2a6 6 0 016 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function IcoUp() {
  return <svg width="22" height="22" viewBox="0 0 18 18" fill="none"><path d="M9 12V4M9 4L6.5 6.5M9 4L11.5 6.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 13.5v1.5a1 1 0 001 1h10a1 1 0 001-1v-1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>;
}
function IcoDl() {
  return <svg width="16" height="16" viewBox="0 0 14 14" fill="none"><path d="M7 1v8M7 9L4.5 6.5M7 9L9.5 6.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M1.5 11.5h11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>;
}

/* ── 공용 업로드존 ── */
function UploadZone({
  hint, preview, uploading, error, onFile,
}: {
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
      {error && <p className="text-[13px] text-red-500">{error}</p>}
    </label>
  );
}

/* ── 다운로드 버튼 ── */
function DlBtn({ label, ext, loading, disabled, onClick }: {
  label: string; ext: string; loading: boolean; disabled: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick} disabled={disabled || loading}
      className="flex items-center gap-2 h-10 px-5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-[14px] font-medium transition-all disabled:opacity-35 disabled:cursor-not-allowed active:scale-[0.97]">
      {loading ? <Spinner size={15} /> : <IcoDl />}
      {label}
      <span className="text-[10px] bg-white/15 rounded px-1.5 py-0.5 font-bold tracking-wider">{ext}</span>
    </button>
  );
}

/* ── 입력 필드 ── */
function Field({ label, value, onChange, placeholder, type = "text", small = false }: {
  label: string; value: string | number; onChange: (v: string) => void;
  placeholder?: string; type?: string; small?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className={`${small ? "h-9 text-[14px]" : "h-10 text-[15px]"} px-3 rounded-lg border border-gray-200 text-gray-900 bg-white focus:outline-none focus:border-gray-400 transition-colors placeholder:text-gray-300`} />
    </div>
  );
}

/* ═══════════════════════════════════════════════ MAIN ═══════════════════════════════════════════════ */
export default function Page() {
  /* ── 탭 ── */
  const [tab, setTab] = useState<"order" | "shipment">("order");

  /* ── 워크플로우 A: 수주 ── */
  const [quote, setQuote] = useState<CustomerQuote | null>(null);
  const [quotePreview, setQuotePreview] = useState<string | null>(null);
  const [quoteUploading, setQuoteUploading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [markings, setMarkings] = useState<MarkingEntry[]>([]);
  const [dlA, setDlA] = useState<string | null>(null);

  /* ── 워크플로우 B: 출고 ── */
  const [shipment, setShipment] = useState<FactoryShipment | null>(null);
  const [shipPreview, setShipPreview] = useState<string | null>(null);
  const [shipUploading, setShipUploading] = useState(false);
  const [shipError, setShipError] = useState<string | null>(null);
  const [dlB, setDlB] = useState<string | null>(null);

  const [globalError, setGlobalError] = useState<string | null>(null);

  /* ── 유틸 ── */
  const hasMarkingNames = markings.length > 0 && markings.every(m => m.markingName.trim());

  /* ── 견적서 업로드 ── */
  async function handleQuoteFile(file: File) {
    setQuoteError(null); setQuoteUploading(true);
    setQuotePreview(URL.createObjectURL(file));
    try {
      const fd = new FormData(); fd.append("image", file);
      const res = await fetch("/api/ocr-quote", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      const q: CustomerQuote = json.data;
      setQuote(q);
      setMarkings(q.items.map(item => ({
        itemNo: item.no, productName: item.productName,
        markingName: "", postProcess: item.postProcess || "",
        quantity: item.quantity, unit: item.unit,
        unitPrice: item.unitPrice, amount: item.amount,
        deliveryDate: item.deliveryDate || q.deliveryDate || "",
      })));
    } catch (e) { setQuoteError(e instanceof Error ? e.message : "오류"); setQuotePreview(null); }
    finally { setQuoteUploading(false); }
  }

  /* ── 공장 이미지 업로드 ── */
  async function handleShipFile(file: File) {
    setShipError(null); setShipUploading(true);
    setShipPreview(URL.createObjectURL(file));
    try {
      const fd = new FormData(); fd.append("image", file);
      const res = await fetch("/api/ocr-factory", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setShipment(json.data);
    } catch (e) { setShipError(e instanceof Error ? e.message : "오류"); setShipPreview(null); }
    finally { setShipUploading(false); }
  }

  /* ── 마킹 필드 업데이트 ── */
  function updateMarking(idx: number, field: keyof MarkingEntry, val: string) {
    setMarkings(prev => prev.map((m, i) => i !== idx ? m : { ...m, [field]: val }));
  }

  /* ── A 다운로드 ── */
  async function downloadA(type: "china-order" | "marking" | "receipt") {
    if (!quote) return;
    setDlA(type); setGlobalError(null);
    try {
      let res: Response;
      if (type === "china-order") {
        res = await fetch("/api/generate-china-order", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quote, markings }),
        });
        if (!res.ok) { const j = await res.json(); throw new Error(j.error); }
        const html = await res.text();
        const win = window.open("", "_blank");
        if (win) { win.document.write(html); win.document.close(); }
        return;
      }
      if (type === "marking") {
        res = await fetch("/api/generate-marking", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quote, markings }),
        });
      } else {
        res = await fetch("/api/generate-docs", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ docType: "receipt", quote, markings }),
        });
      }
      if (!res.ok) { const j = await res.json(); throw new Error(j.error); }
      const blob = await res.blob();
      const disp = res.headers.get("Content-Disposition") || "";
      const match = disp.match(/filename\*=UTF-8''(.+)/);
      const fname = match ? decodeURIComponent(match[1]) : `${type}.xlsx`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = fname; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { setGlobalError(e instanceof Error ? e.message : "다운로드 오류"); }
    finally { setDlA(null); }
  }

  /* ── B 다운로드 ── */
  async function downloadPacking() {
    if (!shipment) return;
    setDlB("packing"); setGlobalError(null);
    try {
      const res = await fetch("/api/generate-packing", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shipment }),
      });
      if (!res.ok) { const j = await res.json(); throw new Error(j.error); }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `PackingList_${shipment.shipDate}.xlsx`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { setGlobalError(e instanceof Error ? e.message : "다운로드 오류"); }
    finally { setDlB(null); }
  }

  /* ── 단가 업데이트 (출고) ── */
  function updateShipmentPrice(idx: number, val: string) {
    if (!shipment) return;
    const items = shipment.items.map((item, i) =>
      i !== idx ? item : { ...item, unitPriceKrw: parseFloat(val) || undefined }
    );
    setShipment({ ...shipment, items });
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* nav */}
      <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center gap-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">C&C</span>
            </div>
            <span className="text-[16px] font-semibold tracking-tight">씨앤씨무역</span>
          </div>
          <div className="flex items-center gap-1 ml-4 bg-gray-100 rounded-lg p-1">
            {([["order", "수주 처리"], ["shipment", "출고 처리"]] as const).map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)}
                className={`h-8 px-5 rounded-md text-[14px] font-medium transition-all ${tab === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* global error */}
        {globalError && (
          <div className="mb-6 flex items-center gap-3 px-5 py-4 bg-red-50 border border-red-100 rounded-xl text-[14px] text-red-600">
            <span>⚠</span><span className="flex-1">{globalError}</span>
            <button onClick={() => setGlobalError(null)} className="text-red-300 hover:text-red-500 text-xl">×</button>
          </div>
        )}

        {/* ═══════════════ 워크플로우 A: 수주 처리 ═══════════════ */}
        {tab === "order" && (
          <div className="space-y-5">
            {/* A-1: 견적서 업로드 */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <div className="flex items-center gap-2.5 mb-1">
                    <span className="text-[12px] font-bold text-blue-500 bg-blue-50 rounded-md px-2.5 py-1">STEP 1</span>
                    <h2 className="text-[18px] font-semibold text-gray-900">고객 발주 견적서 업로드</h2>
                  </div>
                  <p className="text-[14px] text-gray-400 ml-16">AI가 제품명 · 후가공 · 납기 · 단가를 자동 추출합니다</p>
                </div>
                {quote && (
                  <button onClick={() => { setQuote(null); setMarkings([]); setQuotePreview(null); }}
                    className="text-[14px] text-gray-400 hover:text-gray-700 font-medium">재업로드</button>
                )}
              </div>

              {!quote ? (
                <UploadZone hint="고객사 발주 견적서 이미지 (PNG · JPG)" preview={quotePreview}
                  uploading={quoteUploading} error={quoteError} onFile={handleQuoteFile} />
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    {[{ l: "견적번호", v: quote.quoteNo }, { l: "고객사", v: quote.customer }, { l: "납기", v: quote.deliveryDate || "-" }].map(({ l, v }) => (
                      <div key={l} className="bg-gray-50 rounded-xl p-4">
                        <p className="text-[13px] text-gray-400 mb-1">{l}</p>
                        <p className="text-[15px] font-semibold text-gray-900 truncate">{v}</p>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-xl border border-gray-100 overflow-hidden">
                    <table className="w-full text-[14px]">
                      <thead className="bg-gray-50">
                        <tr>{["No", "제품명", "후가공", "수량", "단가", "납기"].map(h => (
                          <th key={h} className="px-4 py-3 text-left font-semibold text-gray-500">{h}</th>
                        ))}</tr>
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

            {/* A-2: 마킹 제품명 입력 */}
            {quote && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-6">
                <div className="flex items-center gap-2.5 mb-5">
                  <span className="text-[12px] font-bold text-orange-500 bg-orange-50 rounded-md px-2.5 py-1">STEP 2</span>
                  <h2 className="text-[18px] font-semibold text-gray-900">마킹 제품명 입력</h2>
                  <p className="text-[14px] text-gray-400">발주서에 표기될 마킹명을 품목별로 입력</p>
                </div>
                <div className="space-y-3">
                  {markings.map((m, i) => (
                    <div key={i} className="grid grid-cols-[1fr_1.2fr_1fr_1fr] gap-4 items-end p-4 rounded-xl bg-gray-50/60 border border-gray-100">
                      <div>
                        <p className="text-[12px] font-semibold text-gray-400 mb-1.5">원 제품명</p>
                        <p className="text-[15px] font-semibold text-gray-700 truncate">{m.productName}</p>
                        <p className="text-[13px] text-gray-400 mt-0.5">{m.quantity.toLocaleString()} {m.unit}</p>
                      </div>
                      <Field label="마킹 제품명 *" value={m.markingName}
                        onChange={v => updateMarking(i, "markingName", v)} placeholder="공장 전달용 제품명" small />
                      <Field label="후가공" value={m.postProcess}
                        onChange={v => updateMarking(i, "postProcess", v)} placeholder="도금/도장/인쇄 등" small />
                      <Field label="납기" value={m.deliveryDate}
                        onChange={v => updateMarking(i, "deliveryDate", v)} placeholder="YYYY-MM-DD" small />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* A-3: 문서 출력 */}
            {hasMarkingNames && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-6">
                <div className="flex items-center gap-2.5 mb-6">
                  <span className="text-[12px] font-bold text-green-600 bg-green-50 rounded-md px-2.5 py-1">STEP 3</span>
                  <h2 className="text-[18px] font-semibold text-gray-900">문서 출력</h2>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center justify-between p-5 rounded-xl bg-zinc-50 border border-zinc-100">
                    <div>
                      <p className="text-[16px] font-semibold text-gray-900">중국발주서</p>
                      <p className="text-[13px] text-gray-500 mt-1">C&C 订货单 · 중국어 A4 양식 · 새 탭에서 인쇄 가능</p>
                    </div>
                    <DlBtn label="발주서 열기" ext="HTML" loading={dlA === "china-order"} disabled={!!dlA}
                      onClick={() => downloadA("china-order")} />
                  </div>
                  <div className="flex items-center justify-between p-5 rounded-xl bg-zinc-50 border border-zinc-100">
                    <div>
                      <p className="text-[16px] font-semibold text-gray-900">마킹</p>
                      <p className="text-[13px] text-gray-500 mt-1">
                        품목별 시트 {markings.length}장 · C&C / ITEM / Q`TY / C/NO / 고객사 / MADE IN CHINA
                      </p>
                    </div>
                    <DlBtn label="마킹 다운로드" ext="Excel" loading={dlA === "marking"} disabled={!!dlA}
                      onClick={() => downloadA("marking")} />
                  </div>
                  <div className="flex items-center justify-between p-5 rounded-xl bg-zinc-50 border border-zinc-100">
                    <div>
                      <p className="text-[16px] font-semibold text-gray-900">입고명세서</p>
                      <p className="text-[13px] text-gray-500 mt-1">마킹별 수량 기준 · 국내 고객사 전달용</p>
                    </div>
                    <DlBtn label="입고명세서" ext="Excel" loading={dlA === "receipt"} disabled={!!dlA}
                      onClick={() => downloadA("receipt")} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════ 워크플로우 B: 출고 처리 ═══════════════ */}
        {tab === "shipment" && (
          <div className="space-y-5">
            {/* B-1: 공장 이미지 업로드 */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <div className="flex items-center gap-2.5 mb-1">
                    <span className="text-[12px] font-bold text-blue-500 bg-blue-50 rounded-md px-2.5 py-1">STEP 1</span>
                    <h2 className="text-[18px] font-semibold text-gray-900">공장 출고 이미지 업로드</h2>
                  </div>
                  <p className="text-[14px] text-gray-400 ml-16">중국어 이미지 → 영문 패킹 정보 자동 추출</p>
                </div>
                {shipment && (
                  <button onClick={() => { setShipment(null); setShipPreview(null); }}
                    className="text-[14px] text-gray-400 hover:text-gray-700 font-medium">재업로드</button>
                )}
              </div>

              {!shipment ? (
                <UploadZone hint="중국 공장 출고 이미지 (PNG · JPG)" preview={shipPreview}
                  uploading={shipUploading} error={shipError} onFile={handleShipFile} />
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {[{ l: "출고일", v: shipment.shipDate }, { l: "공장", v: shipment.factory || "-" }].map(({ l, v }) => (
                      <div key={l} className="bg-gray-50 rounded-xl p-4">
                        <p className="text-[13px] text-gray-400 mb-1">{l}</p>
                        <p className="text-[15px] font-semibold text-gray-900">{v}</p>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-xl border border-gray-100 overflow-hidden">
                    <table className="w-full text-[14px]">
                      <thead className="bg-gray-50">
                        <tr>{["Item", "Material", "Packing", "Qty", "CTNS"].map(h => (
                          <th key={h} className="px-4 py-3 text-left font-semibold text-gray-500">{h}</th>
                        ))}</tr>
                      </thead>
                      <tbody>
                        {shipment.items.map((item, i) => (
                          <tr key={i} className="border-t border-gray-50">
                            <td className="px-4 py-3 font-semibold text-gray-800">{item.itemNameEn}</td>
                            <td className="px-4 py-3 text-gray-600">{item.material}</td>
                            <td className="px-4 py-3 text-gray-600 font-mono text-[13px]">{item.packingBreakdown}</td>
                            <td className="px-4 py-3 text-gray-700">{item.quantity.toLocaleString()}</td>
                            <td className="px-4 py-3 text-gray-700">{item.cartons}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* B-2: 단가 입력 */}
            {shipment && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-6">
                <div className="flex items-center gap-2.5 mb-5">
                  <span className="text-[12px] font-bold text-orange-500 bg-orange-50 rounded-md px-2.5 py-1">STEP 2</span>
                  <h2 className="text-[18px] font-semibold text-gray-900">단가 입력</h2>
                  <p className="text-[14px] text-gray-400">입력값 ÷ 7 = USD 단가 (미입력 시 USD 0.100)</p>
                </div>
                <div className="space-y-3">
                  {shipment.items.map((item, i) => {
                    const usd = item.unitPriceKrw ? (item.unitPriceKrw / 7).toFixed(3) : "0.100";
                    return (
                      <div key={i} className="flex items-center gap-5 p-4 rounded-xl bg-gray-50/60 border border-gray-100">
                        <div className="flex-1 min-w-0">
                          <p className="text-[15px] font-semibold text-gray-800">{item.itemNameEn} <span className="text-gray-400 font-normal">({item.material})</span></p>
                          <p className="text-[13px] text-gray-400 mt-0.5">{item.packingBreakdown} · {item.quantity.toLocaleString()} pcs</p>
                        </div>
                        <div className="w-32">
                          <Field label="단가 (￥ 입력)" value={item.unitPriceKrw ?? ""}
                            onChange={v => updateShipmentPrice(i, v)} placeholder="예: 3.5" type="number" small />
                        </div>
                        <div className="text-right w-28">
                          <p className="text-[12px] text-gray-400 mb-0.5">USD 단가</p>
                          <p className="text-[16px] font-semibold text-gray-900">{usd}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* B-3: 패킹리스트 출력 */}
            {shipment && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2.5 mb-1">
                      <span className="text-[12px] font-bold text-green-600 bg-green-50 rounded-md px-2.5 py-1">STEP 3</span>
                      <h2 className="text-[18px] font-semibold text-gray-900">패킹리스트 출력</h2>
                    </div>
                    <p className="text-[14px] text-gray-400 ml-16">C&C Trading Co., Ltd. · KR5090 · 영문 포워딩 양식</p>
                  </div>
                  <DlBtn label="패킹리스트" ext="Excel" loading={dlB === "packing"} disabled={!!dlB}
                    onClick={downloadPacking} />
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="border-t border-gray-100 mt-12">
        <div className="max-w-4xl mx-auto px-6 py-5 flex justify-between">
          <span className="text-[13px] text-gray-400">씨앤씨무역 물류 자동화 시스템</span>
          <span className="text-[13px] text-gray-300">Powered by GPT-4o Vision</span>
        </div>
      </footer>
    </div>
  );
}

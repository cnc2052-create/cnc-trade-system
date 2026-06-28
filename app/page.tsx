"use client";

import { useState, useRef, useCallback } from "react";
import { CustomerQuote, MarkingEntry } from "@/types";

/* ── icons ── */
function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className="animate-spin">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.2" />
      <path d="M8 2a6 6 0 016 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconUpload() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M9 12V4M9 4L6.5 6.5M9 4L11.5 6.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 13.5v1.5a1 1 0 001 1h10a1 1 0 001-1v-1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconDownload() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 1v8M7 9L4.5 6.5M7 9L9.5 6.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M1.5 11.5h11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

/* ── step badge ── */
function StepBadge({ n, active, done }: { n: number; active: boolean; done: boolean }) {
  return (
    <span className={`
      w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-semibold flex-shrink-0 transition-all
      ${done ? "bg-zinc-900 text-white" : active ? "bg-zinc-900 text-white" : "bg-gray-100 text-gray-400"}
    `}>
      {done ? <IconCheck /> : n}
    </span>
  );
}

/* ── section wrapper ── */
function Section({
  step, title, subtitle, active, done, children,
}: {
  step: number; title: string; subtitle: string;
  active: boolean; done: boolean; children: React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl border transition-all duration-200 ${active || done ? "border-gray-200 bg-white shadow-[0_1px_6px_rgba(0,0,0,0.06)]" : "border-gray-100 bg-gray-50/50"}`}>
      <div className="px-6 py-5 flex items-start gap-3">
        <StepBadge n={step} active={active} done={done} />
        <div className="flex-1 min-w-0">
          <h2 className="text-[14px] font-semibold text-gray-900 tracking-tight">{title}</h2>
          <p className="text-[12px] text-gray-400 mt-0.5">{subtitle}</p>
          {(active || done) && <div className="mt-5">{children}</div>}
        </div>
      </div>
    </div>
  );
}

/* ── input field ── */
function Field({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string | number; onChange: (v: string) => void;
  placeholder?: string; type?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-medium text-gray-500">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 px-3 rounded-lg border border-gray-200 text-[13px] text-gray-900 bg-white focus:outline-none focus:border-gray-400 transition-colors placeholder:text-gray-300"
      />
    </div>
  );
}

/* ── download button ── */
function DownloadBtn({ label, onClick, loading, disabled }: {
  label: string; onClick: () => void; loading: boolean; disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="flex items-center gap-2 h-10 px-5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-[13px] font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
    >
      {loading ? <Spinner size={14} /> : <IconDownload />}
      {label}
    </button>
  );
}

/* ─────────────────────────── MAIN ─────────────────────────── */
export default function Page() {
  const [quote, setQuote] = useState<CustomerQuote | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [markings, setMarkings] = useState<MarkingEntry[]>([]);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  /* step 계산 */
  const step = quote === null ? 1 : markings.every(m => m.markingName) ? (markings.some(m => m.partUnitPrice) ? 4 : 3) : 2;
  const hasMarkingNames = markings.length > 0 && markings.every(m => m.markingName.trim());
  const hasPartPrices = markings.length > 0 && markings.some(m => (m.partUnitPrice ?? 0) > 0);

  /* ── 견적서 업로드 ── */
  async function handleFile(file: File) {
    setUploadError(null);
    setUploading(true);
    setPreview(URL.createObjectURL(file));
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/ocr-quote", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      const q: CustomerQuote = json.data;
      setQuote(q);
      // 마킹 초기값 세팅
      setMarkings(q.items.map(item => ({
        itemNo: item.no,
        productName: item.productName,
        markingName: "",
        postProcess: item.postProcess || "",
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        amount: item.amount,
        deliveryDate: item.deliveryDate || q.deliveryDate || "",
        partUnitPrice: undefined,
        partAmount: undefined,
      })));
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "업로드 오류");
      setPreview(null);
    } finally {
      setUploading(false);
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith("image/")) handleFile(file);
  }, []);

  /* ── 마킹 필드 업데이트 ── */
  function updateMarking(idx: number, field: keyof MarkingEntry, val: string) {
    setMarkings(prev => prev.map((m, i) => {
      if (i !== idx) return m;
      const updated = { ...m, [field]: field === "partUnitPrice" ? (parseFloat(val) || undefined) : val };
      if (field === "partUnitPrice") {
        const price = parseFloat(val) || 0;
        updated.partUnitPrice = price || undefined;
        updated.partAmount = price ? price * m.quantity : undefined;
      }
      return updated;
    }));
  }

  /* ── 문서 다운로드 ── */
  async function download(docType: string, filename: string) {
    if (!quote) return;
    setDownloading(docType);
    setError(null);
    try {
      const res = await fetch("/api/generate-docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docType, quote, markings }),
      });
      if (!res.ok) { const j = await res.json(); throw new Error(j.error); }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "다운로드 오류");
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* nav */}
      <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-zinc-900 flex items-center justify-center">
              <span className="text-white text-[9px] font-bold">C&C</span>
            </div>
            <span className="text-[14px] font-semibold tracking-tight">씨앤씨무역</span>
            <span className="text-[12px] text-gray-400">물류 자동화</span>
          </div>
          {quote && (
            <button
              onClick={() => { setQuote(null); setMarkings([]); setPreview(null); if (inputRef.current) inputRef.current.value = ""; }}
              className="text-[12px] text-gray-400 hover:text-gray-600 transition-colors"
            >
              처음부터 다시
            </button>
          )}
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-4">
        {/* global error */}
        {error && (
          <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-[13px] text-red-700">
            <span>⚠</span>
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} className="text-red-300 hover:text-red-500">×</button>
          </div>
        )}

        {/* ── STEP 1: 견적서 업로드 ── */}
        <Section step={1} title="고객 발주 견적서 업로드" subtitle="이미지를 업로드하면 AI가 자동으로 정보를 추출합니다" active={true} done={!!quote}>
          {!quote ? (
            <label
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center gap-3 h-44 rounded-xl border-[1.5px] border-dashed cursor-pointer transition-all
                ${dragging ? "border-gray-400 bg-gray-50 scale-[1.01]" : "border-gray-200 bg-gray-50/50 hover:border-gray-300 hover:bg-gray-50"}
              `}
            >
              <input ref={inputRef} type="file" accept="image/*" className="sr-only"
                onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
              {uploading ? (
                <div className="flex flex-col items-center gap-3">
                  {preview && <img src={preview} className="h-20 object-contain opacity-30 rounded-lg" alt="" />}
                  <div className="flex items-center gap-2 text-[13px] text-gray-500">
                    <Spinner size={16} /> AI가 견적서 정보를 추출 중...
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-9 h-9 rounded-xl bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-400">
                    <IconUpload />
                  </div>
                  <div className="text-center">
                    <p className="text-[13px] font-medium text-gray-700">클릭하거나 드래그하여 업로드</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">고객사 발주 견적서 이미지 (PNG · JPG)</p>
                  </div>
                  {uploadError && <p className="text-[11px] text-red-500">{uploadError}</p>}
                </>
              )}
            </label>
          ) : (
            <div className="space-y-3">
              {/* 추출 결과 요약 */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "견적번호", value: quote.quoteNo },
                  { label: "고객사", value: quote.customer },
                  { label: "납기", value: quote.deliveryDate || "-" },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-[10px] text-gray-400 mb-1">{label}</p>
                    <p className="text-[13px] font-semibold text-gray-900 truncate">{value}</p>
                  </div>
                ))}
              </div>
              {/* 품목 테이블 */}
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                <table className="w-full text-[12px]">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {["No", "제품명", "후가공", "수량", "단가", "금액", "납기"].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left font-medium text-gray-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {quote.items.map((item, i) => (
                      <tr key={i} className="border-b border-gray-50 last:border-0">
                        <td className="px-3 py-2.5 text-gray-400">{item.no}</td>
                        <td className="px-3 py-2.5 font-medium text-gray-800">{item.productName}</td>
                        <td className="px-3 py-2.5 text-gray-600">{item.postProcess || "-"}</td>
                        <td className="px-3 py-2.5 text-gray-800">{item.quantity.toLocaleString()} {item.unit}</td>
                        <td className="px-3 py-2.5 text-gray-800">{item.unitPrice.toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-gray-800">{item.amount.toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-gray-500">{item.deliveryDate || quote.deliveryDate || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-gray-400">합계: {quote.currency} {quote.totalAmount.toLocaleString()}</p>
            </div>
          )}
        </Section>

        {/* ── STEP 2: 마킹 제품명 입력 ── */}
        <Section
          step={2}
          title="마킹 제품명 입력"
          subtitle="중국발주서에 표기될 마킹용 제품명을 품목별로 입력해주세요"
          active={!!quote}
          done={hasMarkingNames}
        >
          <div className="space-y-3">
            {markings.map((m, i) => (
              <div key={i} className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">품목 {m.itemNo}</span>
                  <span className="text-[12px] text-gray-700 font-medium">{m.productName}</span>
                  <span className="ml-auto text-[11px] text-gray-400">{m.quantity.toLocaleString()} {m.unit}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="마킹 제품명 *"
                    value={m.markingName}
                    onChange={(v) => updateMarking(i, "markingName", v)}
                    placeholder="마킹에 표기할 제품명"
                  />
                  <Field
                    label="납기"
                    value={m.deliveryDate}
                    onChange={(v) => updateMarking(i, "deliveryDate", v)}
                    placeholder="YYYY-MM-DD"
                  />
                </div>
              </div>
            ))}

            {/* 중국발주서 다운로드 */}
            {hasMarkingNames && (
              <div className="pt-2 flex items-center justify-between">
                <p className="text-[12px] text-gray-500">마킹 입력 완료 — 중국발주서를 출력할 수 있습니다</p>
                <DownloadBtn
                  label="중국발주서 (Excel)"
                  loading={downloading === "china-order"}
                  disabled={!hasMarkingNames || !!downloading}
                  onClick={() => download("china-order", `중국발주서_${quote?.quoteNo}.xlsx`)}
                />
              </div>
            )}
          </div>
        </Section>

        {/* ── STEP 3: 패킹리스트 — 부품 단가 입력 ── */}
        <Section
          step={3}
          title="마킹별 부품 단가 입력"
          subtitle="패킹리스트에 표기될 부품별 단가를 입력해주세요"
          active={hasMarkingNames}
          done={hasMarkingNames && hasPartPrices}
        >
          <div className="space-y-3">
            {markings.map((m, i) => (
              <div key={i} className="flex items-center gap-4 rounded-xl border border-gray-100 bg-gray-50/50 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-gray-800 truncate">{m.markingName || m.productName}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{m.quantity.toLocaleString()} {m.unit}</p>
                </div>
                <div className="w-36">
                  <Field
                    label="부품 단가"
                    value={m.partUnitPrice ?? ""}
                    onChange={(v) => updateMarking(i, "partUnitPrice", v)}
                    placeholder="0"
                    type="number"
                  />
                </div>
                <div className="w-32 text-right">
                  <p className="text-[10px] text-gray-400 mb-1">금액</p>
                  <p className="text-[13px] font-semibold text-gray-800">
                    {m.partAmount ? m.partAmount.toLocaleString() : "-"}
                  </p>
                </div>
              </div>
            ))}

            {hasPartPrices && (
              <div className="pt-2 flex items-center justify-end">
                <DownloadBtn
                  label="패킹리스트 (Excel)"
                  loading={downloading === "packing"}
                  disabled={!!downloading}
                  onClick={() => download("packing", `패킹리스트_${quote?.quoteNo}.xlsx`)}
                />
              </div>
            )}
          </div>
        </Section>

        {/* ── STEP 4: 입고명세서 ── */}
        <Section
          step={4}
          title="입고명세서 출력"
          subtitle="발주서 마킹별 수량 기준으로 입고명세서를 생성합니다"
          active={hasMarkingNames}
          done={false}
        >
          <div className="rounded-xl border border-gray-100 overflow-hidden mb-4">
            <table className="w-full text-[12px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {["마킹 제품명", "후가공", "수량", "단가", "금액", "납기"].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {markings.map((m, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0">
                    <td className="px-3 py-2.5 font-medium text-gray-800">{m.markingName || m.productName}</td>
                    <td className="px-3 py-2.5 text-gray-600">{m.postProcess || "-"}</td>
                    <td className="px-3 py-2.5 text-gray-800">{m.quantity.toLocaleString()} {m.unit}</td>
                    <td className="px-3 py-2.5 text-gray-800">{m.unitPrice.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-gray-800">{m.amount.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-gray-500">{m.deliveryDate || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end">
            <DownloadBtn
              label="입고명세서 (Excel)"
              loading={downloading === "receipt"}
              disabled={!hasMarkingNames || !!downloading}
              onClick={() => download("receipt", `입고명세서_${quote?.quoteNo}.xlsx`)}
            />
          </div>
        </Section>
      </main>

      <footer className="border-t border-gray-100 mt-8">
        <div className="max-w-3xl mx-auto px-6 py-5 flex justify-between">
          <span className="text-[11px] text-gray-400">씨앤씨무역 물류 자동화 시스템</span>
          <span className="text-[11px] text-gray-300">Powered by GPT-4o Vision</span>
        </div>
      </footer>
    </div>
  );
}

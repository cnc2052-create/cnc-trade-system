"use client";

import { useState, useRef, useCallback } from "react";
import { OrderInfo, FactoryShipmentInfo } from "@/types";

/* ─────────────────────────── types ─────────────────────────── */
type UploadState = "idle" | "uploading" | "done" | "error";

interface UploadZoneState {
  status: UploadState;
  preview: string | null;
  error: string | null;
}

/* ─────────────────────────── icons ─────────────────────────── */
function IconUpload() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M10 13V4M10 4L7 7M10 4L13 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3 14v2a1 1 0 001 1h12a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2.5 7L5.5 10L11.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconSpinner({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className="animate-spin">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.2"/>
      <path d="M8 2a6 6 0 016 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function IconFile() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M9 1H4a1 1 0 00-1 1v12a1 1 0 001 1h8a1 1 0 001-1V6L9 1z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 1v5h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconDownload() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 1v8M7 9L4.5 6.5M7 9L9.5 6.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M1.5 11.5h11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

function IconRefresh() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M11 6.5A4.5 4.5 0 112.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M2.5 1v2.5H5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/* ─────────────────────────── doc configs ─────────────────────────── */
const DOCS = [
  {
    id: "marking",
    label: "중국발주서 마킹",
    sublabel: "공장 전송용",
    ext: "PDF",
    color: "bg-zinc-900 hover:bg-zinc-800",
  },
  {
    id: "packing-pdf",
    label: "패킹리스트",
    sublabel: "포워딩용",
    ext: "PDF",
    color: "bg-zinc-900 hover:bg-zinc-800",
  },
  {
    id: "packing-excel",
    label: "패킹리스트",
    sublabel: "포워딩용",
    ext: "Excel",
    color: "bg-zinc-900 hover:bg-zinc-800",
  },
  {
    id: "receipt",
    label: "입고명세서",
    sublabel: "국내 고객사용",
    ext: "PDF",
    color: "bg-zinc-900 hover:bg-zinc-800",
  },
] as const;

/* ─────────────────────────── upload zone ─────────────────────────── */
function UploadZone({
  title,
  hint,
  state,
  summary,
  onFile,
  onReset,
}: {
  title: string;
  hint: string;
  state: UploadZoneState;
  summary?: React.ReactNode;
  onFile: (f: File) => void;
  onReset: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) onFile(file);
    },
    [onFile]
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold text-gray-900 tracking-tight">{title}</span>
        {state.status === "done" && (
          <button
            onClick={onReset}
            className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
          >
            <IconRefresh />
            재업로드
          </button>
        )}
      </div>

      {state.status === "idle" || state.status === "error" ? (
        <label
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`
            relative flex flex-col items-center justify-center gap-3 h-40 rounded-xl border-[1.5px] border-dashed cursor-pointer
            transition-all duration-200 select-none
            ${dragging
              ? "border-gray-400 bg-gray-50 scale-[1.01]"
              : "border-gray-200 bg-gray-50/50 hover:border-gray-300 hover:bg-gray-50"
            }
          `}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => { if (e.target.files?.[0]) onFile(e.target.files[0]); }}
          />
          <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-500">
            <IconUpload />
          </div>
          <div className="text-center">
            <p className="text-[13px] font-medium text-gray-700">클릭하거나 드래그하여 업로드</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{hint}</p>
          </div>
          {state.status === "error" && state.error && (
            <p className="absolute bottom-3 text-[11px] text-red-500">{state.error}</p>
          )}
        </label>
      ) : state.status === "uploading" ? (
        <div className="flex flex-col items-center justify-center gap-3 h-40 rounded-xl border border-gray-100 bg-gray-50">
          {state.preview && (
            <div className="absolute inset-0 rounded-xl overflow-hidden opacity-10">
              <img src={state.preview} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <IconSpinner size={20} />
          <p className="text-[12px] text-gray-500">AI가 정보를 추출하는 중...</p>
        </div>
      ) : (
        /* done */
        <div className="rounded-xl border border-gray-100 overflow-hidden animate-fadeUp">
          {state.preview && (
            <div className="h-28 bg-gray-50 overflow-hidden">
              <img src={state.preview} alt="업로드된 이미지" className="w-full h-full object-contain" />
            </div>
          )}
          <div className="p-3 bg-white">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="w-4 h-4 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0">
                <IconCheck />
              </span>
              <span className="text-[11px] font-medium text-green-700">추출 완료</span>
            </div>
            {summary}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── summary rows ─────────────────────────── */
function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-[11px] text-gray-400 whitespace-nowrap">{label}</span>
      <span className="text-[11px] font-medium text-gray-800 text-right truncate">{value}</span>
    </div>
  );
}

/* ─────────────────────────── main page ─────────────────────────── */
export default function Page() {
  const [erpState, setErpState] = useState<UploadZoneState>({ status: "idle", preview: null, error: null });
  const [factoryState, setFactoryState] = useState<UploadZoneState>({ status: "idle", preview: null, error: null });
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [shipment, setShipment] = useState<FactoryShipmentInfo | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const isReady = order !== null && shipment !== null;

  async function uploadImage(
    file: File,
    endpoint: string,
    setState: React.Dispatch<React.SetStateAction<UploadZoneState>>,
    onSuccess: (data: unknown) => void
  ) {
    const preview = URL.createObjectURL(file);
    setState({ status: "uploading", preview, error: null });
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch(endpoint, { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setState({ status: "done", preview, error: null });
      onSuccess(json.data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "오류가 발생했습니다.";
      setState({ status: "error", preview: null, error: msg });
    }
  }

  async function downloadDoc(docType: string) {
    if (!order || !shipment) return;
    setDownloading(docType);
    setGlobalError(null);
    try {
      const res = await fetch("/api/generate-docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docType, order, shipment }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error);
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename\*=UTF-8''(.+)/);
      const filename = match ? decodeURIComponent(match[1]) : `${docType}.pdf`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setGlobalError(e instanceof Error ? e.message : "다운로드 오류");
    } finally {
      setDownloading(null);
    }
  }

  async function downloadAll() {
    for (const doc of DOCS) {
      await downloadDoc(doc.id);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-zinc-900 flex items-center justify-center">
              <span className="text-white text-[10px] font-bold tracking-tight">C&C</span>
            </div>
            <span className="text-[14px] font-semibold text-gray-900 tracking-tight">씨앤씨무역</span>
            <span className="hidden sm:block text-[12px] text-gray-400 font-normal">물류 자동화</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="hidden sm:flex items-center gap-1.5 text-[11px] text-gray-500 bg-gray-50 border border-gray-200 rounded-full px-3 py-1">
              <span className={`w-1.5 h-1.5 rounded-full ${isReady ? "bg-green-500" : "bg-gray-300"}`} />
              {isReady ? "문서 생성 가능" : "이미지 업로드 필요"}
            </span>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-12">
        {/* ── Hero ── */}
        <div className="mb-12">
          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-widest mb-3">Logistics Automation</p>
          <h1 className="text-[32px] font-bold text-gray-900 tracking-tight leading-tight mb-3">
            이미지 하나로<br className="sm:hidden" /> 모든 문서를 자동으로
          </h1>
          <p className="text-[15px] text-gray-500 leading-relaxed max-w-lg">
            ERP 수주 화면과 공장 출고 이미지를 업로드하면
            중국발주서 마킹 · 패킹리스트 · 입고명세서를 즉시 생성합니다.
          </p>
        </div>

        {/* ── Global error ── */}
        {globalError && (
          <div className="mb-6 flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-100 rounded-xl animate-fadeUp">
            <span className="text-red-400 mt-0.5 flex-shrink-0 text-sm">⚠</span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-red-700">{globalError}</p>
            </div>
            <button onClick={() => setGlobalError(null)} className="text-red-300 hover:text-red-500 text-lg leading-none flex-shrink-0">×</button>
          </div>
        )}

        {/* ── Upload + Preview grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          {/* Card 1 — ERP */}
          <div className="rounded-2xl border border-gray-100 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-5 h-5 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center text-[10px] font-bold">1</span>
              <span className="text-[12px] font-medium text-gray-500 uppercase tracking-wider">ERP 수주 화면</span>
            </div>
            <p className="text-[12px] text-gray-400 mb-4 ml-7">수주번호 · 고객사 · 품목 · 금액을 자동 추출</p>
            <UploadZone
              title="수주 화면 캡쳐"
              hint="PNG · JPG · 화면 캡쳐 모두 가능"
              state={erpState}
              onFile={(f) =>
                uploadImage(f, "/api/ocr-erp", setErpState, (data) =>
                  setOrder(data as OrderInfo)
                )
              }
              onReset={() => { setErpState({ status: "idle", preview: null, error: null }); setOrder(null); }}
              summary={
                order && (
                  <div className="space-y-1.5">
                    <SummaryRow label="수주번호" value={order.orderNo || "—"} />
                    <SummaryRow label="고객사" value={order.customer || "—"} />
                    <SummaryRow label="품목" value={`${order.items?.length || 0}개 품목`} />
                    <SummaryRow
                      label="합계"
                      value={`${order.currency || "KRW"} ${order.totalAmount?.toLocaleString() || "0"}`}
                    />
                    {order.deliveryDate && (
                      <SummaryRow label="납기일" value={order.deliveryDate} />
                    )}
                  </div>
                )
              }
            />
          </div>

          {/* Card 2 — Factory */}
          <div className="rounded-2xl border border-gray-100 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-5 h-5 rounded-md bg-orange-50 text-orange-500 flex items-center justify-center text-[10px] font-bold">2</span>
              <span className="text-[12px] font-medium text-gray-500 uppercase tracking-wider">공장 출고 이미지</span>
            </div>
            <p className="text-[12px] text-gray-400 mb-4 ml-7">중국어 자동 번역 · 수량 · 중량 · CBM 추출</p>
            <UploadZone
              title="공장 출고 캡쳐"
              hint="중국어 이미지 — AI가 자동으로 번역합니다"
              state={factoryState}
              onFile={(f) =>
                uploadImage(f, "/api/ocr-factory", setFactoryState, (data) =>
                  setShipment(data as FactoryShipmentInfo)
                )
              }
              onReset={() => { setFactoryState({ status: "idle", preview: null, error: null }); setShipment(null); }}
              summary={
                shipment && (
                  <div className="space-y-1.5">
                    <SummaryRow label="출고일" value={shipment.shipDate || "—"} />
                    {shipment.factory && <SummaryRow label="공장" value={shipment.factory} />}
                    <SummaryRow label="품목" value={`${shipment.items?.length || 0}개 품목`} />
                    <SummaryRow label="총 수량" value={`${shipment.totalQty?.toLocaleString() || 0}`} />
                    {shipment.totalWeight && (
                      <SummaryRow label="총 중량" value={`${shipment.totalWeight} KG`} />
                    )}
                    {shipment.totalCbm && (
                      <SummaryRow label="총 CBM" value={`${shipment.totalCbm} CBM`} />
                    )}
                  </div>
                )
              }
            />
          </div>
        </div>

        {/* ── Divider ── */}
        <div className="flex items-center gap-4 mb-8">
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-[11px] text-gray-400 tracking-wider uppercase">문서 생성</span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>

        {/* ── Document buttons ── */}
        <div className={`transition-opacity duration-300 ${isReady ? "opacity-100" : "opacity-35 pointer-events-none"}`}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            {DOCS.map((doc) => {
              const isLoading = downloading === doc.id;
              return (
                <button
                  key={doc.id}
                  onClick={() => downloadDoc(doc.id)}
                  disabled={!!downloading}
                  className={`
                    relative group flex flex-col justify-between
                    h-[108px] rounded-xl px-4 py-3.5
                    ${doc.color} text-white
                    transition-all duration-150
                    disabled:opacity-60 disabled:cursor-not-allowed
                    active:scale-[0.97]
                  `}
                >
                  {/* ext badge */}
                  <span className="self-end text-[9px] font-semibold tracking-widest uppercase bg-white/15 rounded-md px-1.5 py-0.5 w-fit">
                    {doc.ext}
                  </span>

                  <div className="mt-auto">
                    <p className="text-[13px] font-semibold leading-tight">{doc.label}</p>
                    <p className="text-[11px] text-white/60 mt-0.5">{doc.sublabel}</p>
                  </div>

                  {/* download icon or spinner */}
                  <div className="absolute top-3 left-4">
                    {isLoading
                      ? <IconSpinner size={14} />
                      : <span className="text-white/40 group-hover:text-white/70 transition-colors"><IconDownload /></span>
                    }
                  </div>
                </button>
              );
            })}
          </div>

          {/* All download */}
          <button
            onClick={downloadAll}
            disabled={!!downloading}
            className="w-full h-12 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-[13px] font-medium transition-all duration-150 flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50"
          >
            {downloading ? (
              <><IconSpinner size={14} /> 생성 중...</>
            ) : (
              <><IconFile /> 전체 문서 다운로드 (4종)</>
            )}
          </button>
        </div>

        {/* ── Empty state hint ── */}
        {!isReady && (
          <p className="text-center text-[12px] text-gray-400 mt-4">
            {!order && !shipment
              ? "위에서 두 이미지를 업로드하면 문서 생성 버튼이 활성화됩니다"
              : !order
              ? "ERP 수주 화면 이미지를 업로드해주세요"
              : "공장 출고 이미지를 업로드해주세요"}
          </p>
        )}

        {/* ── How it works ── */}
        <div className="mt-16 pt-8 border-t border-gray-100">
          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-widest mb-6">사용 방법</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { n: "01", title: "ERP 캡쳐", desc: "ERP 수주 화면을 스크린샷으로 저장 후 업로드" },
              { n: "02", title: "공장 이미지", desc: "중국 공장에서 받은 출고 이미지 업로드" },
              { n: "03", title: "AI 추출", desc: "GPT-4o가 한·중 양쪽 정보를 자동으로 인식" },
              { n: "04", title: "문서 다운로드", desc: "필요한 문서를 선택하거나 전체 다운로드" },
            ].map((item) => (
              <div key={item.n} className="flex flex-col gap-2">
                <span className="text-[22px] font-bold text-gray-100 tracking-tight">{item.n}</span>
                <p className="text-[13px] font-semibold text-gray-800">{item.title}</p>
                <p className="text-[12px] text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-100 mt-16">
        <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
          <span className="text-[11px] text-gray-400">씨앤씨무역 물류 자동화 시스템</span>
          <span className="text-[11px] text-gray-300">Powered by GPT-4o Vision</span>
        </div>
      </footer>
    </div>
  );
}

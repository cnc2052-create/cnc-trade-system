"use client";

import { useState, useRef } from "react";
import { OrderInfo, FactoryShipmentInfo } from "@/types";

type Step = "idle" | "erp-uploading" | "factory-uploading" | "ready" | "generating";

export default function Home() {
  const [step, setStep] = useState<Step>("idle");
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [shipment, setShipment] = useState<FactoryShipmentInfo | null>(null);
  const [erpPreview, setErpPreview] = useState<string | null>(null);
  const [factoryPreview, setFactoryPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generatingDoc, setGeneratingDoc] = useState<string | null>(null);

  const erpInputRef = useRef<HTMLInputElement>(null);
  const factoryInputRef = useRef<HTMLInputElement>(null);

  async function handleErpUpload(file: File) {
    setError(null);
    setStep("erp-uploading");
    setErpPreview(URL.createObjectURL(file));
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/ocr-erp", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setOrder(json.data);
      setStep("idle");
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
      setStep("idle");
    }
  }

  async function handleFactoryUpload(file: File) {
    setError(null);
    setStep("factory-uploading");
    setFactoryPreview(URL.createObjectURL(file));
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/ocr-factory", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setShipment(json.data);
      setStep("idle");
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
      setStep("idle");
    }
  }

  async function generateDoc(docType: string, label: string) {
    if (!order || !shipment) return;
    setGeneratingDoc(label);
    setError(null);
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
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "문서 생성 오류");
    } finally {
      setGeneratingDoc(null);
    }
  }

  const isReady = order !== null && shipment !== null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-800 text-white px-6 py-4 shadow">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <span className="text-2xl">🏭</span>
          <div>
            <h1 className="text-xl font-bold">씨앤씨무역 물류 자동화 시스템</h1>
            <p className="text-blue-200 text-sm">CNC Trading - Document Auto Generation</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
            <span>⚠️</span>
            <div>
              <strong>오류:</strong> {error}
              <button className="ml-3 text-sm underline" onClick={() => setError(null)}>닫기</button>
            </div>
          </div>
        )}

        {/* Upload section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ERP Upload */}
          <div className="bg-white rounded-xl border-2 border-dashed border-blue-200 p-6 hover:border-blue-400 transition-colors">
            <div className="text-center mb-4">
              <div className="text-3xl mb-2">📋</div>
              <h2 className="text-lg font-bold text-gray-800">STEP 1. ERP 수주 화면</h2>
              <p className="text-sm text-gray-500 mt-1">ERP에서 수주 화면 캡쳐 업로드</p>
            </div>

            {erpPreview ? (
              <div className="space-y-3">
                <img src={erpPreview} alt="ERP 캡쳐" className="w-full rounded-lg border object-contain max-h-48" />
                {step === "erp-uploading" && (
                  <div className="flex items-center gap-2 text-blue-600 text-sm">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    AI가 수주 정보 추출 중...
                  </div>
                )}
                {order && (
                  <div className="bg-blue-50 rounded-lg p-3 text-sm space-y-1">
                    <p className="font-bold text-blue-800">✅ 수주 정보 추출 완료</p>
                    <p>수주번호: <strong>{order.orderNo}</strong></p>
                    <p>고객사: <strong>{order.customer}</strong></p>
                    <p>품목 수: <strong>{order.items?.length || 0}개</strong></p>
                    <p>합계: <strong>{order.currency} {order.totalAmount?.toLocaleString()}</strong></p>
                  </div>
                )}
                <button
                  className="w-full text-sm text-gray-400 hover:text-gray-600 underline"
                  onClick={() => { setOrder(null); setErpPreview(null); if (erpInputRef.current) erpInputRef.current.value = ""; }}
                >
                  다시 업로드
                </button>
              </div>
            ) : (
              <label className="block cursor-pointer">
                <input
                  ref={erpInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { if (e.target.files?.[0]) handleErpUpload(e.target.files[0]); }}
                />
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 transition-colors">
                  <p className="text-4xl mb-2">📁</p>
                  <p className="text-gray-600 font-medium">클릭하여 이미지 선택</p>
                  <p className="text-gray-400 text-xs mt-1">PNG, JPG, GIF 지원</p>
                </div>
              </label>
            )}
          </div>

          {/* Factory Upload */}
          <div className="bg-white rounded-xl border-2 border-dashed border-green-200 p-6 hover:border-green-400 transition-colors">
            <div className="text-center mb-4">
              <div className="text-3xl mb-2">🏗️</div>
              <h2 className="text-lg font-bold text-gray-800">STEP 2. 공장 출고 이미지</h2>
              <p className="text-sm text-gray-500 mt-1">중국 공장에서 받은 출고 이미지 업로드</p>
            </div>

            {factoryPreview ? (
              <div className="space-y-3">
                <img src={factoryPreview} alt="공장 출고" className="w-full rounded-lg border object-contain max-h-48" />
                {step === "factory-uploading" && (
                  <div className="flex items-center gap-2 text-green-600 text-sm">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    AI가 출고 정보 추출 중...
                  </div>
                )}
                {shipment && (
                  <div className="bg-green-50 rounded-lg p-3 text-sm space-y-1">
                    <p className="font-bold text-green-800">✅ 출고 정보 추출 완료</p>
                    <p>출고일: <strong>{shipment.shipDate}</strong></p>
                    {shipment.factory && <p>공장: <strong>{shipment.factory}</strong></p>}
                    <p>품목 수: <strong>{shipment.items?.length || 0}개</strong></p>
                    <p>총 수량: <strong>{shipment.totalQty?.toLocaleString()}</strong></p>
                    {shipment.totalWeight && <p>총 중량: <strong>{shipment.totalWeight} KG</strong></p>}
                  </div>
                )}
                <button
                  className="w-full text-sm text-gray-400 hover:text-gray-600 underline"
                  onClick={() => { setShipment(null); setFactoryPreview(null); if (factoryInputRef.current) factoryInputRef.current.value = ""; }}
                >
                  다시 업로드
                </button>
              </div>
            ) : (
              <label className="block cursor-pointer">
                <input
                  ref={factoryInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { if (e.target.files?.[0]) handleFactoryUpload(e.target.files[0]); }}
                />
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 transition-colors">
                  <p className="text-4xl mb-2">📁</p>
                  <p className="text-gray-600 font-medium">클릭하여 이미지 선택</p>
                  <p className="text-gray-400 text-xs mt-1">중국어 이미지 자동 번역</p>
                </div>
              </label>
            )}
          </div>
        </div>

        {/* Document Generation */}
        <div className={`bg-white rounded-xl border-2 p-6 transition-all ${isReady ? "border-purple-300 shadow-lg" : "border-gray-200 opacity-60"}`}>
          <div className="text-center mb-6">
            <div className="text-3xl mb-2">📄</div>
            <h2 className="text-lg font-bold text-gray-800">STEP 3. 문서 자동 생성</h2>
            {!isReady && <p className="text-sm text-gray-400 mt-1">위의 두 이미지를 먼저 업로드해주세요</p>}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { docType: "marking", icon: "🇨🇳", title: "중국발주서 마킹", subtitle: "공장 전송용 PDF", color: "bg-blue-600 hover:bg-blue-700" },
              { docType: "packing-pdf", icon: "📦", title: "패킹리스트 PDF", subtitle: "포워딩용 PDF", color: "bg-green-600 hover:bg-green-700" },
              { docType: "packing-excel", icon: "📊", title: "패킹리스트 Excel", subtitle: "포워딩용 Excel", color: "bg-emerald-600 hover:bg-emerald-700" },
              { docType: "receipt", icon: "🏢", title: "입고명세서", subtitle: "국내 고객사용 PDF", color: "bg-purple-600 hover:bg-purple-700" },
            ].map((doc) => (
              <button
                key={doc.docType}
                onClick={() => generateDoc(doc.docType, doc.docType)}
                disabled={!isReady || !!generatingDoc}
                className={`${doc.color} text-white rounded-xl p-4 text-left transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 active:scale-95`}
              >
                <div className="text-2xl mb-2">{generatingDoc === doc.docType ? "⏳" : doc.icon}</div>
                <div className="font-bold text-sm">{doc.title}</div>
                <div className="text-xs opacity-80 mt-0.5">{doc.subtitle}</div>
              </button>
            ))}
          </div>

          {isReady && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <button
                className="w-full bg-gray-800 hover:bg-gray-900 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                disabled={!!generatingDoc}
                onClick={async () => {
                  for (const dt of ["marking", "packing-pdf", "packing-excel", "receipt"]) {
                    await generateDoc(dt, dt);
                  }
                }}
              >
                🚀 전체 문서 한번에 다운로드 (4종)
              </button>
            </div>
          )}
        </div>

        {/* Guide */}
        <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
          <h3 className="font-bold text-blue-800 mb-3">📌 업무 흐름 가이드</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-blue-700">
            {[
              { n: "1", text: "ERP 수주 화면 캡쳐 업로드", icon: "📋" },
              { n: "2", text: "공장 출고 이미지 업로드", icon: "🏗️" },
              { n: "3", text: "AI 자동 정보 추출 및 번역", icon: "🤖" },
              { n: "4", text: "필요 문서 선택하여 다운로드", icon: "📥" },
            ].map((item) => (
              <div key={item.n} className="flex items-start gap-2">
                <span className="bg-blue-200 text-blue-800 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{item.n}</span>
                <span>{item.icon} {item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="text-center py-6 text-gray-400 text-sm">
        씨앤씨무역 물류 자동화 시스템 v1.0 · Powered by Claude AI
      </footer>
    </div>
  );
}

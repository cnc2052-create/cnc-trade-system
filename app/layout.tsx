import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "씨앤씨무역 — 물류 자동화",
  description: "ERP 수주 · 공장 출고 이미지 → 문서 자동 생성",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full bg-white text-gray-900 antialiased">{children}</body>
    </html>
  );
}

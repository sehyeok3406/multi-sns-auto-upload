import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SNS auto upload",
  description: "팀 SNS 통합 업로드 MVP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full bg-[#f7f7f4] text-zinc-950">{children}</body>
    </html>
  );
}

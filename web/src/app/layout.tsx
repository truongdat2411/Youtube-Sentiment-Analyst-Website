import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/site/app-shell";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-geist-sans",
});

export const metadata: Metadata = {
  title: "Sentiment Studio — YouTube Analytics",
  description: "Phân tích sentiment bình luận YouTube với AI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={inter.variable}>
      <body className="font-sans">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

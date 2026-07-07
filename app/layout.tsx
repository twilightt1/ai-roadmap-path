import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { SearchCommand } from "@/components/shared/search-command";
import { ScrollProgress } from "@/components/shared/scroll-progress";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { siteUrl } from "@/lib/site-url";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "AI Engineer Roadmap 2026 · Zero to Production AI",
    template: "%s · AI Engineer Roadmap",
  },
  description:
    "Lộ trình học AI Engineer 2026 đầy đủ: 17 phases + 51 projects từ Python, Math, Deep Learning, LLM, Multi-LLM Orchestration, RAG, Agents, MLOps đến Production. Dark, modern, tiếng Việt.",
  keywords: [
    "AI Engineer",
    "Roadmap 2026",
    "LLM",
    "RAG",
    "Multi-LLM",
    "AI Agents",
    "MLOps",
    "Next.js",
  ],
  authors: [{ name: "PrinceSinghAI" }],
  openGraph: {
    type: "website",
    locale: "vi_VN",
    title: "AI Engineer Roadmap 2026 · Zero to Production AI",
    description:
      "17 phases + 51 projects · từ Python cơ bản đến kiến trúc hệ thống Multi-LLM production-grade.",
    siteName: "AI Engineer Roadmap",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Engineer Roadmap 2026",
    description:
      "17 phases + 51 projects · từ Python cơ bản đến kiến trúc hệ thống Multi-LLM production-grade.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ThemeProvider>
          <ScrollProgress />
          <Navbar />
          <main className="flex-1" data-pagefind-body>{children}</main>
          <Footer />
          <SearchCommand />
        </ThemeProvider>
      </body>
    </html>
  );
}

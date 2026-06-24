import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ai-research-assistant-liart.vercel.app"),
  applicationName: "ResearchOS",
  title: {
    default: "ResearchOS - AI Research Intelligence Workspace",
    template: "%s | ResearchOS",
  },
  description:
    "An AI-native research workspace for document ingestion, multi-document synthesis, cited Q&A, knowledge extraction, and research exports.",
  openGraph: {
    title: "ResearchOS - AI Research Intelligence Workspace",
    description:
      "Upload documents, synthesize findings across sources, ask cited research questions, and explore extracted knowledge.",
    url: "https://ai-research-assistant-liart.vercel.app",
    siteName: "ResearchOS",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}

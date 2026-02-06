import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { MainLayout } from "@/components/layout/MainLayout";
import { FeedbackWidget } from "@/components/FeedbackWidget";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: 'InterviewBot - AI 모의 면접 플랫폼',
    template: '%s | InterviewBot',
  },
  description: 'AI 면접관과 함께 실전 같은 모의 면접을 연습하세요. 맞춤형 피드백, 다양한 기술 주제, 성과 분석으로 완벽한 면접을 준비합니다.',
  keywords: ['AI 면접', '모의 면접', '면접 준비', '개발자 면접', '기술 면접', '코딩 면접'],
  openGraph: {
    title: 'InterviewBot - AI 모의 면접 플랫폼',
    description: '실전 같은 AI 면접으로 자신감을 키우세요',
    type: 'website',
    locale: 'ko_KR',
    siteName: 'InterviewBot',
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
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <MainLayout>{children}</MainLayout>
        <FeedbackWidget />
      </body>
    </html>
  );
}

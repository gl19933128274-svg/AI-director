import './globals.css';
import type { Metadata } from 'next';
import React from 'react';
import Providers from '@/components/Providers';

export const metadata: Metadata = {
  title: 'AI Director - AI驱动的视频创作平台',
  description: '用自然语言描述你的创意，AI自动生成分镜脚本和视频',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="bg-dark-bg text-gray-100 min-h-screen">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

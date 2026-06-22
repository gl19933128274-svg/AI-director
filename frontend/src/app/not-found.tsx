'use client';

import React from 'react';
import { ArrowLeft, Home } from 'lucide-react';

export default function NotFoundPage() {
  const handleGoHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-surface-0 flex flex-col items-center justify-center">
      <div className="text-center">
        <div className="text-8xl mb-6">404</div>
        <h1 className="text-2xl font-bold mb-4">页面未找到</h1>
        <p className="text-gray-400 mb-8">抱歉，您访问的页面不存在</p>
        <div className="flex gap-4 justify-center">
          <button 
            className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/80 rounded-lg transition-colors"
            onClick={handleGoHome}
          >
            <Home className="w-5 h-5" />
            <span>返回首页</span>
          </button>
          <button 
            className="flex items-center gap-2 px-6 py-3 bg-surface-2 hover:bg-surface-3 rounded-lg transition-colors"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="w-5 h-5" />
            <span>返回上一页</span>
          </button>
        </div>
      </div>
    </div>
  );
}
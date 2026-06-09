'use client';

import React, { useState } from 'react';
import { Play, Heart, Share2, Download } from 'lucide-react';
import Sidebar from '@/components/Sidebar';

interface TemplateItem {
  title: string;
  duration: string;
  uses: string;
  category: string;
  cover: string;
}

const templateData: TemplateItem[] = [
  { title: '产品展示模板', duration: '0:30', uses: '1.2k', category: '商业', cover: '' },
  { title: '品牌宣传片模板', duration: '0:60', uses: '890', category: '品牌', cover: '' },
  { title: '社交媒体短视频', duration: '0:15', uses: '2.3k', category: '社交', cover: '' },
  { title: '教程演示模板', duration: '0:45', uses: '654', category: '教育', cover: '' },
  { title: '活动推广模板', duration: '0:20', uses: '1.1k', category: '营销', cover: '' },
  { title: '旅行记录模板', duration: '0:25', uses: '432', category: '生活', cover: '' }
];

const categories = ['全部', '商业', '品牌', '社交', '教育', '营销', '生活'];

export default function TemplatesPage() {
  const [activeCategory, setActiveCategory] = useState<string>('全部');
  const [likedItems, setLikedItems] = useState<Set<string>>(new Set());

  const handleLike = (title: string) => {
    setLikedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(title)) {
        newSet.delete(title);
      } else {
        newSet.add(title);
      }
      return newSet;
    });
  };

  const filteredTemplates = activeCategory === '全部'
    ? templateData
    : templateData.filter(item => item.category === activeCategory);

  return (
    <div className="h-full w-full bg-surface-0 flex">
      <Sidebar currentPage="templates" />

      <main className="main">
        <div className="page-header">
          <h2>模板库</h2>
          <p className="page-sub">精选模板，一键应用</p>
        </div>

        <div className="template-categories">
          {categories.map((category) => (
            <span
              key={category}
              className={`template-category ${activeCategory === category ? 'active' : ''}`}
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </span>
          ))}
        </div>

        <div className="template-grid">
          {filteredTemplates.map((item, index) => (
            <div key={index} className="template-item">
              <div className="card">
                <div className="card-thumb">
                  <span style={{ color: 'oklch(0.44 0.018 68)', fontSize: 'clamp(0.6875rem, 0.7vw, 0.75rem)' }}>
                    封面
                  </span>
                  <span className="duration-badge">{item.duration}</span>
                  <span className="category-badge">{item.category}</span>
                </div>
                <div className="card-info">
                  <div className="card-title">{item.title}</div>
                  <div className="card-stats">
                    <span>使用 {item.uses}</span>
                  </div>
                </div>
                <div className="card-actions">
                  <button className="card-action-btn" onClick={() => alert('预览功能开发中...')}>
                    <Play className="w-4 h-4" />
                  </button>
                  <button
                    className={`card-action-btn ${likedItems.has(item.title) ? 'liked' : ''}`}
                    onClick={() => handleLike(item.title)}
                  >
                    <Heart className="w-4 h-4" />
                  </button>
                  <button className="card-action-btn" onClick={() => alert('分享功能开发中...')}>
                    <Share2 className="w-4 h-4" />
                  </button>
                  <button className="card-action-btn" onClick={() => alert('下载功能开发中...')}>
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
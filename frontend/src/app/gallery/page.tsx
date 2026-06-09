'use client';

import React, { useState } from 'react';
import { Play, Heart, Share2, Download } from 'lucide-react';
import Sidebar from '@/components/Sidebar';

interface GalleryItem {
  title: string;
  duration: string;
  views: string;
  likes: string;
  cover: string;
}

const galleryData: GalleryItem[] = [
  { title: '双肩包产品展示', duration: '0:30', views: '2.4万', likes: '892', cover: '' },
  { title: '夏日运动鞋广告', duration: '0:15', views: '1.8万', likes: '654', cover: '' },
  { title: '品牌形象宣传片', duration: '0:60', views: '5.2万', likes: '1.2k', cover: '' },
  { title: '旅行Vlog合集', duration: '0:45', views: '9800', likes: '432', cover: '' },
  { title: '美食探店记录', duration: '0:20', views: '3.1万', likes: '1.1k', cover: '' },
  { title: '产品开箱体验', duration: '0:25', views: '6700', likes: '298', cover: '' }
];

const filters = ['全部', '最近', '最热', '收藏'];

export default function GalleryPage() {
  const [activeFilter, setActiveFilter] = useState<string>('全部');
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

  return (
    <div className="h-full w-full bg-surface-0 flex">
      <Sidebar currentPage="gallery" />

      <main className="main">
        <div className="page-header">
          <h2>作品展</h2>
          <p className="page-sub">你的所有创作作品</p>
        </div>

        <div className="gallery-filters">
          {filters.map((filter) => (
            <span
              key={filter}
              className={`gallery-filter ${activeFilter === filter ? 'active' : ''}`}
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </span>
          ))}
        </div>

        <div className="gallery-grid">
          {galleryData.map((item, index) => (
            <div key={index} className="gallery-item">
              <div className="card">
                <div className="card-thumb">
                  <span style={{ color: 'oklch(0.44 0.018 68)', fontSize: 'clamp(0.6875rem, 0.7vw, 0.75rem)' }}>
                    封面
                  </span>
                  <span className="duration-badge">{item.duration}</span>
                </div>
                <div className="card-info">
                  <div className="card-title">{item.title}</div>
                  <div className="card-stats">
                    <span>播放 {item.views}</span>
                    <span>点赞 {item.likes}</span>
                  </div>
                </div>
                <div className="card-actions">
                  <button className="card-action-btn" onClick={() => alert('播放功能开发中...')}>
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
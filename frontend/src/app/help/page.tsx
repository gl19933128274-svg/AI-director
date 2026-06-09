'use client';

import React, { useState } from 'react';
import { Search, ChevronDown, ChevronRight } from 'lucide-react';
import Sidebar from '@/components/Sidebar';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

const faqData: FAQItem[] = [
  {
    id: '1',
    question: '如何开始创建视频？',
    answer: '点击首页的"新建项目"按钮，选择模板或从零开始，然后添加分镜并配置参数即可开始创建视频。',
    category: '入门指南'
  },
  {
    id: '2',
    question: '如何调整分镜时长？',
    answer: '在分镜页面，拖动分镜卡片右侧的调整手柄可以实时调整分镜时长，支持2-60秒范围内调整。',
    category: '分镜编辑'
  },
  {
    id: '3',
    question: '视频生成需要多长时间？',
    answer: '生成时间取决于视频长度和服务器负载，通常每个分镜需要1-2分钟，完整视频生成时间约为分镜数×1.5分钟。',
    category: '视频生成'
  },
  {
    id: '4',
    question: '如何分享我的作品？',
    answer: '在作品展页面找到您想分享的作品，点击分享按钮即可生成分享链接，支持分享到社交媒体或直接复制链接。',
    category: '作品管理'
  },
  {
    id: '5',
    question: '支持哪些视频格式导出？',
    answer: '目前支持导出MP4格式，分辨率最高支持1080p，帧率支持24fps、30fps和60fps。',
    category: '导出设置'
  },
  {
    id: '6',
    question: '如何修改账户信息？',
    answer: '进入设置页面，选择"个人资料"选项卡，可以修改用户名、邮箱、手机号和个人简介等信息。',
    category: '账户设置'
  },
  {
    id: '7',
    question: '额度如何计算和充值？',
    answer: '每次生成视频消耗1次额度，可以在套餐管理页面查看剩余额度和购买新的套餐。',
    category: '套餐管理'
  },
  {
    id: '8',
    question: '遇到问题如何联系客服？',
    answer: '您可以通过设置页面的"帮助与支持"选项卡中的"联系客服"按钮与我们取得联系，我们会尽快回复您。',
    category: '技术支持'
  }
];

const categories = ['全部', '入门指南', '分镜编辑', '视频生成', '作品管理', '导出设置', '账户设置', '套餐管理', '技术支持'];

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('全部');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const handleToggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const filteredFAQs = faqData.filter(item => {
    const matchesCategory = activeCategory === '全部' || item.category === activeCategory;
    const matchesSearch = item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="h-full w-full bg-surface-0 flex">
      <Sidebar currentPage="help" />

      <main className="main">
        <div className="page-header">
          <h2>帮助中心</h2>
          <p className="page-sub">常见问题解答和技术支持</p>
        </div>

        <div className="help-search">
          <Search className="help-search-icon" />
          <input
            type="text"
            placeholder="搜索问题..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="help-search-input"
          />
        </div>

        <div className="help-categories">
          {categories.map((category) => (
            <span
              key={category}
              className={`help-category ${activeCategory === category ? 'active' : ''}`}
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </span>
          ))}
        </div>

        <div className="help-faq-list">
          {filteredFAQs.length > 0 ? (
            filteredFAQs.map((item) => (
              <div key={item.id} className="help-faq-item">
                <button
                  className="help-faq-question"
                  onClick={() => handleToggleExpand(item.id)}
                >
                  <span className="faq-question-text">{item.question}</span>
                  <span className="faq-category-tag">{item.category}</span>
                  {expandedItems.has(item.id) ? (
                    <ChevronDown className="faq-chevron" />
                  ) : (
                    <ChevronRight className="faq-chevron" />
                  )}
                </button>
                {expandedItems.has(item.id) && (
                  <div className="help-faq-answer">
                    {item.answer}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="help-empty">
              <p>没有找到相关问题</p>
              <p style={{ fontSize: 'clamp(0.75rem, 0.8vw, 0.875rem)', color: 'oklch(0.44 0.018 68)' }}>
                尝试调整搜索关键词或选择其他分类
              </p>
            </div>
          )}
        </div>

        <div className="help-contact">
          <h3>没有找到答案？</h3>
          <p style={{ fontSize: 'clamp(0.875rem, 0.95vw, 1rem)', color: 'oklch(0.64 0.020 70)', marginBottom: 'clamp(1rem, 1.2vw, 1.5rem)' }}>
            联系我们的客服团队，我们会尽快为您解答
          </p>
          <button className="btn btn-primary">联系客服</button>
        </div>
      </main>
    </div>
  );
}
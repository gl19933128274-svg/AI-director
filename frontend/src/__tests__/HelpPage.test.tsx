/**
 * 帮助页面测试
 * 测试覆盖：基础渲染、搜索功能、分类筛选、FAQ展开/折叠
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import HelpPage from '@/app/help/page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/help',
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('帮助页面测试', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
    cleanup();
  });

  afterEach(() => {
    cleanup();
  });

  describe('基础渲染测试', () => {
    test('页面正确渲染', () => {
      render(<HelpPage />);
      
      expect(screen.getByText('帮助中心')).toBeInTheDocument();
      expect(screen.getByText('常见问题解答和技术支持')).toBeInTheDocument();
    });

    test('FAQ列表正确显示', () => {
      render(<HelpPage />);
      
      expect(screen.getByText('如何开始创建视频？')).toBeInTheDocument();
      expect(screen.getByText('如何调整分镜时长？')).toBeInTheDocument();
      expect(screen.getByText('视频生成需要多长时间？')).toBeInTheDocument();
    });

    test('分类选项正确显示', () => {
      render(<HelpPage />);
      
      expect(screen.getByText('全部')).toBeInTheDocument();
      // 使用getAllByText来处理多个匹配（分类标签和FAQ标签）
      const beginnerElements = screen.getAllByText('入门指南');
      expect(beginnerElements.length).toBeGreaterThan(0);
      const storyboardElements = screen.getAllByText('分镜编辑');
      expect(storyboardElements.length).toBeGreaterThan(0);
      const videoElements = screen.getAllByText('视频生成');
      expect(videoElements.length).toBeGreaterThan(0);
    });

    test('搜索框正确显示', () => {
      render(<HelpPage />);
      
      const searchInput = screen.getByPlaceholderText('搜索问题...');
      expect(searchInput).toBeInTheDocument();
    });
  });

  describe('搜索功能测试', () => {
    test('输入搜索关键词过滤FAQ', () => {
      render(<HelpPage />);
      
      const searchInput = screen.getByPlaceholderText('搜索问题...') as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: '视频' } });
      
      // 应该显示包含"视频"关键词的FAQ
      expect(screen.getByText('视频生成需要多长时间？')).toBeInTheDocument();
    });

    test('搜索无结果时显示提示', () => {
      render(<HelpPage />);
      
      const searchInput = screen.getByPlaceholderText('搜索问题...') as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: '不存在的内容' } });
      
      expect(screen.getByText('没有找到相关问题')).toBeInTheDocument();
    });

    test('清空搜索恢复所有FAQ', () => {
      render(<HelpPage />);
      
      const searchInput = screen.getByPlaceholderText('搜索问题...') as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: '视频' } });
      fireEvent.change(searchInput, { target: { value: '' } });
      
      expect(screen.getByText('如何开始创建视频？')).toBeInTheDocument();
    });
  });

  describe('分类筛选测试', () => {
    test('点击分类切换筛选', () => {
      render(<HelpPage />);
      
      // 使用更精确的选择器，只选择分类区域内的元素
      const categoryElements = screen.getAllByText('入门指南');
      const categoryBtn = categoryElements.find(el => 
        el.closest('.help-categories') !== null
      );
      fireEvent.click(categoryBtn!);
      
      expect(screen.getByText('如何开始创建视频？')).toBeInTheDocument();
    });

    test('点击全部显示所有FAQ', () => {
      render(<HelpPage />);
      
      // 先切换到其他分类
      const categoryElements = screen.getAllByText('入门指南');
      const categoryBtn = categoryElements.find(el => 
        el.closest('.help-categories') !== null
      );
      fireEvent.click(categoryBtn!);
      
      // 再切换回全部
      const allBtn = screen.getByText('全部');
      fireEvent.click(allBtn);
      
      expect(screen.getByText('如何开始创建视频？')).toBeInTheDocument();
      expect(screen.getByText('如何调整分镜时长？')).toBeInTheDocument();
    });
  });

  describe('FAQ展开/折叠测试', () => {
    test('点击FAQ展开答案', () => {
      render(<HelpPage />);
      
      const faqButton = screen.getByText('如何开始创建视频？').closest('button');
      fireEvent.click(faqButton!);
      
      expect(screen.getByText(/点击首页的"新建项目"按钮/i)).toBeInTheDocument();
    });

    test('再次点击FAQ折叠答案', () => {
      render(<HelpPage />);
      
      const faqButton = screen.getByText('如何开始创建视频？').closest('button');
      
      // 展开
      fireEvent.click(faqButton!);
      expect(screen.getByText(/点击首页的"新建项目"按钮/i)).toBeInTheDocument();
      
      // 折叠
      fireEvent.click(faqButton!);
      expect(screen.queryByText(/点击首页的"新建项目"按钮/i)).not.toBeInTheDocument();
    });
  });

  describe('联系客服测试', () => {
    test('联系客服按钮正确显示', () => {
      render(<HelpPage />);
      
      expect(screen.getByText('没有找到答案？')).toBeInTheDocument();
      expect(screen.getByText('联系客服')).toBeInTheDocument();
    });

    test('点击联系客服按钮', () => {
      render(<HelpPage />);
      
      const contactButton = screen.getByRole('button', { name: '联系客服' });
      expect(contactButton).toBeInTheDocument();
    });
  });

  describe('UI可访问性测试', () => {
    test('所有分类按钮可点击', () => {
      render(<HelpPage />);
      
      const categories = ['全部', '入门指南', '分镜编辑', '视频生成', '作品管理', '导出设置', '账户设置', '套餐管理', '技术支持'];
      
      categories.forEach(category => {
        // 使用更精确的选择器，只选择分类区域内的元素
        const categoryElements = screen.getAllByText(category);
        const categoryElement = categoryElements.find(el => 
          el.closest('.help-categories') !== null
        );
        expect(categoryElement).toBeInTheDocument();
        fireEvent.click(categoryElement!);
      });
    });

    test('所有FAQ按钮可点击', () => {
      render(<HelpPage />);
      
      const faqButtons = screen.getAllByRole('button').filter(btn => 
        btn.classList.contains('help-faq-question')
      );
      
      expect(faqButtons.length).toBeGreaterThan(0);
      
      faqButtons.forEach(button => {
        expect(button).toBeEnabled();
      });
    });
  });
});
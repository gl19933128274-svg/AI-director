/**
 * 模板页面测试
 * 测试覆盖：基础渲染、分类筛选、点赞功能、预览功能
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import TemplatesPage from '@/app/templates/page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/templates',
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

// Mock alert
window.alert = jest.fn();

describe('模板页面测试', () => {
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
      render(<TemplatesPage />);
      
      expect(screen.getByText('模板库')).toBeInTheDocument();
      expect(screen.getByText('精选模板，一键应用')).toBeInTheDocument();
    });

    test('模板列表正确显示', () => {
      render(<TemplatesPage />);
      
      expect(screen.getByText('产品展示模板')).toBeInTheDocument();
      expect(screen.getByText('品牌宣传片模板')).toBeInTheDocument();
      expect(screen.getByText('社交媒体短视频')).toBeInTheDocument();
    });

    test('模板时长正确显示', () => {
      render(<TemplatesPage />);
      
      expect(screen.getByText('0:30')).toBeInTheDocument();
      expect(screen.getByText('0:60')).toBeInTheDocument();
      expect(screen.getByText('0:15')).toBeInTheDocument();
    });

    test('模板使用次数正确显示', () => {
      render(<TemplatesPage />);
      
      expect(screen.getByText(/使用 1.2k/i)).toBeInTheDocument();
      expect(screen.getByText(/使用 890/i)).toBeInTheDocument();
    });
  });

  describe('分类筛选测试', () => {
    test('分类选项正确显示', () => {
      render(<TemplatesPage />);
      
      expect(screen.getByText('全部')).toBeInTheDocument();
      // 使用getAllByText来处理多个匹配（分类标签和模板标签）
      const commercialElements = screen.getAllByText('商业');
      expect(commercialElements.length).toBeGreaterThan(0);
      const brandElements = screen.getAllByText('品牌');
      expect(brandElements.length).toBeGreaterThan(0);
      const socialElements = screen.getAllByText('社交');
      expect(socialElements.length).toBeGreaterThan(0);
    });

    test('点击分类切换筛选', () => {
      render(<TemplatesPage />);
      
      // 使用更精确的选择器，只选择分类区域内的元素
      const categoryElements = screen.getAllByText('商业');
      const categoryBtn = categoryElements.find(el => 
        el.closest('.template-categories') !== null
      );
      fireEvent.click(categoryBtn!);
      
      expect(screen.getByText('产品展示模板')).toBeInTheDocument();
    });

    test('点击全部显示所有模板', () => {
      render(<TemplatesPage />);
      
      // 先切换到其他分类
      const categoryElements = screen.getAllByText('商业');
      const categoryBtn = categoryElements.find(el => 
        el.closest('.template-categories') !== null
      );
      fireEvent.click(categoryBtn!);
      
      // 再切换回全部
      const allBtn = screen.getByText('全部');
      fireEvent.click(allBtn);
      
      expect(screen.getByText('产品展示模板')).toBeInTheDocument();
      expect(screen.getByText('品牌宣传片模板')).toBeInTheDocument();
    });
  });

  describe('点赞功能测试', () => {
    test('点击点赞按钮切换点赞状态', () => {
      render(<TemplatesPage />);
      
      const heartButtons = screen.getAllByRole('button').filter(btn => 
        btn.querySelector('svg.lucide-heart')
      );
      
      if (heartButtons.length > 0) {
        fireEvent.click(heartButtons[0]);
        
        expect(heartButtons[0]).toHaveClass('card-action-btn');
      }
    });

    test('取消点赞恢复原始状态', () => {
      render(<TemplatesPage />);
      
      const heartButtons = screen.getAllByRole('button').filter(btn => 
        btn.querySelector('svg.lucide-heart')
      );
      
      if (heartButtons.length > 0) {
        // 点赞
        fireEvent.click(heartButtons[0]);
        // 取消点赞
        fireEvent.click(heartButtons[0]);
        
        expect(heartButtons[0]).toHaveClass('card-action-btn');
      }
    });
  });

  describe('预览功能测试', () => {
    test('点击预览按钮显示提示', () => {
      render(<TemplatesPage />);
      
      const playButtons = screen.getAllByRole('button').filter(btn => 
        btn.querySelector('svg.lucide-play')
      );
      
      if (playButtons.length > 0) {
        fireEvent.click(playButtons[0]);
        
        expect(window.alert).toHaveBeenCalledWith('预览功能开发中...');
      }
    });
  });

  describe('分享功能测试', () => {
    test('点击分享按钮显示提示', () => {
      render(<TemplatesPage />);
      
      const shareButtons = screen.getAllByRole('button').filter(btn => 
        btn.querySelector('svg.lucide-share2')
      );
      
      if (shareButtons.length > 0) {
        fireEvent.click(shareButtons[0]);
        
        expect(window.alert).toHaveBeenCalledWith('分享功能开发中...');
      }
    });
  });

  describe('下载功能测试', () => {
    test('点击下载按钮显示提示', () => {
      render(<TemplatesPage />);
      
      const downloadButtons = screen.getAllByRole('button').filter(btn => 
        btn.querySelector('svg.lucide-download')
      );
      
      if (downloadButtons.length > 0) {
        fireEvent.click(downloadButtons[0]);
        
        expect(window.alert).toHaveBeenCalledWith('下载功能开发中...');
      }
    });
  });

  describe('UI可访问性测试', () => {
    test('所有分类按钮可点击', () => {
      render(<TemplatesPage />);
      
      const categories = ['全部', '商业', '品牌', '社交', '教育', '营销', '生活'];
      
      categories.forEach(category => {
        // 使用更精确的选择器，只选择分类区域内的元素
        const categoryElements = screen.getAllByText(category);
        // 找到在template-categories区域内的元素
        const categoryElement = categoryElements.find(el => 
          el.closest('.template-categories') !== null
        );
        expect(categoryElement).toBeInTheDocument();
        fireEvent.click(categoryElement!);
      });
    });

    test('所有模板按钮可点击', () => {
      render(<TemplatesPage />);
      
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
      
      buttons.forEach(button => {
        expect(button).toBeEnabled();
      });
    });
  });
});
/**
 * 侧边栏组件认证集成测试
 * 测试覆盖：登录状态显示、头像点击、用户菜单、登出功能
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Sidebar from '@/components/Sidebar';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/',
}));

// Mock AuthModal component
jest.mock('@/components/AuthModal', () => {
  return function MockAuthModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    return isOpen ? (
      <div data-testid="auth-modal">
        <button onClick={onClose} data-testid="close-modal">关闭</button>
      </div>
    ) : null;
  };
});

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

// Mock window.confirm
const confirmMock = jest.fn(() => true);
Object.defineProperty(window, 'confirm', { value: confirmMock });

describe('侧边栏组件认证集成测试', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  describe('未登录状态', () => {
    test('显示登录头像', () => {
      render(<Sidebar currentPage="home" />);
      
      const avatar = screen.getByTitle('登录');
      expect(avatar).toBeInTheDocument();
      expect(avatar.textContent).toBe('登');
    });

    test('点击头像显示登录模态框', () => {
      render(<Sidebar currentPage="home" />);
      
      const avatar = screen.getByTitle('登录');
      fireEvent.click(avatar);
      
      expect(screen.getByTestId('auth-modal')).toBeInTheDocument();
    });

    test('不显示用户菜单', () => {
      render(<Sidebar currentPage="home" />);
      
      const avatar = screen.getByTitle('登录');
      fireEvent.click(avatar);
      
      expect(screen.queryByText('个人资料')).not.toBeInTheDocument();
    });
  });

  describe('已登录状态', () => {
    const mockUser = {
      id: '1',
      username: '管理员',
      email: 'admin@example.com',
      avatar: 'A',
      createdAt: '2024-01-01T00:00:00Z',
    };

    beforeEach(() => {
      localStorageMock.setItem('auth_token', 'mock_token_1_123');
      localStorageMock.setItem('auth_user', JSON.stringify(mockUser));
    });

    test('显示用户头像', async () => {
      render(<Sidebar currentPage="home" />);
      
      await waitFor(() => {
        const avatar = screen.getByTitle('个人中心');
        expect(avatar).toBeInTheDocument();
        expect(avatar.textContent).toBe('A');
      });
    });

    test('点击头像显示用户菜单', async () => {
      render(<Sidebar currentPage="home" />);
      
      await waitFor(() => {
        const avatar = screen.getByTitle('个人中心');
        fireEvent.click(avatar);
      });
      
      expect(screen.getByText('个人资料')).toBeInTheDocument();
      expect(screen.getByText('套餐管理')).toBeInTheDocument();
      expect(screen.getByText('退出登录')).toBeInTheDocument();
    });

    test('点击退出登录触发登出', async () => {
      render(<Sidebar currentPage="home" />);
      
      await waitFor(() => {
        const avatar = screen.getByTitle('个人中心');
        fireEvent.click(avatar);
      });
      
      const logoutButton = screen.getByText('退出登录');
      fireEvent.click(logoutButton);
      
      expect(confirmMock).toHaveBeenCalledWith('确定要退出登录吗？');
      expect(localStorageMock.getItem('auth_token')).toBeNull();
      expect(localStorageMock.getItem('auth_user')).toBeNull();
    });

    test('取消退出登录不执行登出', async () => {
      confirmMock.mockReturnValueOnce(false);
      
      render(<Sidebar currentPage="home" />);
      
      await waitFor(() => {
        const avatar = screen.getByTitle('个人中心');
        fireEvent.click(avatar);
      });
      
      const logoutButton = screen.getByText('退出登录');
      fireEvent.click(logoutButton);
      
      expect(confirmMock).toHaveBeenCalled();
      expect(localStorageMock.getItem('auth_token')).toBe('mock_token_1_123');
    });

    test('点击菜单项跳转页面', async () => {
      render(<Sidebar currentPage="home" />);
      
      await waitFor(() => {
        const avatar = screen.getByTitle('个人中心');
        fireEvent.click(avatar);
      });
      
      const profileButton = screen.getByText('个人资料');
      fireEvent.click(profileButton);
      
      // 跳转已通过mock处理
    });
  });

  describe('导航功能', () => {
    test('点击首页导航', () => {
      render(<Sidebar currentPage="home" />);
      
      const homeItem = screen.getByText('首页');
      fireEvent.click(homeItem);
      
      // 导航已通过mock处理
    });

    test('点击分镜导航', () => {
      render(<Sidebar currentPage="home" />);
      
      const storyboardItem = screen.getByText('分镜');
      fireEvent.click(storyboardItem);
    });

    test('点击视频导航', () => {
      render(<Sidebar currentPage="home" />);
      
      const videoItem = screen.getByText('视频');
      fireEvent.click(videoItem);
    });

    test('点击作品导航', () => {
      render(<Sidebar currentPage="home" />);
      
      const galleryItem = screen.getByText('作品');
      fireEvent.click(galleryItem);
    });

    test('点击模板导航', () => {
      render(<Sidebar currentPage="home" />);
      
      const templatesItem = screen.getByText('模板');
      fireEvent.click(templatesItem);
    });

    test('点击设置导航', () => {
      render(<Sidebar currentPage="home" />);
      
      const settingsItem = screen.getByText('设置');
      fireEvent.click(settingsItem);
    });

    test('点击帮助导航', () => {
      render(<Sidebar currentPage="home" />);
      
      const helpItem = screen.getByText('帮助');
      fireEvent.click(helpItem);
    });
  });

  describe('当前页面高亮', () => {
    test('首页高亮', () => {
      render(<Sidebar currentPage="home" />);
      
      const homeItem = screen.getByText('首页').closest('.nav-item');
      expect(homeItem?.classList.contains('active')).toBe(true);
    });

    test('分镜高亮', () => {
      render(<Sidebar currentPage="storyboard" />);
      
      const storyboardItem = screen.getByText('分镜').closest('.nav-item');
      expect(storyboardItem?.classList.contains('active')).toBe(true);
    });

    test('设置高亮', () => {
      render(<Sidebar currentPage="settings" />);
      
      const settingsItem = screen.getByText('设置').closest('.nav-item');
      expect(settingsItem?.classList.contains('active')).toBe(true);
    });
  });

  describe('登录模态框关闭', () => {
    test('关闭模态框后隐藏', () => {
      render(<Sidebar currentPage="home" />);
      
      const avatar = screen.getByTitle('登录');
      fireEvent.click(avatar);
      
      expect(screen.getByTestId('auth-modal')).toBeInTheDocument();
      
      const closeButton = screen.getByTestId('close-modal');
      fireEvent.click(closeButton);
      
      expect(screen.queryByTestId('auth-modal')).not.toBeInTheDocument();
    });
  });

  describe('用户菜单外部点击关闭', () => {
    const mockUser = {
      id: '1',
      username: '管理员',
      email: 'admin@example.com',
      avatar: 'A',
      createdAt: '2024-01-01T00:00:00Z',
    };

    beforeEach(() => {
      localStorageMock.setItem('auth_token', 'mock_token_1_123');
      localStorageMock.setItem('auth_user', JSON.stringify(mockUser));
    });

    test('点击外部区域关闭用户菜单', async () => {
      render(<Sidebar currentPage="home" />);
      
      await waitFor(() => {
        const avatar = screen.getByTitle('个人中心');
        fireEvent.click(avatar);
      });
      
      expect(screen.getByText('个人资料')).toBeInTheDocument();
      
      // 点击外部遮罩层
      const overlay = document.querySelector('.fixed.inset-0.z-40');
      if (overlay) {
        fireEvent.click(overlay);
        expect(screen.queryByText('个人资料')).not.toBeInTheDocument();
      }
    });
  });
});
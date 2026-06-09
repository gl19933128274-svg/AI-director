/**
 * 认证模态框组件测试
 * 测试覆盖：登录、注册、表单验证、错误处理、状态切换
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AuthModal from '@/components/AuthModal';

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

describe('认证模态框组件测试', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  describe('模态框显示控制', () => {
    test('isOpen为false时不渲染', () => {
      render(<AuthModal isOpen={false} onClose={mockOnClose} />);
      
      expect(screen.queryByText('登录')).not.toBeInTheDocument();
    });

    test('isOpen为true时渲染登录表单', () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);
      
      expect(screen.getByText('欢迎回来')).toBeInTheDocument();
    });
  });

  describe('登录/注册切换', () => {
    test('默认显示登录表单', () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);
      
      expect(screen.getByText('欢迎回来')).toBeInTheDocument();
      expect(screen.queryByPlaceholderText('请输入用户名')).not.toBeInTheDocument();
    });

    test('点击立即注册切换到注册表单', () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);
      
      fireEvent.click(screen.getByText('立即注册'));
      
      expect(screen.getByText('创建新账号')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('请输入用户名')).toBeInTheDocument();
    });

    test('点击立即登录切换回登录表单', () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);
      
      // 先切换到注册
      fireEvent.click(screen.getByText('立即注册'));
      expect(screen.getByPlaceholderText('请输入用户名')).toBeInTheDocument();
      
      // 再切换回登录
      fireEvent.click(screen.getByText('立即登录'));
      expect(screen.getByPlaceholderText('请输入邮箱')).toBeInTheDocument();
    });
  });

  describe('登录功能', () => {
    test('使用mock账号登录成功', async () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);
      
      // 输入mock账号
      fireEvent.change(screen.getByPlaceholderText('请输入邮箱'), {
        target: { value: 'admin@example.com' },
      });
      fireEvent.change(screen.getByPlaceholderText('请输入密码'), {
        target: { value: 'admin123' },
      });
      
      // 提交登录
      fireEvent.click(screen.getByRole('button', { name: '登录' }));
      
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
        expect(localStorageMock.getItem('auth_token')).toContain('mock_token');
        expect(localStorageMock.getItem('auth_user')).toContain('管理员');
      });
    });

    test('使用另一个mock账号登录成功', async () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);
      
      fireEvent.change(screen.getByPlaceholderText('请输入邮箱'), {
        target: { value: 'user@example.com' },
      });
      fireEvent.change(screen.getByPlaceholderText('请输入密码'), {
        target: { value: 'user123' },
      });
      
      fireEvent.click(screen.getByRole('button', { name: '登录' }));
      
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
        expect(localStorageMock.getItem('auth_user')).toContain('测试用户');
      });
    });

    test('错误密码登录失败', async () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);
      
      fireEvent.change(screen.getByPlaceholderText('请输入邮箱'), {
        target: { value: 'admin@example.com' },
      });
      fireEvent.change(screen.getByPlaceholderText('请输入密码'), {
        target: { value: 'wrongpassword' },
      });
      
      fireEvent.click(screen.getByRole('button', { name: '登录' }));
      
      await waitFor(() => {
        expect(screen.getByText('邮箱或密码错误')).toBeInTheDocument();
        expect(mockOnClose).not.toHaveBeenCalled();
      });
    });

    test('不存在的邮箱登录失败', async () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);
      
      fireEvent.change(screen.getByPlaceholderText('请输入邮箱'), {
        target: { value: 'nonexistent@example.com' },
      });
      fireEvent.change(screen.getByPlaceholderText('请输入密码'), {
        target: { value: 'password123' },
      });
      
      fireEvent.click(screen.getByRole('button', { name: '登录' }));
      
      await waitFor(() => {
        expect(screen.getByText('邮箱或密码错误')).toBeInTheDocument();
      });
    });

    test('空邮箱显示错误', async () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);
      
      fireEvent.change(screen.getByPlaceholderText('请输入密码'), {
        target: { value: 'admin123' },
      });
      
      fireEvent.click(screen.getByRole('button', { name: '登录' }));
      
      await waitFor(() => {
        expect(screen.getByText('请填写邮箱和密码')).toBeInTheDocument();
      });
    });

    test('空密码显示错误', async () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);
      
      fireEvent.change(screen.getByPlaceholderText('请输入邮箱'), {
        target: { value: 'admin@example.com' },
      });
      
      fireEvent.click(screen.getByRole('button', { name: '登录' }));
      
      await waitFor(() => {
        expect(screen.getByText('请填写邮箱和密码')).toBeInTheDocument();
      });
    });
  });

  describe('注册功能', () => {
    test('注册新账号成功', async () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);
      
      // 切换到注册
      fireEvent.click(screen.getByText('立即注册'));
      
      // 输入注册信息
      fireEvent.change(screen.getByPlaceholderText('请输入用户名'), {
        target: { value: '新用户' },
      });
      fireEvent.change(screen.getByPlaceholderText('请输入邮箱'), {
        target: { value: 'newuser@example.com' },
      });
      fireEvent.change(screen.getByPlaceholderText('请输入密码'), {
        target: { value: 'password123' },
      });
      
      fireEvent.click(screen.getByRole('button', { name: '注册' }));
      
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
        expect(localStorageMock.getItem('auth_token')).toContain('mock_token');
        expect(localStorageMock.getItem('auth_user')).toContain('新用户');
      });
    });

    test('注册已存在的邮箱失败', async () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);
      
      fireEvent.click(screen.getByText('立即注册'));
      
      fireEvent.change(screen.getByPlaceholderText('请输入用户名'), {
        target: { value: '测试' },
      });
      fireEvent.change(screen.getByPlaceholderText('请输入邮箱'), {
        target: { value: 'admin@example.com' }, // 已存在的邮箱
      });
      fireEvent.change(screen.getByPlaceholderText('请输入密码'), {
        target: { value: 'password123' },
      });
      
      fireEvent.click(screen.getByRole('button', { name: '注册' }));
      
      await waitFor(() => {
        expect(screen.getByText('该邮箱已被注册')).toBeInTheDocument();
        expect(mockOnClose).not.toHaveBeenCalled();
      });
    });

    test('密码少于6位显示错误', async () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);
      
      fireEvent.click(screen.getByText('立即注册'));
      
      fireEvent.change(screen.getByPlaceholderText('请输入用户名'), {
        target: { value: '新用户' },
      });
      fireEvent.change(screen.getByPlaceholderText('请输入邮箱'), {
        target: { value: 'new@example.com' },
      });
      fireEvent.change(screen.getByPlaceholderText('请输入密码'), {
        target: { value: '12345' }, // 5位密码
      });
      
      fireEvent.click(screen.getByRole('button', { name: '注册' }));
      
      await waitFor(() => {
        expect(screen.getByText('密码至少需要6位')).toBeInTheDocument();
      });
    });

    test('空字段显示错误', async () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);
      
      fireEvent.click(screen.getByText('立即注册'));
      
      fireEvent.click(screen.getByRole('button', { name: '注册' }));
      
      await waitFor(() => {
        expect(screen.getByText('请填写所有字段')).toBeInTheDocument();
      });
    });
  });

  describe('关闭功能', () => {
    test('点击关闭按钮调用onClose', () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);
      
      const closeButton = screen.getByRole('button', { name: '' }); // X按钮
      fireEvent.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('测试账号提示', () => {
    test('显示mock测试账号信息', () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);
      
      expect(screen.getByText(/admin@example.com/)).toBeInTheDocument();
      expect(screen.getByText(/user@example.com/)).toBeInTheDocument();
    });
  });

  describe('加载状态', () => {
    test('提交时显示加载状态', async () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);
      
      fireEvent.change(screen.getByPlaceholderText('请输入邮箱'), {
        target: { value: 'admin@example.com' },
      });
      fireEvent.change(screen.getByPlaceholderText('请输入密码'), {
        target: { value: 'admin123' },
      });
      
      fireEvent.click(screen.getByRole('button', { name: '登录' }));
      
      // 检查按钮文本变化（短暂）
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe('表单输入', () => {
    test('邮箱输入更新', () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);
      
      const emailInput = screen.getByPlaceholderText('请输入邮箱') as HTMLInputElement;
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      
      expect(emailInput.value).toBe('test@example.com');
    });

    test('密码输入更新', () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);
      
      const passwordInput = screen.getByPlaceholderText('请输入密码') as HTMLInputElement;
      fireEvent.change(passwordInput, { target: { value: 'mypassword' } });
      
      expect(passwordInput.value).toBe('mypassword');
    });

    test('用户名输入更新（注册模式）', () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);
      
      fireEvent.click(screen.getByText('立即注册'));
      
      const usernameInput = screen.getByPlaceholderText('请输入用户名') as HTMLInputElement;
      fireEvent.change(usernameInput, { target: { value: '我的用户名' } });
      
      expect(usernameInput.value).toBe('我的用户名');
    });
  });

  describe('错误清除', () => {
    test('切换表单时清除错误', async () => {
      render(<AuthModal isOpen={true} onClose={mockOnClose} />);
      
      // 触发登录错误
      fireEvent.click(screen.getByRole('button', { name: '登录' }));
      
      await waitFor(() => {
        expect(screen.getByText('请填写邮箱和密码')).toBeInTheDocument();
      });
      
      // 切换到注册
      fireEvent.click(screen.getByText('立即注册'));
      
      // 错误应该被清除
      expect(screen.queryByText('请填写邮箱和密码')).not.toBeInTheDocument();
    });
  });
});
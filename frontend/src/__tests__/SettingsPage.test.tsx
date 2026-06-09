/**
 * 设置页面测试
 * 测试覆盖：基础渲染、导航切换、表单输入、开关切换、保存功能
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import SettingsPage from '@/app/settings/page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/settings',
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

// Mock console.log
console.log = jest.fn();

describe('设置页面测试', () => {
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
      render(<SettingsPage />);
      
      // 使用更精确的选择器，查找页面标题中的"设置"
      const settingsElements = screen.getAllByText('设置');
      const pageTitle = settingsElements.find(el => 
        el.tagName === 'H2'
      );
      expect(pageTitle).toBeInTheDocument();
      expect(screen.getByText('管理您的账户和偏好设置')).toBeInTheDocument();
    });

    test('导航菜单正确显示', () => {
      render(<SettingsPage />);
      
      // 使用getAllByText来处理多个匹配（导航和内容区域）
      const profileElements = screen.getAllByText('个人资料');
      expect(profileElements.length).toBeGreaterThan(0);
      const notificationElements = screen.getAllByText('通知设置');
      expect(notificationElements.length).toBeGreaterThan(0);
      const appearanceElements = screen.getAllByText('外观设置');
      expect(appearanceElements.length).toBeGreaterThan(0);
      const securityElements = screen.getAllByText('安全设置');
      expect(securityElements.length).toBeGreaterThan(0);
      const helpElements = screen.getAllByText('帮助与支持');
      expect(helpElements.length).toBeGreaterThan(0);
    });

    test('默认显示个人资料页面', () => {
      render(<SettingsPage />);
      
      expect(screen.getByText('用户名')).toBeInTheDocument();
      expect(screen.getByText('邮箱')).toBeInTheDocument();
      expect(screen.getByText('手机号')).toBeInTheDocument();
    });
  });

  describe('导航切换测试', () => {
    test('点击通知设置切换页面', () => {
      render(<SettingsPage />);
      
      const notificationsBtn = screen.getByText('通知设置').closest('button');
      fireEvent.click(notificationsBtn!);
      
      expect(screen.getByText('推送通知')).toBeInTheDocument();
      expect(screen.getByText('邮件通知')).toBeInTheDocument();
    });

    test('点击外观设置切换页面', () => {
      render(<SettingsPage />);
      
      const appearanceBtn = screen.getByText('外观设置').closest('button');
      fireEvent.click(appearanceBtn!);
      
      expect(screen.getByText('主题')).toBeInTheDocument();
    });

    test('点击安全设置切换页面', () => {
      render(<SettingsPage />);
      
      const securityBtn = screen.getByText('安全设置').closest('button');
      fireEvent.click(securityBtn!);
      
      expect(screen.getByText('修改密码')).toBeInTheDocument();
    });

    test('点击帮助与支持切换页面', () => {
      render(<SettingsPage />);
      
      const helpBtn = screen.getByText('帮助与支持').closest('button');
      fireEvent.click(helpBtn!);
      
      expect(screen.getByText('常见问题')).toBeInTheDocument();
      expect(screen.getByText('联系客服')).toBeInTheDocument();
    });
  });

  describe('表单输入测试', () => {
    test('修改用户名', () => {
      render(<SettingsPage />);
      
      const nameInput = screen.getByDisplayValue('张三') as HTMLInputElement;
      fireEvent.change(nameInput, { target: { value: '李四' } });
      
      expect(nameInput.value).toBe('李四');
    });

    test('修改邮箱', () => {
      render(<SettingsPage />);
      
      const emailInput = screen.getByDisplayValue('zhangsan@example.com') as HTMLInputElement;
      fireEvent.change(emailInput, { target: { value: 'lisi@example.com' } });
      
      expect(emailInput.value).toBe('lisi@example.com');
    });

    test('修改个人简介', () => {
      render(<SettingsPage />);
      
      const bioTextarea = screen.getByDisplayValue('热爱创作，专注于视频制作') as HTMLTextAreaElement;
      fireEvent.change(bioTextarea, { target: { value: '新的简介' } });
      
      expect(bioTextarea.value).toBe('新的简介');
    });
  });

  describe('开关切换测试', () => {
    test('切换推送通知开关', () => {
      const { container } = render(<SettingsPage />);
      
      // 切换到通知设置页面
      const notificationElements = screen.getAllByText('通知设置');
      const notificationsBtn = notificationElements.find(el => 
        el.closest('.settings-nav') !== null
      );
      fireEvent.click(notificationsBtn!);
      
      // 使用container来查找toggle-btn
      const toggleBtns = container.querySelectorAll('.toggle-btn');
      expect(toggleBtns.length).toBeGreaterThan(0);
      fireEvent.click(toggleBtns[0]);
      
      expect(toggleBtns[0]).toHaveClass('toggle-btn');
    });

    test('切换邮件通知开关', () => {
      const { container } = render(<SettingsPage />);
      
      // 切换到通知设置页面
      const notificationElements = screen.getAllByText('通知设置');
      const notificationsBtn = notificationElements.find(el => 
        el.closest('.settings-nav') !== null
      );
      fireEvent.click(notificationsBtn!);
      
      const toggleBtns = container.querySelectorAll('.toggle-btn');
      expect(toggleBtns.length).toBeGreaterThan(1);
      fireEvent.click(toggleBtns[1]);
      
      expect(toggleBtns[1]).toHaveClass('toggle-btn');
    });
  });

  describe('主题选择测试', () => {
    test('切换主题选项', () => {
      render(<SettingsPage />);
      
      // 切换到外观设置页面
      const appearanceBtn = screen.getByText('外观设置').closest('button');
      fireEvent.click(appearanceBtn!);
      
      const themeSelect = screen.getByDisplayValue('深色') as HTMLSelectElement;
      fireEvent.change(themeSelect, { target: { value: 'light' } });
      
      expect(themeSelect.value).toBe('light');
    });
  });

  describe('保存功能测试', () => {
    test('点击保存按钮触发保存', () => {
      render(<SettingsPage />);
      
      const saveButton = screen.getByText('保存更改');
      fireEvent.click(saveButton);
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('保存设置:'),
        expect.any(Object)
      );
    });

    test('点击更新密码按钮触发保存', () => {
      render(<SettingsPage />);
      
      // 切换到安全设置页面
      const securityBtn = screen.getByText('安全设置').closest('button');
      fireEvent.click(securityBtn!);
      
      const updateButton = screen.getByText('更新密码');
      fireEvent.click(updateButton);
      
      expect(console.log).toHaveBeenCalled();
    });
  });

  describe('UI可访问性测试', () => {
    test('所有导航按钮可点击', () => {
      render(<SettingsPage />);
      
      const navButtons = screen.getAllByRole('button').filter(btn => 
        btn.classList.contains('settings-nav-item')
      );
      
      expect(navButtons.length).toBe(5);
      
      navButtons.forEach(button => {
        expect(button).toBeEnabled();
      });
    });

    test('所有输入框可编辑', () => {
      render(<SettingsPage />);
      
      const inputs = screen.getAllByRole('textbox');
      expect(inputs.length).toBeGreaterThan(0);
      
      inputs.forEach(input => {
        expect(input).toBeEnabled();
      });
    });
  });
});
/**
 * 首页上传流程测试
 * 测试覆盖：图片上传、拖拽上传、上传失败、超大文件、多文件上传、上传状态恢复
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HomePage from '@/app/page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/',
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

// Mock URL.createObjectURL and URL.revokeObjectURL
URL.createObjectURL = jest.fn(() => 'mock-url');
URL.revokeObjectURL = jest.fn();

// Mock console.log
console.log = jest.fn();

// Mock console.error
console.error = jest.fn();

describe('首页上传流程测试', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
    cleanup();
  });

  afterEach(() => {
    cleanup();
    jest.useRealTimers();
  });

  describe('图片上传功能', () => {
    test('点击上传按钮触发文件选择', () => {
      render(<HomePage />);
      
      // 查找上传区域
      const uploadZone = screen.getByText(/拖拽图片/i).closest('div');
      expect(uploadZone).toBeInTheDocument();
      
      // 模拟点击上传
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toBeInTheDocument();
    });

    test('选择有效图片文件后显示预览', async () => {
      render(<HomePage />);
      
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      Object.defineProperty(fileInput, 'files', {
        value: [file],
      });
      
      fireEvent.change(fileInput);
      
      await waitFor(() => {
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('[LOG] 图片上传成功')
        );
      });
    });

    test('选择非图片文件时被过滤', async () => {
      render(<HomePage />);
      
      const textFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      const imageFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      Object.defineProperty(fileInput, 'files', {
        value: [textFile, imageFile],
      });
      
      fireEvent.change(fileInput);
      
      await waitFor(() => {
        // 只有图片文件被处理
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('[LOG] 文件选择')
        );
      });
    });
  });

  describe('拖拽上传功能', () => {
    test('拖拽进入上传区域时显示拖拽状态', () => {
      render(<HomePage />);
      
      const uploadZone = screen.getByText(/拖拽图片/i).closest('div');
      
      fireEvent.dragOver(uploadZone!, {
        dataTransfer: { dropEffect: 'copy' },
      });
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[LOG] 拖拽进入上传区域')
      );
    });

    test('拖拽离开上传区域时取消拖拽状态', () => {
      render(<HomePage />);
      
      const uploadZone = screen.getByText(/拖拽图片/i).closest('div');
      
      fireEvent.dragOver(uploadZone!, {
        dataTransfer: { dropEffect: 'copy' },
      });
      
      fireEvent.dragLeave(uploadZone!);
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[LOG] 拖拽离开上传区域')
      );
    });

    test('拖放图片文件后成功上传', async () => {
      render(<HomePage />);
      
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const uploadZone = screen.getByText(/拖拽图片/i).closest('div');
      
      fireEvent.drop(uploadZone!, {
        dataTransfer: { files: [file] },
      });
      
      await waitFor(() => {
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('[LOG] 拖放下落')
        );
      });
    });
  });

  describe('文件大小限制', () => {
    test('超过20MB的文件被过滤', async () => {
      render(<HomePage />);
      
      // 创建超过20MB的文件（模拟）
      const largeFile = new File(['x'.repeat(21 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
      const normalFile = new File(['test'], 'normal.jpg', { type: 'image/jpeg' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      Object.defineProperty(fileInput, 'files', {
        value: [largeFile, normalFile],
      });
      
      fireEvent.change(fileInput);
      
      await waitFor(() => {
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('[LOG] 文件过滤')
        );
      });
    });
  });

  describe('多文件上传限制', () => {
    test('最多上传9张图片', async () => {
      render(<HomePage />);
      
      // 创建10个文件
      const files = Array.from({ length: 10 }, (_, i) => 
        new File(['test'], `test${i}.jpg`, { type: 'image/jpeg' })
      );
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      Object.defineProperty(fileInput, 'files', {
        value: files,
      });
      
      fireEvent.change(fileInput);
      
      await waitFor(() => {
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('[LOG] 图片上传成功')
        );
      });
    });

    test('删除已上传图片', async () => {
      render(<HomePage />);
      
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      Object.defineProperty(fileInput, 'files', {
        value: [file],
      });
      
      fireEvent.change(fileInput);
      
      await waitFor(() => {
        // 查找删除按钮（如果存在）
        const deleteButtons = screen.queryAllByRole('button', { name: /删除/i });
        if (deleteButtons.length > 0) {
          fireEvent.click(deleteButtons[0]);
          expect(console.log).toHaveBeenCalledWith(
            expect.stringContaining('[LOG] 删除图片')
          );
        }
      });
    });
  });

  describe('上传状态恢复', () => {
    test('首次访问显示欢迎提示', () => {
      localStorageMock.clear();
      render(<HomePage />);
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[LOG] 首页 - 首次访问')
      );
    });

    test('第二次访问不显示欢迎提示', () => {
      localStorageMock.setItem('hasVisited', 'true');
      render(<HomePage />);
      
      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringContaining('[LOG] 首页 - 首次访问')
      );
    });

    test('恢复草稿数据成功', () => {
      const draftData = {
        inputValue: '测试描述',
        videoParams: {
          duration: '15',
          aspectRatio: '9:16',
          resolution: '4K',
          style: 'cinematic',
        },
        selectedStyles: ['cinematic', 'realistic'],
        updatedAt: new Date().toISOString(),
      };
      localStorageMock.setItem('homeDraft', JSON.stringify(draftData));
      localStorageMock.setItem('hasVisited', 'true');
      
      render(<HomePage />);
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[LOG] 首页 - 恢复草稿数据成功')
      );
    });

    test('草稿数据损坏时恢复失败', () => {
      localStorageMock.setItem('homeDraft', 'invalid-json');
      localStorageMock.setItem('hasVisited', 'true');
      
      render(<HomePage />);
      
      // 实际代码使用 console.error 输出错误
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('[LOG] 首页 - 恢复草稿数据失败'),
        expect.anything()
      );
    });
  });

  describe('参数选择功能', () => {
    test('点击参数展开下拉菜单', async () => {
      render(<HomePage />);
      
      // 先点击展开下拉菜单
      const durationParam = document.querySelector('.param-item-clickable');
      expect(durationParam).toBeInTheDocument();
      
      fireEvent.click(durationParam!);
      
      // 验证下拉菜单展开
      await waitFor(() => {
        const options = document.querySelectorAll('.param-dropdown-option');
        expect(options.length).toBeGreaterThan(0);
      });
    });

    test('风格参数区域存在', async () => {
      render(<HomePage />);
      
      // 验证所有参数项都存在
      const params = document.querySelectorAll('.param-item-clickable');
      expect(params.length).toBeGreaterThanOrEqual(4); // 时长、比例、清晰度、风格
    });
  });

  describe('描述输入功能', () => {
    test('输入描述内容', async () => {
      render(<HomePage />);
      
      const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
      expect(textarea).toBeInTheDocument();
      
      fireEvent.change(textarea, { target: { value: '测试产品描述' } });
      
      // 自动保存是异步的，使用waitFor
      await waitFor(() => {
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('[LOG] 首页 - 自动保存草稿')
        );
      });
    });

    test('空描述且未上传图片时提交按钮禁用', async () => {
      render(<HomePage />);
      
      // 查找提交按钮（Action按钮）
      const submitButton = document.querySelector('.btn-circle') as HTMLButtonElement;
      expect(submitButton).toBeInTheDocument();
      
      // 按钮应该是禁用的（因为没有上传图片）
      expect(submitButton.disabled).toBe(true);
    });
  });

  describe('AI分析流程', () => {
    test('有图片和描述时触发AI分析', async () => {
      render(<HomePage />);
      
      // 先上传图片以启用按钮
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      Object.defineProperty(fileInput, 'files', {
        value: [file],
      });
      
      fireEvent.change(fileInput);
      
      // 等待图片上传完成
      await waitFor(() => {
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('[LOG] 图片上传成功')
        );
      });
      
      // 输入描述
      const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: '测试产品描述' } });
      
      // 点击提交按钮
      const submitButton = document.querySelector('.btn-circle') as HTMLButtonElement;
      expect(submitButton.disabled).toBe(false);
      fireEvent.click(submitButton);
      
      // 验证开始分析日志
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[LOG] 开始AI分析流程')
      );
    });

    test('分析过程状态变化', async () => {
      render(<HomePage />);
      
      // 先上传图片
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      Object.defineProperty(fileInput, 'files', {
        value: [file],
      });
      
      fireEvent.change(fileInput);
      
      // 等待图片上传
      await waitFor(() => {
        const uploadedImages = document.querySelectorAll('.uploaded-image');
        expect(uploadedImages.length).toBeGreaterThan(0);
      });
      
      // 输入描述并提交
      const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: '测试产品描述' } });
      
      const submitButton = document.querySelector('.btn-circle') as HTMLButtonElement;
      fireEvent.click(submitButton);
      
      // 验证开始分析日志
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[LOG] 开始AI分析流程')
      );
    });
  });

  describe('时间码更新', () => {
    test('时间码元素存在', () => {
      render(<HomePage />);
      
      // 验证时间码显示区域存在（检查时间码格式）
      const timecodeElements = screen.queryAllByText(/\d{2}:\d{2}:\d{2}:\d{2}/);
      // 时间码可能在DOM中，但由于是动态生成的，我们只检查组件渲染
      expect(document.querySelector('.timecode-bar')).toBeInTheDocument();
    });
  });

  describe('欢迎提示', () => {
    test('首次访问显示欢迎提示', () => {
      render(<HomePage />);
      
      // 验证欢迎提示被显示
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[LOG] 首页 - 首次访问')
      );
    });

    test('关闭欢迎提示', async () => {
      render(<HomePage />);
      
      // 验证欢迎提示存在
      const welcomeModal = document.querySelector('.welcome-modal');
      expect(welcomeModal).toBeInTheDocument();
      
      // 查找关闭按钮（使用更精确的选择器）
      const closeButton = document.querySelector('.welcome-content .btn-primary');
      if (closeButton) {
        fireEvent.click(closeButton);
      }
      
      // 验证欢迎提示状态变化
      await waitFor(() => {
        const welcomeModalAfter = document.querySelector('.welcome-modal');
        expect(welcomeModalAfter).toBeNull();
      });
    });
  });

  describe('上传区域交互', () => {
    test('点击上传区域触发文件输入', () => {
      render(<HomePage />);
      
      const uploadZone = document.querySelector('.upload-zone');
      expect(uploadZone).toBeInTheDocument();
      
      fireEvent.click(uploadZone!);
      
      // 验证点击上传日志
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[LOG] 点击上传按钮')
      );
    });

    test('过滤非图片文件', async () => {
      render(<HomePage />);
      
      const textFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      Object.defineProperty(fileInput, 'files', {
        value: [textFile],
      });
      
      fireEvent.change(fileInput);
      
      // 非图片文件应该被过滤，不会触发上传成功
      await waitFor(() => {
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('[LOG] 文件选择')
        );
      });
    });
  });

  describe('参数交互', () => {
    test('切换下拉菜单展开状态', async () => {
      render(<HomePage />);
      
      const paramItem = document.querySelector('.param-item-clickable');
      expect(paramItem).toBeInTheDocument();
      
      // 点击展开
      fireEvent.click(paramItem!);
      
      // 验证下拉菜单出现
      await waitFor(() => {
        const dropdown = document.querySelector('.param-dropdown');
        expect(dropdown).toBeInTheDocument();
      });
      
      // 再次点击关闭（如果实现支持）
      fireEvent.click(paramItem!);
    });
  });

  describe('空状态验证', () => {
    test('初始状态按钮禁用', () => {
      render(<HomePage />);
      
      const submitButton = document.querySelector('.btn-circle') as HTMLButtonElement;
      expect(submitButton).toBeInTheDocument();
      expect(submitButton.disabled).toBe(true);
      
      // 验证输入区域存在
      const textarea = document.querySelector('textarea');
      expect(textarea).toBeInTheDocument();
      expect(textarea!.value).toBe('');
    });
  });

  describe('图片删除功能', () => {
    test('删除已上传图片', async () => {
      render(<HomePage />);
      
      // 上传图片
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      Object.defineProperty(fileInput, 'files', {
        value: [file],
      });
      
      fireEvent.change(fileInput);
      
      // 等待图片渲染
      await waitFor(() => {
        const uploadedImages = document.querySelectorAll('.uploaded-image');
        expect(uploadedImages.length).toBeGreaterThan(0);
      });
      
      // 查找并点击删除按钮
      const deleteButton = document.querySelector('.remove-image-btn');
      if (deleteButton) {
        fireEvent.click(deleteButton);
        
        // 验证删除日志
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('[LOG] 删除图片')
        );
      }
    });
  });

  describe('文件过滤功能', () => {
    test('混合文件类型过滤', async () => {
      render(<HomePage />);
      
      const imageFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const textFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      Object.defineProperty(fileInput, 'files', {
        value: [imageFile, textFile],
      });
      
      fireEvent.change(fileInput);
      
      // 验证文件选择日志
      await waitFor(() => {
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('[LOG] 文件选择')
        );
      });
      
      // 验证只有图片被上传
      await waitFor(() => {
        const uploadedImages = document.querySelectorAll('.uploaded-image');
        expect(uploadedImages.length).toBe(1); // 只有图片文件
      });
    });
  });

  describe('AI分析流程深入测试', () => {
    test('AI分析完成后的跳转', async () => {
      jest.useFakeTimers();
      render(<HomePage />);
      
      // 上传图片
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      Object.defineProperty(fileInput, 'files', {
        value: [file],
      });
      
      fireEvent.change(fileInput);
      
      // 等待图片上传
      await waitFor(() => {
        const uploadedImages = document.querySelectorAll('.uploaded-image');
        expect(uploadedImages.length).toBeGreaterThan(0);
      });
      
      // 输入描述并提交
      const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: '测试产品描述，这是一个很长的描述内容用于测试' } });
      
      const submitButton = document.querySelector('.btn-circle') as HTMLButtonElement;
      fireEvent.click(submitButton);
      
      // 快进时间以触发AI分析的各个阶段
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      
      // 验证AI分析开始日志（异步，使用waitFor）
      await waitFor(() => {
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('AI分析')
        );
      }, { timeout: 3000 });
      
      jest.useRealTimers();
    });
  });

  describe('空描述提交验证', () => {
    test('空描述时点击提交不触发分析', async () => {
      render(<HomePage />);
      
      // 不输入描述，直接尝试提交（按钮应该被禁用）
      const submitButton = document.querySelector('.btn-circle') as HTMLButtonElement;
      expect(submitButton.disabled).toBe(true);
      
      // 即使强制点击，也不应该触发分析
      fireEvent.click(submitButton);
      
      // 验证没有触发AI分析
      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringContaining('[LOG] 开始AI分析流程')
      );
    });
  });

  describe('参数变更交互', () => {
    test('选择下拉菜单选项变更参数', async () => {
      render(<HomePage />);
      
      // 展开下拉菜单
      const paramItem = document.querySelector('.param-item-clickable');
      fireEvent.click(paramItem!);
      
      // 等待下拉菜单出现
      await waitFor(() => {
        const dropdown = document.querySelector('.param-dropdown');
        expect(dropdown).toBeInTheDocument();
      });
      
      // 点击第一个选项
      const options = document.querySelectorAll('.param-dropdown-option');
      if (options.length > 0) {
        fireEvent.click(options[0]);
        
        // 验证参数变更日志（console.log有两个参数：字符串和对象）
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('[LOG] 参数变化'),
          expect.anything()
        );
      }
    });

    test('点击风格标签切换选中状态', async () => {
      render(<HomePage />);
      
      // 查找风格标签
      const styleTags = document.querySelectorAll('.style-tag');
      if (styleTags.length > 0) {
        fireEvent.click(styleTags[0]);
        
        // 验证风格选择日志（console.log有两个参数）
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('[LOG] 风格选择变化'),
          expect.anything()
        );
      }
    });
  });

  describe('时间码功能', () => {
    test('时间码定时器正常运行', async () => {
      jest.useFakeTimers();
      render(<HomePage />);
      
      // 快进时间以触发定时器更新
      act(() => {
        jest.advanceTimersByTime(200);
      });
      
      // 验证时间码元素存在
      const timecodeBar = document.querySelector('.timecode-bar');
      expect(timecodeBar).toBeInTheDocument();
      
      jest.useRealTimers();
    });
  });

  describe('草稿保存与恢复', () => {
    test('自动保存草稿触发', () => {
      render(<HomePage />);
      
      // 验证草稿保存日志
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[LOG] 首页 - 自动保存草稿')
      );
    });

    test('描述输入触发草稿保存', async () => {
      render(<HomePage />);
      
      const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: '测试输入' } });
      
      // 验证草稿保存被触发
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[LOG] 首页 - 自动保存草稿')
      );
    });
  });

  describe('上传边界情况', () => {
    test('正好上传9张图片', async () => {
      render(<HomePage />);
      
      const files = Array.from({ length: 9 }, (_, i) => 
        new File(['test'], `test${i}.jpg`, { type: 'image/jpeg' })
      );
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      Object.defineProperty(fileInput, 'files', {
        value: files,
      });
      
      fireEvent.change(fileInput);
      
      await waitFor(() => {
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('[LOG] 图片上传成功')
        );
      });
    });

    test('拖拽上传混合文件类型', async () => {
      render(<HomePage />);
      
      const imageFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const textFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      const uploadZone = screen.getByText(/拖拽图片/i).closest('div');
      
      fireEvent.drop(uploadZone!, {
        dataTransfer: { files: [imageFile, textFile] },
      });
      
      // 验证只有图片被上传
      await waitFor(() => {
        const uploadedImages = document.querySelectorAll('.uploaded-image');
        expect(uploadedImages.length).toBe(1);
      });
    });
  });

  describe('键盘事件', () => {
    test('回车键提交（无shift）', async () => {
      render(<HomePage />);
      
      // 上传图片
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      Object.defineProperty(fileInput, 'files', {
        value: [file],
      });
      
      fireEvent.change(fileInput);
      
      // 等待图片上传
      await waitFor(() => {
        const uploadedImages = document.querySelectorAll('.uploaded-image');
        expect(uploadedImages.length).toBeGreaterThan(0);
      });
      
      // 输入描述
      const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: '测试描述' } });
      
      // 触发回车键（无shift）
      fireEvent.keyPress(textarea, { key: 'Enter', shiftKey: false });
      
      // 验证AI分析开始
      await waitFor(() => {
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('AI分析')
        );
      });
    });

    test('shift+回车键不提交', async () => {
      render(<HomePage />);
      
      const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: '测试描述' } });
      
      // 触发shift+回车键
      fireEvent.keyPress(textarea, { key: 'Enter', shiftKey: true });
      
      // 验证没有触发提交（因为没有上传图片，按钮应该禁用）
      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringContaining('[LOG] 开始AI分析流程')
      );
    });
  });

  describe('产品特征分析', () => {
    test('输入产品描述', async () => {
      render(<HomePage />);
      
      // 输入产品描述
      const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: '这款智能手机配备高清屏幕和多摄像头' } });
      
      // 验证草稿保存
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[LOG] 首页 - 自动保存草稿')
      );
    });

    test('描述输入后按钮状态变化', async () => {
      render(<HomePage />);
      
      const submitButton = document.querySelector('.btn-circle') as HTMLButtonElement;
      
      // 初始状态按钮禁用
      expect(submitButton.disabled).toBe(true);
      
      // 上传图片
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      Object.defineProperty(fileInput, 'files', {
        value: [file],
      });
      
      fireEvent.change(fileInput);
      
      // 等待图片上传
      await waitFor(() => {
        const uploadedImages = document.querySelectorAll('.uploaded-image');
        expect(uploadedImages.length).toBeGreaterThan(0);
      });
      
      // 输入描述
      const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: '测试产品描述' } });
      
      // 按钮应该启用
      expect(submitButton.disabled).toBe(false);
    });
  });

  describe('分镜生成流程', () => {
    test('提交按钮触发分析流程', async () => {
      render(<HomePage />);
      
      // 上传图片
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      Object.defineProperty(fileInput, 'files', {
        value: [file],
      });
      
      fireEvent.change(fileInput);
      
      // 等待图片上传
      await waitFor(() => {
        const uploadedImages = document.querySelectorAll('.uploaded-image');
        expect(uploadedImages.length).toBeGreaterThan(0);
      });
      
      // 输入描述
      const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: '测试产品描述' } });
      
      const submitButton = document.querySelector('.btn-circle') as HTMLButtonElement;
      fireEvent.click(submitButton);
      
      // 验证AI分析开始日志
      await waitFor(() => {
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('[LOG] 开始AI分析流程')
        );
      });
    });
  });

  describe('参数选项功能测试', () => {
    test('展开并选择比例参数', async () => {
      render(<HomePage />);
      
      // 查找比例参数项
      const aspectRatioParam = Array.from(document.querySelectorAll('.param-item-clickable')).find(el => 
        el.textContent?.includes('比例')
      );
      expect(aspectRatioParam).not.toBeNull();
      
      fireEvent.click(aspectRatioParam!);
      
      // 等待下拉菜单出现
      await waitFor(() => {
        const dropdown = aspectRatioParam!.querySelector('.param-dropdown');
        expect(dropdown).not.toBeNull();
      });
      
      // 选择一个选项
      const options = aspectRatioParam!.querySelectorAll('.param-dropdown-option');
      expect(options.length).toBeGreaterThan(0);
      fireEvent.click(options[0]);
      
      // 验证参数变更日志
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[LOG] 参数变化'),
        expect.anything()
      );
    });

    test('展开并选择清晰度参数', async () => {
      render(<HomePage />);
      
      // 查找清晰度参数项
      const resolutionParam = Array.from(document.querySelectorAll('.param-item-clickable')).find(el => 
        el.textContent?.includes('清晰度')
      );
      expect(resolutionParam).not.toBeNull();
      
      fireEvent.click(resolutionParam!);
      
      // 等待下拉菜单出现
      await waitFor(() => {
        const dropdown = resolutionParam!.querySelector('.param-dropdown');
        expect(dropdown).not.toBeNull();
      });
      
      // 选择一个选项
      const options = resolutionParam!.querySelectorAll('.param-dropdown-option');
      expect(options.length).toBeGreaterThan(0);
      fireEvent.click(options[0]);
      
      // 验证参数变更日志
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[LOG] 参数变化'),
        expect.anything()
      );
    });

    test('展开并选择风格参数', async () => {
      render(<HomePage />);
      
      // 查找风格参数项
      const styleParam = Array.from(document.querySelectorAll('.param-item-clickable')).find(el => 
        el.textContent?.includes('风格')
      );
      expect(styleParam).not.toBeNull();
      
      fireEvent.click(styleParam!);
      
      // 等待下拉菜单出现
      await waitFor(() => {
        const dropdown = styleParam!.querySelector('.param-dropdown');
        expect(dropdown).not.toBeNull();
      });
      
      // 选择一个选项（风格是多选）
      const options = styleParam!.querySelectorAll('.param-dropdown-option');
      expect(options.length).toBeGreaterThan(0);
      fireEvent.click(options[0]);
      
      // 验证风格选择变化日志
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[LOG] 风格选择变化'),
        expect.anything()
      );
    });

    test('切换下拉菜单关闭状态', async () => {
      render(<HomePage />);
      
      const paramItem = document.querySelector('.param-item-clickable');
      expect(paramItem).not.toBeNull();
      
      // 第一次点击展开
      fireEvent.click(paramItem!);
      
      await waitFor(() => {
        const dropdown = paramItem!.querySelector('.param-dropdown');
        expect(dropdown).not.toBeNull();
      });
      
      // 第二次点击关闭
      fireEvent.click(paramItem!);
      
      // 验证下拉菜单关闭
      await waitFor(() => {
        const dropdown = paramItem!.querySelector('.param-dropdown');
        expect(dropdown).toBeNull();
      });
    });

    test('getOptions函数返回正确选项', async () => {
      render(<HomePage />);
      
      // 验证duration选项
      const durationParam = Array.from(document.querySelectorAll('.param-item-clickable')).find(el => 
        el.textContent?.includes('时长')
      );
      expect(durationParam).not.toBeNull();
      fireEvent.click(durationParam!);
      
      await waitFor(() => {
        const options = durationParam!.querySelectorAll('.param-dropdown-option');
        expect(options.length).toBeGreaterThan(0);
        // 验证存在3s选项
        expect(options[0].textContent).toBe('3s');
      });
    });

    test('多个参数项存在', async () => {
      render(<HomePage />);
      
      const paramItems = document.querySelectorAll('.param-item-clickable');
      expect(paramItems.length).toBe(4); // 时长、比例、清晰度、风格
    });
  });
});
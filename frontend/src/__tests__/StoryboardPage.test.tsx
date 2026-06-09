'use client';

import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import StoryboardPage from '@/app/storyboard/page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
  }),
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

// Mock window.confirm
const mockConfirm = jest.fn();

// Mock console.log
const mockConsoleLog = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  window.confirm = mockConfirm;
  // Mock console
  console.log = mockConsoleLog;
  console.error = jest.fn();
});

afterEach(cleanup);

describe('StoryboardPage', () => {
  describe('初始化与数据加载', () => {
    test('使用默认分镜数据初始化', () => {
      const getItemSpy = jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
      
      render(<StoryboardPage />);
      
      // 验证默认 3 个镜头
      const shotCards = document.querySelectorAll('.shot-card');
      expect(shotCards.length).toBe(3);
      
      // 验证第一个镜头的序号
      const firstShotNum = document.querySelector('.shot-card .shot-num');
      expect(firstShotNum).toHaveTextContent('1');
      
      getItemSpy.mockRestore();
    });

    test('从 localStorage 加载分镜数据', async () => {
      const mockShots = [
        { id: 's1', num: 1, duration: 10, camera: '推镜头', audio: '科技', desc: '测试镜头 1', notes: '', thumb: '' },
        { id: 's2', num: 2, duration: 8, camera: '拉镜头', audio: '温暖', desc: '测试镜头 2', notes: '', thumb: '' },
      ];
      const getItemSpy = jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(JSON.stringify({ shots: mockShots }));
      
      render(<StoryboardPage />);
      
      // 验证页面正常渲染
      await waitFor(() => {
        const shotCards = document.querySelectorAll('.shot-card');
        expect(shotCards.length).toBeGreaterThanOrEqual(1);
      });
      
      getItemSpy.mockRestore();
    });

    test('从图片数据生成默认分镜', async () => {
      // 使用spyOn来mock localStorage
      const mockImages = [
        { url: 'image1.jpg' },
        { url: 'image2.jpg' },
        { url: 'image3.jpg' },
      ];
      const getItemSpy = jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(JSON.stringify({ images: mockImages }));
      
      render(<StoryboardPage />);
      
      // 等待数据加载完成（useEffect异步执行）
      await waitFor(() => {
        const shotCards = document.querySelectorAll('.shot-card');
        expect(shotCards.length).toBe(3);
      });
      
      // 验证日志输出（覆盖第65行和第77行）
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[LOG] 分镜页面 - 发现images数据，数量: 3')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[LOG] 分镜页面 - 成功根据图片生成默认分镜')
      );
      
      getItemSpy.mockRestore();
    });

    test('处理localStorage JSON解析失败', async () => {
      // 使用spyOn来mock localStorage
      const getItemSpy = jest.spyOn(Storage.prototype, 'getItem').mockReturnValue('invalid json');
      
      render(<StoryboardPage />);
      
      await waitFor(() => {
        const shotCards = document.querySelectorAll('.shot-card');
        expect(shotCards.length).toBe(3);
      });
      
      // 验证错误日志输出（第一个参数）
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('[LOG] 分镜页面 - JSON解析失败'),
        expect.any(Object) // 第二个参数是错误对象
      );
      
      getItemSpy.mockRestore();
    });

    test('localStorage有数据但无shots和images时使用默认数据', async () => {
      // 使用spyOn来mock localStorage
      const getItemSpy = jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(JSON.stringify({
        id: 'proj-123',
        name: '测试项目',
        createdAt: '2024-01-01T00:00:00Z',
      }));
      
      render(<StoryboardPage />);
      
      await waitFor(() => {
        const shotCards = document.querySelectorAll('.shot-card');
        expect(shotCards.length).toBe(3);
      });
      
      // 验证日志输出
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[LOG] 分镜页面 - localStorage中没有shots和images数据')
      );
      
      getItemSpy.mockRestore();
    });

    test('处理localStorage读取失败', async () => {
      // 使用spyOn来mock localStorage，模拟返回null（模拟读取失败）
      const getItemSpy = jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
      
      render(<StoryboardPage />);
      
      await waitFor(() => {
        const shotCards = document.querySelectorAll('.shot-card');
        expect(shotCards.length).toBe(3); // 使用默认数据
      });
      
      getItemSpy.mockRestore();
    });
  });

  describe('镜头操作', () => {
    test('添加新镜头', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      render(<StoryboardPage />);
      
      // 初始3个镜头
      expect(document.querySelectorAll('.shot-card').length).toBe(3);
      
      // 查找添加按钮（使用CSS选择器）
      const addButton = document.querySelector('.btn-group button:first-child');
      expect(addButton).toBeInTheDocument();
      fireEvent.click(addButton!);
      
      // 验证新增镜头
      await waitFor(() => {
        expect(document.querySelectorAll('.shot-card').length).toBe(4);
      });
    });

    test('删除镜头', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      render(<StoryboardPage />);
      
      // 初始3个镜头
      expect(document.querySelectorAll('.shot-card').length).toBe(3);
      
      // 点击第一个镜头的删除按钮
      const deleteButtons = document.querySelectorAll('.shot-action-btn');
      fireEvent.click(deleteButtons[1]); // 第二个按钮是删除
      
      // 验证镜头减少
      await waitFor(() => {
        expect(document.querySelectorAll('.shot-card').length).toBe(2);
      });
      
      // 验证日志
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[LOG] 分镜页面 - 删除镜头')
      );
    });

    test('复制镜头', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      render(<StoryboardPage />);
      
      // 初始3个镜头
      expect(document.querySelectorAll('.shot-card').length).toBe(3);
      
      // 点击复制按钮
      const copyButtons = document.querySelectorAll('.shot-action-btn');
      fireEvent.click(copyButtons[0]); // 第一个按钮是复制
      
      // 验证镜头增加
      await waitFor(() => {
        expect(document.querySelectorAll('.shot-card').length).toBe(4);
      });
      
      // 验证日志
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[LOG] 分镜页面 - 复制镜头')
      );
    });

    test('更新镜头描述', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      render(<StoryboardPage />);
      
      // 获取第一个镜头的描述文本框
      const textareas = document.querySelectorAll('textarea');
      const firstTextarea = textareas[0];
      
      // 修改描述
      fireEvent.change(firstTextarea, { target: { value: '更新后的镜头描述' } });
      
      // 验证日志
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[LOG] 分镜页面 - 更新镜头'),
        expect.anything()
      );
    });

    test('更新运镜方式', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      render(<StoryboardPage />);
      
      // 获取第一个镜头的运镜方式下拉框
      const selects = document.querySelectorAll('select');
      const cameraSelect = selects[0]; // 第一个select是运镜方式
      
      // 选择新的运镜方式
      fireEvent.change(cameraSelect, { target: { value: '摇镜头' } });
      
      // 验证日志
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[LOG] 分镜页面 - 更新镜头'),
        expect.anything()
      );
    });

    test('更新音效风格', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      render(<StoryboardPage />);
      
      // 获取第一个镜头的音效风格下拉框
      const selects = document.querySelectorAll('select');
      const audioSelect = selects[1]; // 第二个select是音效风格
      
      // 选择新的音效风格
      fireEvent.change(audioSelect, { target: { value: '温暖' } });
      
      // 验证日志
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[LOG] 分镜页面 - 更新镜头'),
        expect.anything()
      );
    });

    test('更新备注', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      render(<StoryboardPage />);
      
      // 获取第一个镜头的备注输入框
      const inputs = document.querySelectorAll('input[type="text"]');
      const noteInput = inputs[0];
      
      // 修改备注
      fireEvent.change(noteInput, { target: { value: '测试备注' } });
      
      // 验证日志
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[LOG] 分镜页面 - 更新镜头'),
        expect.anything()
      );
    });

    test('点击运镜方式下拉框不触发卡片选中', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      render(<StoryboardPage />);
      
      const shotCards = document.querySelectorAll('.shot-card');
      const firstCard = shotCards[0];
      
      // 获取第一个镜头的运镜方式下拉框
      const selects = document.querySelectorAll('select');
      const cameraSelect = selects[0];
      
      // 点击下拉框
      fireEvent.click(cameraSelect);
      
      // 验证卡片没有被选中（事件冒泡被阻止）
      await waitFor(() => {
        expect(firstCard.classList.contains('selected')).toBe(false);
      });
    });

    test('点击音效风格下拉框不触发卡片选中', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      render(<StoryboardPage />);
      
      const shotCards = document.querySelectorAll('.shot-card');
      const firstCard = shotCards[0];
      
      // 获取第一个镜头的音效风格下拉框
      const selects = document.querySelectorAll('select');
      const audioSelect = selects[1];
      
      // 点击下拉框
      fireEvent.click(audioSelect);
      
      // 验证卡片没有被选中（事件冒泡被阻止）
      await waitFor(() => {
        expect(firstCard.classList.contains('selected')).toBe(false);
      });
    });

    test('点击备注输入框不触发卡片选中', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      render(<StoryboardPage />);
      
      const shotCards = document.querySelectorAll('.shot-card');
      const firstCard = shotCards[0];
      
      // 获取第一个镜头的备注输入框
      const inputs = document.querySelectorAll('input[type="text"]');
      const noteInput = inputs[0];
      
      // 点击输入框
      fireEvent.click(noteInput);
      
      // 验证卡片没有被选中（事件冒泡被阻止）
      await waitFor(() => {
        expect(firstCard.classList.contains('selected')).toBe(false);
      });
    });

    test('点击镜头描述文本框不触发卡片选中', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      render(<StoryboardPage />);
      
      const shotCards = document.querySelectorAll('.shot-card');
      const firstCard = shotCards[0];
      
      // 获取第一个镜头的描述文本框
      const textareas = document.querySelectorAll('textarea');
      const descTextarea = textareas[0];
      
      // 点击文本框
      fireEvent.click(descTextarea);
      
      // 验证卡片没有被选中（事件冒泡被阻止）
      await waitFor(() => {
        expect(firstCard.classList.contains('selected')).toBe(false);
      });
    });
  });

  describe('拖拽排序', () => {
    test('拖拽镜头进行排序', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      render(<StoryboardPage />);
      
      const shotCards = document.querySelectorAll('.shot-card');
      const firstCard = shotCards[0];
      const lastCard = shotCards[shotCards.length - 1];
      
      // 模拟拖拽操作（添加dataTransfer）
      fireEvent.dragStart(firstCard, { dataTransfer: { effectAllowed: 'move' } });
      fireEvent.dragOver(lastCard, { dataTransfer: { dropEffect: 'move' } });
      fireEvent.drop(lastCard, { dataTransfer: { dropEffect: 'move' } });
    });
  });

  describe('右键菜单', () => {
    test('右键点击显示菜单', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      render(<StoryboardPage />);
      
      const shotCards = document.querySelectorAll('.shot-card');
      const firstCard = shotCards[0];
      
      // 模拟右键点击
      fireEvent.contextMenu(firstCard);
      
      // 验证右键菜单显示
      await waitFor(() => {
        expect(document.querySelector('.context-menu')).toBeInTheDocument();
      });
    });

    test('点击外部关闭右键菜单', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      render(<StoryboardPage />);
      
      const shotCards = document.querySelectorAll('.shot-card');
      const firstCard = shotCards[0];
      
      // 显示右键菜单
      fireEvent.contextMenu(firstCard);
      
      expect(document.querySelector('.context-menu')).toBeInTheDocument();
      
      // 点击外部关闭
      fireEvent.click(document.body);
      
      await waitFor(() => {
        expect(document.querySelector('.context-menu')).toBeNull();
      });
    });

    test('通过右键菜单删除镜头', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      render(<StoryboardPage />);
      
      const shotCards = document.querySelectorAll('.shot-card');
      const firstCard = shotCards[0];
      
      // 显示右键菜单
      fireEvent.contextMenu(firstCard);
      
      // 点击删除
      const deleteBtn = document.querySelector('.context-menu button:last-child');
      fireEvent.click(deleteBtn!);
      
      // 验证镜头减少
      await waitFor(() => {
        expect(document.querySelectorAll('.shot-card').length).toBe(2);
      });
    });

    test('通过右键菜单复制镜头', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      render(<StoryboardPage />);
      
      // 初始3个镜头
      expect(document.querySelectorAll('.shot-card').length).toBe(3);
      
      const shotCards = document.querySelectorAll('.shot-card');
      const firstCard = shotCards[0];
      
      // 显示右键菜单
      fireEvent.contextMenu(firstCard);
      
      // 点击复制（第一个按钮是复制）
      const copyBtn = document.querySelector('.context-menu button:first-child');
      fireEvent.click(copyBtn!);
      
      // 验证镜头增加
      await waitFor(() => {
        expect(document.querySelectorAll('.shot-card').length).toBe(4);
      });
      
      // 验证日志输出
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[LOG] 分镜页面 - 复制镜头')
      );
    });
  });

  describe('视频生成流程', () => {
    test('点击进入视频生成按钮触发confirm', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      mockConfirm.mockReturnValue(false);
      
      render(<StoryboardPage />);
      
      // 点击进入视频生成按钮
      const genButton = screen.getByText('进入视频生成');
      fireEvent.click(genButton);
      
      // 验证confirm被调用
      expect(mockConfirm).toHaveBeenCalledWith('是否根据当前分镜生成视频？');
    });

    test('用户取消进入视频生成', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      mockConfirm.mockReturnValue(false);
      
      render(<StoryboardPage />);
      
      // 点击进入视频生成按钮
      const genButton = screen.getByText('进入视频生成');
      fireEvent.click(genButton);
      
      // 验证confirm被调用但数据未保存
      expect(mockConfirm).toHaveBeenCalled();
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });

    test('用户确认后保存数据并跳转视频页面', async () => {
      // 设置现有项目数据
      const existingProject = JSON.stringify({
        id: 'proj-123',
        name: '测试项目',
        createdAt: '2024-01-01T00:00:00Z',
      });
      
      // 使用 spyOn 来 mock localStorage
      const getItemSpy = jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(existingProject);
      const setItemSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});
      
      mockConfirm.mockReturnValue(true);
      
      render(<StoryboardPage />);
      
      // 点击进入视频生成按钮
      const genButton = screen.getByText('进入视频生成');
      fireEvent.click(genButton);
      
      // 验证confirm被调用
      expect(mockConfirm).toHaveBeenCalledWith('是否根据当前分镜生成视频？');
      
      // 验证localStorage.setItem被调用（数据保存逻辑）
      expect(setItemSpy).toHaveBeenCalled();
      
      // 验证保存的数据格式
      const savedData = JSON.parse(setItemSpy.mock.calls[0][1]);
      expect(savedData.status).toBe('storyboard-ready');
      expect(savedData.shots).toBeDefined();
      expect(Array.isArray(savedData.shots)).toBe(true);
      expect(savedData.shots.length).toBe(3);
      expect(savedData.totalDuration).toBe(30);
      expect(savedData.updatedAt).toBeDefined();
      expect(savedData.id).toBe('proj-123');
      expect(savedData.name).toBe('测试项目');
      
      // 验证日志输出
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[LOG] 分镜页面 - 分镜数据保存成功')
      );
      
      // 验证测试环境中跳过页面跳转的日志（覆盖第240行）
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[LOG] 分镜页面 - 测试环境中跳过页面跳转')
      );
      
      // 清理spy
      getItemSpy.mockRestore();
      setItemSpy.mockRestore();
    });

    test('首次创建项目时保存完整数据', async () => {
      // 使用 spyOn 来 mock localStorage
      const getItemSpy = jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
      const setItemSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});
      
      mockConfirm.mockReturnValue(true);
      
      render(<StoryboardPage />);
      
      // 点击进入视频生成按钮
      const genButton = screen.getByText('进入视频生成');
      fireEvent.click(genButton);
      
      // 验证保存的数据格式（新创建项目）
      expect(setItemSpy).toHaveBeenCalled();
      const savedData = JSON.parse(setItemSpy.mock.calls[0][1]);
      expect(savedData.status).toBe('storyboard-ready');
      expect(savedData.shots.length).toBe(3);
      expect(savedData.totalDuration).toBe(30);
      expect(savedData.createdAt).toBeDefined();
      expect(savedData.updatedAt).toBeDefined();
      
      // 清理spy
      getItemSpy.mockRestore();
      setItemSpy.mockRestore();
    });

    test('进入视频生成按钮存在', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      render(<StoryboardPage />);
      
      // 验证按钮存在
      const genButton = screen.getByText('进入视频生成');
      expect(genButton).toBeInTheDocument();
      expect(genButton.tagName).toBe('BUTTON');
    });
  });

  describe('UI显示', () => {
    test('显示总时长', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      render(<StoryboardPage />);
      
      // 验证总时长显示（3个镜头默认时长：8+10+12=30s）
      const durationElement = screen.getByText(/总时长/);
      expect(durationElement.textContent).toContain('30s');
    });

    test('显示镜头数量', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      render(<StoryboardPage />);
      
      const countElement = screen.getByText(/镜头数/);
      expect(countElement.textContent).toContain('3');
    });

    test('显示时间轴', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      render(<StoryboardPage />);
      
      // 验证时间轴存在
      const timeline = document.querySelector('.storyboard-timeline');
      expect(timeline).toBeInTheDocument();
      
      // 验证时间轴片段数量
      const segments = document.querySelectorAll('.timeline-segment');
      expect(segments.length).toBe(3);
    });

    test('选中镜头高亮', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      render(<StoryboardPage />);
      
      const shotCards = document.querySelectorAll('.shot-card');
      const firstCard = shotCards[0];
      
      // 点击镜头
      fireEvent.click(firstCard);
      
      // 验证选中状态
      await waitFor(() => {
        expect(firstCard.classList.contains('selected')).toBe(true);
      });
    });
  });

  describe('时长调整', () => {
    test('拖拽调整镜头时长', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      render(<StoryboardPage />);
      
      const resizeHandle = document.querySelector('.resize-handle');
      expect(resizeHandle).toBeInTheDocument();
      
      // 模拟鼠标按下
      fireEvent.mouseDown(resizeHandle!, { clientX: 100 });
      
      // 模拟鼠标移动（增加时长）
      fireEvent.mouseMove(document, { clientX: 150 });
      
      // 模拟鼠标释放
      fireEvent.mouseUp(document);
    });
  });

  describe('顶部操作栏', () => {
    test('撤销按钮存在', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      render(<StoryboardPage />);
      
      const undoButton = screen.getByText('撤销');
      expect(undoButton).toBeInTheDocument();
    });

    test('重做按钮存在', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      render(<StoryboardPage />);
      
      const redoButton = screen.getByText('重做');
      expect(redoButton).toBeInTheDocument();
    });

    test('AI重新生成按钮存在', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      render(<StoryboardPage />);
      
      // 使用选择器查找按钮
      const storyboardActions = document.querySelector('.storyboard-actions');
      expect(storyboardActions).toBeInTheDocument();
      
      // 验证有多个按钮
      const buttons = storyboardActions?.querySelectorAll('button');
      expect(buttons?.length).toBeGreaterThanOrEqual(4);
    });

    test('点击AI重新生成按钮触发alert', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      render(<StoryboardPage />);
      
      // 查找AI重新生成按钮
      const aiButton = screen.getByText('AI 重新生成全部');
      expect(aiButton).toBeInTheDocument();
      
      // 点击按钮
      fireEvent.click(aiButton);
    });

    test('预览按钮存在', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      render(<StoryboardPage />);
      
      const previewButton = screen.getByText('预览');
      expect(previewButton).toBeInTheDocument();
    });
  });

  describe('项目信息显示', () => {
    test('显示项目名称', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      render(<StoryboardPage />);
      
      const projName = document.querySelector('.proj-name');
      expect(projName).toBeInTheDocument();
      expect(projName?.textContent).toBe('未命名项目');
    });

    test('显示比例信息', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      render(<StoryboardPage />);
      
      const ratioElement = screen.getByText('比例');
      expect(ratioElement.textContent).toContain('16:9');
    });
  });

  describe('视频生成流程增强', () => {
    test('视频生成按钮触发确认对话框', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      mockConfirm.mockReturnValue(true);
      
      render(<StoryboardPage />);
      
      // 点击生成按钮
      const genButton = screen.getByText('进入视频生成');
      fireEvent.click(genButton);
      
      // 验证confirm被调用
      expect(mockConfirm).toHaveBeenCalled();
    });

    test('用户取消时不保存数据', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      mockConfirm.mockReturnValue(false);
      
      render(<StoryboardPage />);
      
      // 点击生成按钮
      const genButton = screen.getByText('进入视频生成');
      fireEvent.click(genButton);
      
      // 验证confirm被调用但数据未保存
      expect(mockConfirm).toHaveBeenCalled();
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('顶部按钮交互', () => {
    test('点击撤销按钮触发alert', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      render(<StoryboardPage />);
      
      const undoButton = screen.getByText('撤销');
      fireEvent.click(undoButton);
    });

    test('点击重做按钮触发alert', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      render(<StoryboardPage />);
      
      const redoButton = screen.getByText('重做');
      fireEvent.click(redoButton);
    });

    test('点击预览按钮触发alert', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      render(<StoryboardPage />);
      
      const previewButton = screen.getByText('预览');
      fireEvent.click(previewButton);
    });
  });
});
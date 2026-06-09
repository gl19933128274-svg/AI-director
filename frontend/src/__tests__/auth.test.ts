/**
 * 认证工具函数测试
 * 测试覆盖：登录状态检查、用户信息获取、token验证、登出功能
 */

import { isAuthenticated, getCurrentUser, getAuthToken, validateToken, logout } from '@/utils/auth';
import { User } from '@/types/auth';

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

describe('认证工具函数测试', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('isAuthenticated - 登录状态检查', () => {
    test('未登录时返回false', () => {
      expect(isAuthenticated()).toBe(false);
    });

    test('只有token时返回false', () => {
      localStorageMock.setItem('auth_token', 'mock_token_1_123');
      expect(isAuthenticated()).toBe(false);
    });

    test('只有用户信息时返回false', () => {
      const user: User = {
        id: '1',
        username: '测试用户',
        email: 'test@example.com',
        avatar: 'T',
        createdAt: '2024-01-01T00:00:00Z',
      };
      localStorageMock.setItem('auth_user', JSON.stringify(user));
      expect(isAuthenticated()).toBe(false);
    });

    test('token和用户信息都存在时返回true', () => {
      const user: User = {
        id: '1',
        username: '测试用户',
        email: 'test@example.com',
        avatar: 'T',
        createdAt: '2024-01-01T00:00:00Z',
      };
      localStorageMock.setItem('auth_token', 'mock_token_1_123');
      localStorageMock.setItem('auth_user', JSON.stringify(user));
      expect(isAuthenticated()).toBe(true);
    });
  });

  describe('getCurrentUser - 获取当前用户', () => {
    test('未登录时返回null', () => {
      expect(getCurrentUser()).toBeNull();
    });

    test('用户信息存在时返回用户对象', () => {
      const user: User = {
        id: '1',
        username: '测试用户',
        email: 'test@example.com',
        avatar: 'T',
        createdAt: '2024-01-01T00:00:00Z',
      };
      localStorageMock.setItem('auth_user', JSON.stringify(user));
      
      const result = getCurrentUser();
      expect(result).toEqual(user);
    });

    test('用户信息损坏时返回null', () => {
      localStorageMock.setItem('auth_user', 'invalid-json');
      expect(getCurrentUser()).toBeNull();
    });
  });

  describe('getAuthToken - 获取认证token', () => {
    test('未登录时返回null', () => {
      expect(getAuthToken()).toBeNull();
    });

    test('token存在时返回token字符串', () => {
      localStorageMock.setItem('auth_token', 'mock_token_1_1234567890');
      expect(getAuthToken()).toBe('mock_token_1_1234567890');
    });
  });

  describe('validateToken - 验证token有效性', () => {
    test('有效mock token返回true', () => {
      expect(validateToken('mock_token_1_1234567890')).toBe(true);
    });

    test('无效token格式返回false', () => {
      expect(validateToken('invalid_token')).toBe(false);
      expect(validateToken('real_token_123')).toBe(false);
      expect(validateToken('')).toBe(false);
    });
  });

  describe('logout - 登出功能', () => {
    test('登出后清除所有认证数据', () => {
      const user: User = {
        id: '1',
        username: '测试用户',
        email: 'test@example.com',
        avatar: 'T',
        createdAt: '2024-01-01T00:00:00Z',
      };
      localStorageMock.setItem('auth_token', 'mock_token_1_123');
      localStorageMock.setItem('auth_user', JSON.stringify(user));
      
      expect(isAuthenticated()).toBe(true);
      
      logout();
      
      expect(isAuthenticated()).toBe(false);
      expect(getAuthToken()).toBeNull();
      expect(getCurrentUser()).toBeNull();
    });

    test('未登录时登出不报错', () => {
      logout();
      expect(isAuthenticated()).toBe(false);
    });
  });

  describe('服务端环境兼容性', () => {
    test('window未定义时isAuthenticated返回false', () => {
      const originalWindow = global.window;
      // @ts-expect-error - 测试服务端环境
      delete global.window;
      
      expect(isAuthenticated()).toBe(false);
      
      global.window = originalWindow;
    });

    test('window未定义时getCurrentUser返回null', () => {
      const originalWindow = global.window;
      // @ts-expect-error - 测试服务端环境
      delete global.window;
      
      expect(getCurrentUser()).toBeNull();
      
      global.window = originalWindow;
    });

    test('window未定义时getAuthToken返回null', () => {
      const originalWindow = global.window;
      // @ts-expect-error - 测试服务端环境
      delete global.window;
      
      expect(getAuthToken()).toBeNull();
      
      global.window = originalWindow;
    });

    test('window未定义时logout不报错', () => {
      const originalWindow = global.window;
      // @ts-expect-error - 测试服务端环境
      delete global.window;
      
      expect(() => logout()).not.toThrow();
      
      global.window = originalWindow;
    });
  });

  describe('边界条件测试', () => {
    test('空token验证', () => {
      expect(validateToken('')).toBe(false);
    });

    test('token格式边界情况', () => {
      expect(validateToken('mock_token_')).toBe(true);
      expect(validateToken('mock_token_test_user_123')).toBe(true);
      expect(validateToken('mock')).toBe(false);
      expect(validateToken('token_123')).toBe(false);
    });

    test('用户信息为空字符串', () => {
      localStorageMock.setItem('auth_user', '');
      expect(getCurrentUser()).toBeNull();
    });

    test('用户信息为无效JSON', () => {
      localStorageMock.setItem('auth_user', '{invalid json}');
      expect(getCurrentUser()).toBeNull();
    });

    test('token和user都为空时isAuthenticated返回false', () => {
      localStorageMock.setItem('auth_token', '');
      localStorageMock.setItem('auth_user', '');
      expect(isAuthenticated()).toBe(false);
    });

    test('logout在服务端环境不报错', () => {
      const originalWindow = global.window;
      // @ts-expect-error - 测试服务端环境
      delete global.window;
      
      expect(() => logout()).not.toThrow();
      
      global.window = originalWindow;
    });
  });
});
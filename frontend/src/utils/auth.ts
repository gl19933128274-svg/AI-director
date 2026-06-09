import { User } from '@/types/auth';

// 检查用户是否已登录
export const isAuthenticated = (): boolean => {
  if (typeof window === 'undefined') return false;
  const token = localStorage.getItem('auth_token');
  const user = localStorage.getItem('auth_user');
  return !!token && !!user;
};

// 获取当前用户信息
export const getCurrentUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem('auth_user');
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
};

// 获取认证token
export const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
};

// 验证token是否有效（mock验证）
export const validateToken = (token: string): boolean => {
  // Mock验证：检查token格式是否正确
  return token.startsWith('mock_token_');
};

// 登出
export const logout = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  }
};
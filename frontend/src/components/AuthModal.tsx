'use client';

import React, { useState } from 'react';
import { User, LoginRequest, RegisterRequest } from '@/types/auth';

// Mock用户数据
const MOCK_USERS: Record<string, { user: User; password: string }> = {
  'admin@example.com': {
    user: {
      id: '1',
      username: '管理员',
      email: 'admin@example.com',
      avatar: 'A',
      createdAt: '2024-01-01T00:00:00Z',
    },
    password: 'admin123',
  },
  'user@example.com': {
    user: {
      id: '2',
      username: '测试用户',
      email: 'user@example.com',
      avatar: 'U',
      createdAt: '2024-01-01T00:00:00Z',
    },
    password: 'user123',
  },
};

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (credentials: LoginRequest): Promise<{ success: boolean; message: string }> => {
    const mockUser = MOCK_USERS[credentials.email];
    
    if (mockUser && mockUser.password === credentials.password) {
      const token = `mock_token_${mockUser.user.id}_${Date.now()}`;
      localStorage.setItem('auth_token', token);
      localStorage.setItem('auth_user', JSON.stringify(mockUser.user));
      return { success: true, message: '登录成功' };
    }
    
    return { success: false, message: '邮箱或密码错误' };
  };

  const handleRegister = async (userData: RegisterRequest): Promise<{ success: boolean; message: string }> => {
    if (MOCK_USERS[userData.email]) {
      return { success: false, message: '该邮箱已被注册' };
    }
    
    const newUser: User = {
      id: Date.now().toString(),
      username: userData.username,
      email: userData.email,
      avatar: userData.username.charAt(0).toUpperCase(),
      createdAt: new Date().toISOString(),
    };
    
    MOCK_USERS[userData.email] = {
      user: newUser,
      password: userData.password,
    };
    
    const token = `mock_token_${newUser.id}_${Date.now()}`;
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(newUser));
    
    return { success: true, message: '注册成功' };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (isLogin) {
      if (!formData.email || !formData.password) {
        setError('请填写邮箱和密码');
        return;
      }
      
      setLoading(true);
      const result = await handleLogin({
        email: formData.email,
        password: formData.password,
      } as LoginRequest);
      setLoading(false);
      
      if (result.success) {
        onClose();
        window.location.reload();
      } else {
        setError(result.message);
      }
    } else {
      if (!formData.username || !formData.email || !formData.password) {
        setError('请填写所有字段');
        return;
      }
      
      if (formData.password.length < 6) {
        setError('密码至少需要6位');
        return;
      }
      
      setLoading(true);
      const result = await handleRegister({
        username: formData.username,
        email: formData.email,
        password: formData.password,
      } as RegisterRequest);
      setLoading(false);
      
      if (result.success) {
        onClose();
        window.location.reload();
      } else {
        setError(result.message);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-surface-1 rounded-2xl p-8 w-full max-w-md shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="text-center mb-8">
          <div className="text-4xl mb-4">🎬</div>
          <h2 className="text-xl font-semibold">{isLogin ? '登录' : '注册'}</h2>
          <p className="text-gray-400 text-sm mt-2">
            {isLogin ? '欢迎回来' : '创建新账号'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-danger/10 text-danger rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                用户名
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="请输入用户名"
                className="w-full px-4 py-2.5 bg-surface-2 border border-gray-700 rounded-lg focus:outline-none focus:border-primary transition-colors text-gray-100 placeholder-gray-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              邮箱
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="请输入邮箱"
              className="w-full px-4 py-2.5 bg-surface-2 border border-gray-700 rounded-lg focus:outline-none focus:border-primary transition-colors text-gray-100 placeholder-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              密码
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="请输入密码"
              className="w-full px-4 py-2.5 bg-surface-2 border border-gray-700 rounded-lg focus:outline-none focus:border-primary transition-colors text-gray-100 placeholder-gray-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-primary hover:bg-primary/90 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors text-white"
          >
            {loading ? '处理中...' : (isLogin ? '登录' : '注册')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <span className="text-gray-400 text-sm">
            {isLogin ? '还没有账号？' : '已有账号？'}
          </span>
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="ml-2 text-primary hover:text-primary/80 text-sm font-medium"
          >
            {isLogin ? '立即注册' : '立即登录'}
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-700">
          <p className="text-gray-500 text-xs text-center">
            测试账号：admin@example.com / admin123
          </p>
          <p className="text-gray-500 text-xs text-center mt-1">
            或：user@example.com / user123
          </p>
        </div>
      </div>
    </div>
  );
}
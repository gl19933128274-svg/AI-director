'use client';

import React, { useState } from 'react';
import { User, Bell, Palette, Shield, HelpCircle } from 'lucide-react';
import Sidebar from '@/components/Sidebar';

interface SettingSection {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const sections: SettingSection[] = [
  { id: 'profile', label: '个人资料', icon: <User className="w-5 h-5" /> },
  { id: 'notifications', label: '通知设置', icon: <Bell className="w-5 h-5" /> },
  { id: 'appearance', label: '外观设置', icon: <Palette className="w-5 h-5" /> },
  { id: 'security', label: '安全设置', icon: <Shield className="w-5 h-5" /> },
  { id: 'help', label: '帮助与支持', icon: <HelpCircle className="w-5 h-5" /> }
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<string>('profile');
  const [formData, setFormData] = useState({
    name: '张三',
    email: 'zhangsan@example.com',
    phone: '138****8888',
    bio: '热爱创作，专注于视频制作',
    notifications: true,
    emailNotifications: true,
    theme: 'dark'
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleToggle = (name: string) => {
    setFormData(prev => ({ ...prev, [name]: !prev[name as keyof typeof prev] }));
  };

  const handleSave = () => {
    console.log('保存设置:', formData);
  };

  return (
    <div className="h-full w-full bg-surface-0 flex">
      <Sidebar currentPage="settings" />

      <main className="main">
        <div className="page-header">
          <h2>设置</h2>
          <p className="page-sub">管理您的账户和偏好设置</p>
        </div>

        <div className="settings-layout">
          <div className="settings-nav">
            {sections.map((section) => (
              <button
                key={section.id}
                className={`settings-nav-item ${activeSection === section.id ? 'active' : ''}`}
                onClick={() => setActiveSection(section.id)}
              >
                {section.icon}
                <span>{section.label}</span>
              </button>
            ))}
          </div>

          <div className="settings-content">
            {activeSection === 'profile' && (
              <div className="settings-section">
                <h3>个人资料</h3>
                <div className="form-group">
                  <label>用户名</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>邮箱</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>手机号</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>个人简介</label>
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleInputChange}
                    className="form-textarea"
                    rows={4}
                  />
                </div>
                <button className="btn btn-primary" onClick={handleSave}>
                  保存更改
                </button>
              </div>
            )}

            {activeSection === 'notifications' && (
              <div className="settings-section">
                <h3>通知设置</h3>
                <div className="toggle-item">
                  <div>
                    <div className="toggle-label">推送通知</div>
                    <div className="toggle-desc">接收应用内推送通知</div>
                  </div>
                  <button
                    className={`toggle-btn ${formData.notifications ? 'active' : ''}`}
                    onClick={() => handleToggle('notifications')}
                  >
                    <span className="toggle-dot"></span>
                  </button>
                </div>
                <div className="toggle-item">
                  <div>
                    <div className="toggle-label">邮件通知</div>
                    <div className="toggle-desc">接收重要更新邮件</div>
                  </div>
                  <button
                    className={`toggle-btn ${formData.emailNotifications ? 'active' : ''}`}
                    onClick={() => handleToggle('emailNotifications')}
                  >
                    <span className="toggle-dot"></span>
                  </button>
                </div>
              </div>
            )}

            {activeSection === 'appearance' && (
              <div className="settings-section">
                <h3>外观设置</h3>
                <div className="form-group">
                  <label>主题</label>
                  <select
                    name="theme"
                    value={formData.theme}
                    onChange={(e) => setFormData(prev => ({ ...prev, theme: e.target.value }))}
                    className="form-select"
                  >
                    <option value="dark">深色</option>
                    <option value="light">浅色</option>
                    <option value="auto">自动</option>
                  </select>
                </div>
              </div>
            )}

            {activeSection === 'security' && (
              <div className="settings-section">
                <h3>安全设置</h3>
                <div className="form-group">
                  <label>修改密码</label>
                  <input type="password" placeholder="当前密码" className="form-input" />
                  <input type="password" placeholder="新密码" className="form-input" style={{ marginTop: '8px' }} />
                  <input type="password" placeholder="确认新密码" className="form-input" style={{ marginTop: '8px' }} />
                </div>
                <button className="btn btn-primary" onClick={handleSave}>
                  更新密码
                </button>
              </div>
            )}

            {activeSection === 'help' && (
              <div className="settings-section">
                <h3>帮助与支持</h3>
                <div className="help-links">
                  <a href="#" className="help-link">常见问题</a>
                  <a href="#" className="help-link">联系客服</a>
                  <a href="#" className="help-link">反馈建议</a>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
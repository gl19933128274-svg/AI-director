'use client';

import React, { useState, useEffect } from 'react';
import { Play } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import {
  processShotRendering,
  completeShot,
  calculateProgress,
  shouldSimulateFailure,
  resetAllShots,
  updateProjectStatus,
  createVideoData,
} from '@/utils/videoGeneration';

interface VideoStage {
  id: string;
  num: number;
  label: string;
}

const stages: VideoStage[] = [
  { id: 'confirm', num: 1, label: '确认参数' },
  { id: 'render', num: 2, label: '生成视频' },
  { id: 'done', num: 3, label: '完成' }
];

interface ShotData {
  num: number;
  duration: number;
  status: 'waiting' | 'rendering' | 'done';
}

export type { ShotData };

interface ProjectData {
  status?: string;
  shots?: Array<{ num: number; duration: number }>;
  description?: string;
  params?: Record<string, unknown>;
}

const defaultShots: ShotData[] = [
  { num: 1, duration: 8, status: 'waiting' },
  { num: 2, duration: 10, status: 'waiting' },
  { num: 3, duration: 12, status: 'waiting' }
];

export default function VideoPage() {
  const [currentStage, setCurrentStage] = useState<string>('confirm');
  const [progress, setProgress] = useState<number>(0);
  const [shots, setShots] = useState<ShotData[]>([...defaultShots]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  // 用于存储定时器引用，以便清理
  const intervalRef = React.useRef<number | null>(null);
  const timeoutRefs = React.useRef<number[]>([]);

  // 从 localStorage 读取项目数据
  useEffect(() => {
    const data = localStorage.getItem('currentProject');
    if (data) {
      const parsed: ProjectData = JSON.parse(data);
      setProjectData(parsed);
      console.log(`[LOG] 视频页面 - 加载项目数据: 状态=${parsed.status}, 镜头数=${parsed.shots?.length || 0}`);
      
      if (parsed.shots && parsed.shots.length > 0) {
        setShots(parsed.shots.map((s) => ({
          num: s.num,
          duration: s.duration,
          status: 'waiting' as const,
        })));
        console.log(`[LOG] 视频页面 - 初始化镜头数据: ${parsed.shots.length}个镜头`);
      }
    }
  }, []);

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      timeoutRefs.current.forEach(timeoutId => {
        clearTimeout(timeoutId);
      });
      timeoutRefs.current = [];
    };
  }, []);

  const handleStartRender = () => {
    setIsGenerating(true);
    setCurrentStage('render');
    setProgress(0);
    setHasError(false);
    setErrorMessage('');
    console.log(`[LOG] 视频页面 - 开始视频生成: 镜头数=${shots.length}, 总时长=${shots.reduce((acc, s) => acc + s.duration, 0)}s`);

    // 使用 ref 存储当前镜头索引，避免闭包陷阱
    const currentShotRef = { value: 0 };
    
    // 清理之前的定时器
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    timeoutRefs.current.forEach(timeoutId => {
      clearTimeout(timeoutId);
    });
    timeoutRefs.current = [];

    intervalRef.current = window.setInterval(() => {
      const currentShot = currentShotRef.value;
      
      if (currentShot >= shots.length) {
        // 模拟10%概率失败
        if (shouldSimulateFailure(0.1)) {
          const msg = '视频生成失败，请重试';
          setHasError(true);
          setErrorMessage(msg);
          setIsGenerating(false);
          clearInterval(intervalRef.current!);
          console.log(`[LOG] 视频页面 - 视频生成失败: ${msg}`);
          return;
        }
        
        setProgress(100);
        setCurrentStage('done');
        setIsGenerating(false);
        clearInterval(intervalRef.current!);
        
        // 更新项目状态
        updateProjectStatus('video-ready');
        
        console.log(`[LOG] 视频页面 - 视频生成完成, 状态更新为video-ready`);
        return;
      }

      // 使用提取的函数处理镜头渲染
      setShots(prev => processShotRendering(prev, currentShot));
      console.log(`[LOG] 视频页面 - 正在生成镜头 ${currentShot + 1}/${shots.length}`);

      // 捕获当前镜头索引到闭包中，避免闭包陷阱
      const shotIndex = currentShot;
      
      const timeoutId = window.setTimeout(() => {
        // 从 refs 中移除已完成的 timeout
        timeoutRefs.current = timeoutRefs.current.filter(id => id !== timeoutId);
        
        // 模拟5%概率单个镜头失败
        if (shouldSimulateFailure(0.05)) {
          const msg = `镜头 ${shotIndex + 1} 生成失败`;
          setHasError(true);
          setErrorMessage(msg);
          setIsGenerating(false);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          console.log(`[LOG] 视频页面 - ${msg}`);
          return;
        }

        // 使用提取的函数完成镜头
        setShots(prev => completeShot(prev, shotIndex));
        
        // 更新 currentShot
        currentShotRef.value++;
        
        // 使用提取的函数计算进度
        const newProgress = calculateProgress(currentShotRef.value, shots.length);
        setProgress(newProgress);
        console.log(`[LOG] 视频页面 - 镜头 ${currentShotRef.value} 生成完成, 进度=${newProgress}%`);
      }, 1200 + Math.random() * 800);
      
      // 存储 timeout 引用以便清理
      timeoutRefs.current.push(timeoutId);
    }, 2000);
  };

  const handleRetry = () => {
    console.log(`[LOG] 视频页面 - 用户重试视频生成`);
    // 使用提取的函数重置镜头状态
    setShots(resetAllShots(shots));
    handleStartRender();
  };

  const handleDownload = () => {
    if (isDownloading) return;
    setIsDownloading(true);
    
    // 使用提取的函数创建视频数据
    const videoData = createVideoData(projectData, shots);

    // 创建 JSON 文件作为模拟视频
    const blob = new Blob([JSON.stringify(videoData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // 创建下载链接
    const link = document.createElement('a');
    link.href = url;
    link.download = `AI视频_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();

    // 清理
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setIsDownloading(false);
    console.log(`[LOG] 视频页面 - 视频下载完成: 文件名=AI视频_${Date.now()}.json`);
    alert('视频已下载！（模拟下载：JSON文件）');
  };

  return (
    <div className="h-full w-full bg-surface-0 flex">
      <Sidebar currentPage="video" />

      <main className="main">
        <div className="page-header">
          <h2>视频生成</h2>
          <p className="page-sub">确认参数后调用 Seedance 2.0 逐镜生成</p>
        </div>

        <div className="video-content">
          {/* Stages */}
          <div className="video-stages">
            {stages.map((stage, index) => (
              <>
                <div
                  key={stage.id}
                  className={`video-stage ${currentStage === stage.id ? 'active' : ''} ${
                    (index < stages.findIndex(s => s.id === currentStage)) ? 'done' : ''
                  }`}
                >
                  <span className="video-stage-num">{stage.num}</span>
                  <span>{stage.label}</span>
                </div>
                {index < stages.length - 1 && <span className="video-stage-line"></span>}
              </>
            ))}
          </div>

          {/* Stage 1: Confirm */}
          {currentStage === 'confirm' && (
            <div className="video-confirm-card">
              <h3>参数确认</h3>
              <div className="confirm-grid">
                <div className="confirm-item">
                  <span className="cf-label">分辨率</span>
                  <span className="cf-value">1080p</span>
                </div>
                <div className="confirm-item">
                  <span className="cf-label">帧率</span>
                  <span className="cf-value">30 fps</span>
                </div>
                <div className="confirm-item">
                  <span className="cf-label">比例</span>
                  <span className="cf-value">16:9</span>
                </div>
                <div className="confirm-item">
                  <span className="cf-label">镜头数</span>
                  <span className="cf-value">{shots.length} 个</span>
                </div>
                <div className="confirm-item">
                  <span className="cf-label">总时长</span>
                  <span className="cf-value">{shots.reduce((acc, s) => acc + s.duration, 0)}s</span>
                </div>
                <div className="confirm-item">
                  <span className="cf-label">引擎</span>
                  <span className="cf-value">Seedance 2.0</span>
                </div>
              </div>
              <div className="confirm-total">
                <span className="total-label">预计消耗额度</span>
                <span className="total-value">1 次</span>
              </div>
              <div style={{ marginTop: 'clamp(1rem, 1.2vw, 1.5rem)' }}>
                <button
                  className="btn btn-primary"
                  onClick={handleStartRender}
                  disabled={isGenerating}
                >
                  开始生成
                </button>
              </div>
            </div>
          )}

          {/* Stage 2: Progress */}
          {currentStage === 'render' && (
            <div className="video-progress">
              <h3>正在生成视频…</h3>
              <div className="progress-bar-bg">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="progress-label">
                {progress < 100 ? '正在生成镜头…' : '拼接视频…'}
              </p>
              <div className="progress-shots">
                {shots.map((shot, index) => (
                  <div key={index} className="progress-shot">
                    <span>镜头 {shot.num} · {shot.duration}s</span>
                    <span className={`ps-status ${shot.status}`}>
                      {shot.status === 'waiting' && '等待中'}
                      {shot.status === 'rendering' && '生成中…'}
                      {shot.status === 'done' && '完成'}
                    </span>
                  </div>
                ))}
              </div>

              {/* Error State */}
              {hasError && (
                <div className="error-container">
                  <div className="error-icon">✗</div>
                  <div className="error-message">{errorMessage}</div>
                  <button className="btn btn-primary btn-sm" onClick={handleRetry}>
                    重试
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Stage 3: Result */}
          {currentStage === 'done' && (
            <div className="video-result">
              <div className="video-player-bg">
                <div className="play-btn">
                  <Play className="w-12 h-12" />
                </div>
              </div>
              <div className="video-result-info">
                <div className="vr-meta">
                  <span>1080p · 30fps · 16:9 · {shots.reduce((acc, s) => acc + s.duration, 0)}s</span>
                </div>
                <div className="btn-group">
                  <button className="btn btn-secondary btn-sm" onClick={() => window.location.href = '/storyboard'}>返回画布修改</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => alert('分享功能开发中...')}>分享</button>
                  <button 
                    className="btn btn-primary btn-sm" 
                    onClick={handleDownload}
                    disabled={isDownloading}
                  >
                    {isDownloading ? '下载中...' : '下载 MP4'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
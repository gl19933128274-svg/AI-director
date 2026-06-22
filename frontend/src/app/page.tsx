'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Video, ChevronDown, X } from 'lucide-react';
import { VideoParams, ProductFeatures, ShotDetail } from '@/types';
import Sidebar from '@/components/Sidebar';
import { chatWithAI } from '@/utils/chatClient';
import {
  analyzeProductFeatures,
  buildStoryboardPrompt,
  buildAIMessages,
  scoreStoryboard,
  generateLocalStoryboard,
  parseAIResponse
} from '@/services/storyboardService';
import { generateRequestId, logUserAction, logInfo, logError, logWarn, setDevMode } from '@/services/logger';

const durationOptions = [
  { value: '3', label: '3s' },
  { value: '5', label: '5s' },
  { value: '10', label: '10s' },
  { value: '15', label: '15s' },
  { value: '20', label: '20s' },
  { value: '25', label: '25s' },
  { value: '30', label: '30s' },
];

const aspectRatioOptions = [
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '1:1', label: '1:1' },
  { value: '2.35:1', label: '2.35:1' },
  { value: '4:3', label: '4:3' },
];

const resolutionOptions = [
  { value: '720p', label: '720p' },
  { value: '1080p', label: '1080p' },
  { value: '2K', label: '2K' },
  { value: '4K', label: '4K' },
  { value: '8K', label: '8K' },
];

const styleOptions = [
  { value: 'realistic', label: '写实' },
  { value: 'cartoon', label: '卡通' },
  { value: 'oil-painting', label: '油画' },
  { value: 'cg', label: 'CG' },
  { value: 'cinematic', label: '电影感' },
  { value: 'commercial', label: '广告风' },
  { value: 'documentary', label: '纪录片' },
  { value: 'low-saturation', label: '低饱和' },
  { value: 'premium', label: '高级感' },
  { value: 'healing', label: '治愈系' },
  { value: 'vintage', label: '复古' },
];

interface UploadedImage {
  id: string;
  url: string;
  file: File;
}

// 将 File 转为 base64 字符串（带 data: 前缀），便于存入 localStorage
const fileToBase64 = (file: File | Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('FileReader result is not a string'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('FileReader error'));
    reader.readAsDataURL(file);
  });

// 压缩参数：长边限制 1024px，JPEG 质量 0.8，避免 localStorage 5MB 限制
const MAX_IMAGE_LONG_EDGE = 1024;
const IMAGE_QUALITY = 0.8;

// 加载图片并获取其自然尺寸
const loadImageElement = (dataUrl: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = dataUrl;
  });

// 将图片压缩到长边 1024、JPEG 质量 0.8，返回新的 base64 data URL
const compressImage = async (file: File): Promise<string> => {
  // jsdom / Node 测试环境没有真正的图像解码能力，直接返回原始 base64
  if (process.env.NODE_ENV === 'test' || (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent))) {
    return fileToBase64(file);
  }

  const originalDataUrl = await fileToBase64(file);
  const img = await loadImageElement(originalDataUrl);
  const { width, height } = img;

  const longEdge = Math.max(width, height);
  // 如果原图已经比限制小，且是 JPEG，则直接复用原图
  if (longEdge <= MAX_IMAGE_LONG_EDGE && file.type === 'image/jpeg') {
    return originalDataUrl;
  }

  // 计算缩放比例
  const scale = longEdge > MAX_IMAGE_LONG_EDGE ? MAX_IMAGE_LONG_EDGE / longEdge : 1;
  const targetWidth = Math.round(width * scale);
  const targetHeight = Math.round(height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return originalDataUrl;
  }
  // 白底，避免 PNG 透明区域在 JPEG 上变黑
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, targetWidth, targetHeight);
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  // 统一输出为 JPEG 以获得更好的压缩率
  return canvas.toDataURL('image/jpeg', IMAGE_QUALITY);
};

export default function HomePage() {
  const [inputValue, setInputValue] = useState('');
  const [timecode, setTimecode] = useState('00:00:00:00');
  const [videoParams, setVideoParams] = useState<VideoParams>({
    duration: '10',
    aspectRatio: '16:9',
    resolution: '1080p',
    style: 'realistic',
  });
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [dragging, setDragging] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [selectedStyles, setSelectedStyles] = useState<string[]>(['realistic']);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStage, setAnalysisStage] = useState('');
  const [showWelcome, setShowWelcome] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const requestId = useRef(generateRequestId());

  const MAX_IMAGES = 9;
  const MAX_FILE_SIZE = 20 * 1024 * 1024;

  useEffect(() => {
    setDevMode(process.env.NEXT_PUBLIC_ENV_MODE === 'dev');
    
    logUserAction(requestId.current, 'page_load', '/');
    logInfo(requestId.current, 'FRONTEND_HOME_LOAD', 'frontend', 'started', {
      timestamp: new Date().toISOString()
    });
    
    const hasVisited = localStorage.getItem('hasVisited');
    if (!hasVisited) {
      setShowWelcome(true);
      localStorage.setItem('hasVisited', 'true');
      logInfo(requestId.current, 'FRONTEND_FIRST_VISIT', 'frontend', 'success', {
        showWelcome: true
      });
    }

    const savedData = localStorage.getItem('homeDraft');
    if (savedData) {
      try {
        const data = JSON.parse(savedData);
        if (data.inputValue) setInputValue(data.inputValue);
        if (data.videoParams) setVideoParams(data.videoParams);
        if (data.selectedStyles) setSelectedStyles(data.selectedStyles);
        logInfo(requestId.current, 'FRONTEND_DRAFT_LOADED', 'frontend', 'success', {});
      } catch (e) {
        logError(requestId.current, 'FRONTEND_DRAFT_LOAD_ERROR', 'frontend', 'DRAFT_ERROR', 
          'Failed to load draft data', {}, {}, requestId.current, e instanceof Error ? e.stack : undefined);
      }
    }

    const timer = setInterval(() => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const frames = String(Math.floor((now.getMilliseconds() / 1000) * 24)).padStart(2, '0');
      setTimecode(`${hours}:${minutes}:${seconds}:${frames}`);
    }, 100);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const draftData = {
      inputValue,
      videoParams,
      selectedStyles,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem('homeDraft', JSON.stringify(draftData));
    logInfo(requestId.current, 'FRONTEND_DRAFT_SAVED', 'frontend', 'success', {});
  }, [inputValue, videoParams, selectedStyles]);

  const handleParamChange = (key: keyof VideoParams, value: string) => {
    logUserAction(requestId.current, 'param_change', '/', {
      key,
      value,
      params: { ...videoParams, [key]: value }
    });
    setVideoParams((prev) => ({ ...prev, [key]: value }));
    setActiveDropdown(null);
  };

  const toggleStyle = (styleValue: string) => {
    setSelectedStyles((prev) => {
      const newStyles = prev.includes(styleValue)
        ? prev.filter((s) => s !== styleValue)
        : [...prev, styleValue];
      logUserAction(requestId.current, 'style_toggle', '/', {
        style: styleValue,
        selected: newStyles
      });
      return newStyles;
    });
  };

  const handleSubmit = () => {
    if (!inputValue.trim()) {
      logWarn(requestId.current, 'FRONTEND_SUBMIT_EMPTY', 'frontend', 
        'Submit failed: description is empty', {}, {});
      return;
    }
    
    logUserAction(requestId.current, 'submit_analysis', '/');
    logInfo(requestId.current, 'FRONTEND_ANALYSIS_START', 'frontend', 'started', {
      description: inputValue.slice(0, 50),
      images: uploadedImages.length,
      params: videoParams
    });
    startAnalysis();
  };

  const startAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    
    const stages = [
      { progress: 10, text: '正在分析素材...', duration: 300 },
      { progress: 30, text: '识别图像内容...', duration: 300 },
      { progress: 50, text: '提取关键元素...', duration: 300 },
      { progress: 70, text: '分析场景构图...', duration: 300 },
      { progress: 85, text: '生成分镜脚本...', duration: 500 },
      { progress: 100, text: '准备就绪', duration: 300 },
    ];

    let generatedShots: ShotDetail[] = [];
    let regenerateCount = 0;
    const MAX_REGENERATE = 3;
    const TARGET_DURATION = parseInt(videoParams.duration);
    
    try {
      // 分析用户描述提取产品特征
      const productFeatures = analyzeProductFeatures(inputValue);
      
      console.log('\n' + '='.repeat(80));
      console.log('[AI PROMPT] 产品特征分析结果');
      console.log('='.repeat(80));
      console.log(JSON.stringify(productFeatures, null, 2));
      console.log('='.repeat(80) + '\n');
      
      // 构建完整的Prompt
      const fullPrompt = buildStoryboardPrompt(inputValue, productFeatures, videoParams, selectedStyles, uploadedImages.length);
      
      // 构造发送给AI的Messages
      const messages = buildAIMessages(fullPrompt, videoParams.duration, selectedStyles);
      
      // 在控制台打印完整的Prompt和Messages
      console.log('\n' + '='.repeat(80));
      console.log('[AI PROMPT] 完整提示词（发送给混元AI）');
      console.log('='.repeat(80));
      console.log('用户场景描述:', inputValue);
      console.log('视频时长:', videoParams.duration + '秒');
      console.log('视频风格:', selectedStyles.map(s => getStyleLabel(s)).join('、'));
      console.log('图片数量:', uploadedImages.length);
      console.log('='.repeat(80) + '\n');
      
      console.log('[AI MESSAGES] 发送给AI的完整Messages:');
      console.log(JSON.stringify(messages, null, 2));
      console.log('='.repeat(80) + '\n');
      
      // AI生成分镜（带评分和自动重生成）
      let scoreResult = { score: 0, details: { richness: 0, commercialValue: 0, productCoverage: 0, visualExpression: 0, conversionAbility: 0 } };
      
      while (regenerateCount < MAX_REGENERATE) {
        // 调用混元AI生成分镜
        setAnalysisStage('正在调用AI生成分镜...');
        console.log(`[LOG] 开始调用混元AI生成分镜 (第${regenerateCount + 1}次)`);
        
        const aiResult = await chatWithAI(messages, {
          temperature: 0.7 + regenerateCount * 0.1,
          maxTokens: 2048
        });
        
        console.log(`[LOG] 混元AI响应成功，模型: ${aiResult.model}`);
        console.log(`[LOG] AI返回内容长度: ${aiResult.content.length}字符`);
        
        // 解析AI返回的分镜数据
        const parsedShots = parseAIResponse(aiResult.content, TARGET_DURATION);
        
        if (parsedShots && parsedShots.length > 0) {
          // 评分
          scoreResult = scoreStoryboard(parsedShots, productFeatures);
          
          console.log('\n' + '='.repeat(80));
          console.log('[AI DIRECTOR] 分镜评分结果');
          console.log('='.repeat(80));
          console.log('总分:', scoreResult.score);
          console.log('镜头丰富度:', scoreResult.details.richness);
          console.log('商业价值:', scoreResult.details.commercialValue);
          console.log('产品展示完整度:', scoreResult.details.productCoverage);
          console.log('视觉表现力:', scoreResult.details.visualExpression);
          console.log('转化能力:', scoreResult.details.conversionAbility);
          console.log('='.repeat(80) + '\n');
          
          if (scoreResult.score >= 80) {
            console.log(`[LOG] 分镜评分 ${scoreResult.score} 分，符合要求，接受结果`);
            generatedShots = parsedShots;
            break;
          } else {
            console.log(`[LOG] 分镜评分 ${scoreResult.score} 分，低于80分，重新生成...`);
            regenerateCount++;
          }
        } else {
          console.warn(`[LOG] AI返回解析失败，尝试第${regenerateCount + 1}次...`);
          regenerateCount++;
        }
      }
      
      // 如果AI生成失败或评分过低，使用本地生成分镜
      if (generatedShots.length === 0) {
        console.log(`[LOG] AI生成失败或评分持续低于80分，使用本地生成分镜`);
        generatedShots = generateLocalStoryboard(productFeatures, TARGET_DURATION, uploadedImages.length);
      }
      
      // 验证最终总时长
      const finalTotal = generatedShots.reduce((sum: number, s) => sum + s.duration, 0);
      console.log(`[LOG] 最终总时长: ${finalTotal.toFixed(2)}秒（目标: ${TARGET_DURATION}秒）`);
      console.log(`[LOG] 成功生成分镜，数量: ${generatedShots.length}，重生成次数: ${regenerateCount}`);
      
      // 输出详细分镜信息
      console.log('\n' + '='.repeat(80));
      console.log('[AI DIRECTOR] 最终分镜详情');
      console.log('='.repeat(80));
      generatedShots.forEach(shot => {
        console.log(`镜头${shot.num} (${shot.duration}s)`);
        console.log(`  场景: ${shot.scene}`);
        console.log(`  运镜: ${shot.camera}`);
        console.log(`  动作: ${shot.action}`);
        console.log(`  情绪: ${shot.emotion}`);
        console.log(`  目的: ${shot.purpose}`);
        console.log(`  AI提示词: ${shot.aiPrompt}`);
        console.log();
      });
      console.log('='.repeat(80) + '\n');
      
    } catch (aiError) {
      console.error(`[LOG] 调用混元AI失败，回退到本地生成分镜:`, aiError);
      // 回退到本地生成分镜
      const productFeatures = analyzeProductFeatures(inputValue);
      generatedShots = generateLocalStoryboard(productFeatures, TARGET_DURATION, uploadedImages.length);
    }
    
    // 将ShotDetail转换为StoryboardScene格式
    const audioOptions = ['轻快', '温暖', '沉稳', '史诗', '科技', '赛博', 'Vlog', '电子', '梦幻', '静音'];
    const storyboardScenes = generatedShots.map((shot, index) => ({
      id: `s${Date.now()}-${index}`,
      num: shot.num,
      duration: shot.duration,
      camera: shot.camera,
      audio: audioOptions[index % audioOptions.length],
      desc: shot.description,
      notes: '',
      thumb: uploadedImages[index % uploadedImages.length]?.url || '',
      scene: shot.scene,
      action: shot.action,
      emotion: shot.emotion,
      purpose: shot.purpose,
      composition: shot.composition,
      lighting: shot.lighting,
      aiPrompt: shot.aiPrompt,
    }));
    
    for (const stage of stages) {
      setAnalysisStage(stage.text);
      logInfo(requestId.current, 'FRONTEND_ANALYSIS_STAGE', 'frontend', 'processing', {
        stage: stage.text,
        progress: stage.progress
      });
      await new Promise(resolve => setTimeout(resolve, stage.duration));
      setAnalysisProgress(stage.progress);
    }

    // 构造待写入的项目数据
    const buildProjectData = (imagePayload: Array<{ id: string; url: string; name: string; size: number }>) => ({
      description: inputValue,
      images: imagePayload,
      shots: storyboardScenes,
      params: {
        ...videoParams,
        styles: selectedStyles,
      },
      createdAt: new Date().toISOString(),
      status: 'draft',
    });

    // localStorage 通常 ~5MB 限制，先尝试存全量 base64，超出则降级
    const fullImages = uploadedImages.map(img => ({
      id: img.id,
      url: img.url,
      name: img.file.name,
      size: img.file.size,
    }));
    const fullData = buildProjectData(fullImages);

    let saved = false;
    try {
      localStorage.setItem('currentProject', JSON.stringify(fullData));
      saved = true;
      logInfo(requestId.current, 'FRONTEND_PROJECT_SAVED', 'frontend', 'success', {
        status: 'draft',
        shots: generatedShots.length,
        images: uploadedImages.length,
        fullSize: true
      });
    } catch (e) {
      logWarn(requestId.current, 'FRONTEND_PROJECT_SAVE_LIMIT', 'frontend', 
        'Full save failed, attempting lite save', {}, {});
    }

    if (!saved) {
      const liteImages = fullImages.map(({ id, name, size }) => ({ id, url: '', name, size }));
      const liteData = buildProjectData(liteImages);
      try {
        localStorage.setItem('currentProject', JSON.stringify(liteData));
        logInfo(requestId.current, 'FRONTEND_PROJECT_SAVED', 'frontend', 'success', {
          status: 'draft',
          shots: generatedShots.length,
          images: uploadedImages.length,
          fullSize: false
        });
      } catch (e) {
        logError(requestId.current, 'FRONTEND_PROJECT_SAVE_ERROR', 'frontend', 'SAVE_ERROR', 
          'Failed to save project data', {}, {}, requestId.current, e instanceof Error ? e.stack : undefined);
      }
    }

    setTimeout(() => {
      setIsAnalyzing(false);
      setAnalysisProgress(0);
      setAnalysisStage('');
      logInfo(requestId.current, 'FRONTEND_ANALYSIS_COMPLETE', 'frontend', 'success', {
        redirectTo: '/storyboard'
      });
      window.location.href = '/storyboard';
    }, 500);
  };

  // 分析产品特征
  const analyzeProductFeatures = (description: string) => {
    const features: {
      productType: string;
      keyElements: string[];
      mood: string;
      targetAudience: string;
    } = {
      productType: '产品',
      keyElements: [],
      mood: '专业',
      targetAudience: '大众'
    };

    const desc = description.toLowerCase();
    
    // 产品类型识别
    if (desc.includes('手机') || desc.includes('手机壳') || desc.includes('充电器')) {
      features.productType = '电子产品';
      features.keyElements = ['屏幕', '摄像头', '材质', '功能'];
    } else if (desc.includes('服装') || desc.includes('衣服') || desc.includes('鞋子')) {
      features.productType = '时尚单品';
      features.keyElements = ['面料', '剪裁', '颜色', '搭配'];
    } else if (desc.includes('化妆品') || desc.includes('护肤品') || desc.includes('香水')) {
      features.productType = '美妆产品';
      features.keyElements = ['包装', '质地', '效果', '成分'];
    } else if (desc.includes('食品') || desc.includes('饮料') || desc.includes('零食')) {
      features.productType = '食品饮料';
      features.keyElements = ['包装', '成分', '口感', '健康'];
    } else {
      features.productType = '通用产品';
      features.keyElements = ['外观', '功能', '特点', '优势'];
    }

    // 情绪识别
    if (desc.includes('高端') || desc.includes('奢华') || desc.includes('精致')) {
      features.mood = '高端奢华';
    } else if (desc.includes('时尚') || desc.includes('潮流') || desc.includes('年轻')) {
      features.mood = '时尚潮流';
    } else if (desc.includes('简约') || desc.includes('清新') || desc.includes('自然')) {
      features.mood = '简约清新';
    } else if (desc.includes('科技') || desc.includes('未来') || desc.includes('创新')) {
      features.mood = '科技未来';
    }

    // 目标受众识别
    if (desc.includes('年轻人') || desc.includes('学生') || desc.includes('Z世代')) {
      features.targetAudience = '年轻人';
    } else if (desc.includes('商务') || desc.includes('职场') || desc.includes('白领')) {
      features.targetAudience = '商务人士';
    } else if (desc.includes('家庭') || desc.includes('亲子') || desc.includes('儿童')) {
      features.targetAudience = '家庭用户';
    }

    console.log(`[LOG] 产品特征分析:`, features);
    return features;
  };

  // 生成分镜脚本
  const generateStoryboardShots = (
    shotCount: number,
    avgDuration: number,
    features: Features,
    style: string,
    images: UploadedImage[]
  ) => {
    const cameraOptions = ['推镜头', '拉镜头', '摇镜头', '移镜头', '跟镜头', '升镜头', '降镜头', '旋转', '希区柯克', '延时'];
    const audioOptions = ['轻快', '温暖', '沉稳', '史诗', '科技', '赛博', 'Vlog', '电子', '梦幻', '静音'];
    
    const shots = [];
    
    // 根据产品类型生成不同的分镜模板
    const shotTemplates = getShotTemplates(features.productType, features.mood);
    
    for (let i = 0; i < shotCount; i++) {
      const template = shotTemplates[i % shotTemplates.length];
      const duration = i === shotCount - 1 
        ? avgDuration + (avgDuration * shotCount - avgDuration * (shotCount - 1)) // 最后一个镜头补齐总时长
        : avgDuration;
      
      const shot = {
        id: `s${Date.now()}-${i}`,
        num: i + 1,
        duration: duration,
        camera: cameraOptions[i % cameraOptions.length],
        audio: audioOptions[i % audioOptions.length],
        desc: generateShotDescription(template, features, i + 1, style),
        notes: '',
        thumb: images[i % images.length]?.url || '',
      };
      
      shots.push(shot);
      console.log(`[LOG] 生成分镜 ${i + 1}:`, shot.desc);
    }
    
    return shots;
  };

  // 获取分镜模板
  const getShotTemplates = (productType: string, mood: string) => {
    const templates = {
      '电子产品': [
        { type: '特写', content: '产品细节特写，展示工艺和质感', lighting: '专业灯光，突出细节' },
        { type: '全景', content: '产品整体展示，体现设计美感', lighting: '柔和光线，展现整体' },
        { type: '功能', content: '产品功能演示，展示实际使用场景', lighting: '自然光线，真实场景' },
        { type: '对比', content: '产品与竞品对比，突出优势', lighting: '对比光线，强调差异' },
        { type: '情感', content: '用户使用产品的愉悦体验', lighting: '温暖光线，营造氛围' },
      ],
      '时尚单品': [
        { type: '特写', content: '面料和工艺细节特写', lighting: '时尚灯光，突出质感' },
        { type: '上身', content: '模特上身效果展示', lighting: '专业摄影灯光' },
        { type: '搭配', content: '多种搭配方案展示', lighting: '多变灯光，展现风格' },
        { type: '细节', content: '设计细节和品牌元素', lighting: '特写灯光，强调品牌' },
        { type: '动态', content: '动态展示服装的飘逸感', lighting: '动态光线，增强动感' },
      ],
      '美妆产品': [
        { type: '包装', content: '产品包装和品牌展示', lighting: '精致光线，突出包装' },
        { type: '质地', content: '产品质地和涂抹效果', lighting: '柔和光线，展现质地' },
        { type: '效果', content: '使用前后的对比效果', lighting: '对比光线，突出效果' },
        { type: '成分', content: '天然成分和安全性展示', lighting: '自然光线，强调天然' },
        { type: '场景', content: '在不同场景下的使用效果', lighting: '多变光线，展现多场景' },
      ],
      '食品饮料': [
        { type: '包装', content: '产品包装和品牌展示', lighting: '明亮光线，突出包装' },
        { type: '成分', content: '新鲜食材和营养成分展示', lighting: '自然光线，强调新鲜' },
        { type: '制作', content: '制作过程和工艺展示', lighting: '温暖光线，营造温馨' },
        { type: '品尝', content: '品尝体验和满足感', lighting: '诱人光线，激发食欲' },
        { type: '场景', content: '在不同场合的享用场景', lighting: '多变光线，展现场景' },
      ],
      '通用产品': [
        { type: '特写', content: '产品细节特写，展示工艺', lighting: '专业灯光，突出细节' },
        { type: '全景', content: '产品整体展示，体现设计', lighting: '柔和光线，展现整体' },
        { type: '功能', content: '产品功能和使用场景', lighting: '自然光线，真实场景' },
        { type: '优势', content: '产品优势和特点展示', lighting: '对比光线，突出优势' },
        { type: '体验', content: '用户使用体验和满意度', lighting: '温暖光线，营造氛围' },
      ],
    };
    
    return templates[productType as keyof typeof templates] || templates['通用产品'];
  };

  // 生成单个镜头描述
  const generateShotDescription = (template: ShotTemplate, features: Features, shotNum: number, style: string) => {
    const styleDescriptions = {
      'realistic': '写实风格，真实还原产品细节',
      'cartoon': '卡通风格，活泼可爱的表现形式',
      'oil-painting': '油画质感，艺术化的视觉效果',
      'cg': 'CG渲染，精细的3D建模效果',
      'cinematic': '电影质感，专业的镜头语言',
      'commercial': '广告风格，突出产品卖点',
      'documentary': '纪录片风格，真实自然的表现',
      'low-saturation': '低饱和度，简约高级的色调',
      'premium': '高端质感，奢华精致的视觉',
      'healing': '治愈系风格，温暖柔和的氛围',
      'vintage': '复古风格，怀旧经典的质感',
    };
    
    const moodDescriptions = {
      '高端奢华': '营造奢华尊贵的氛围',
      '时尚潮流': '展现时尚前卫的风格',
      '简约清新': '体现简约清新之美',
      '科技未来': '突出科技感和未来感',
      '专业': '专业严谨的表现方式',
    };
    
    const description = `镜头${shotNum}：${template.type}镜头 - ${template.content}。${styleDescriptions[style as keyof typeof styleDescriptions] || ''}。${moodDescriptions[features.mood as keyof typeof moodDescriptions] || ''}。光影效果：${template.lighting}。目标受众：${features.targetAudience}。`;
    
    return description;
  };

  // 获取风格标签（用于显示）
  const getStyleLabel = (styleValue: string): string => {
    const styleMap: Record<string, string> = {
      'realistic': '写实',
      'cartoon': '卡通',
      'oil-painting': '油画',
      'cg': 'CG',
      'cinematic': '电影感',
      'commercial': '广告风',
      'documentary': '纪录片',
      'low-saturation': '低饱和',
      'premium': '高级感',
      'healing': '治愈系',
      'vintage': '复古',
    };
    return styleMap[styleValue] || styleValue;
  };

  // 构建分镜Prompt（完整的用户请求）
  const buildStoryboardPrompt = (
    userDescription: string,
    features: Features,
    params: VideoParams,
    styles: string[],
    imageCount: number
  ): string => {
    const prompt = `
请根据以下信息为我生成一份专业的视频分镜脚本：

【用户场景描述】
${userDescription}

【产品特征分析】
- 产品类型：${features.productType}
- 关键元素：${features.keyElements.join('、')}
- 情绪风格：${features.mood}
- 目标受众：${features.targetAudience}

【视频参数】
- 总时长：${params.duration}秒
- 画面比例：${params.aspectRatio}
- 分辨率：${params.resolution}
- 视觉风格：${styles.map(s => getStyleLabel(s)).join('、')}

【素材信息】
- 参考图片数量：${imageCount}张

【生成要求】
请生成3-8个镜头的分镜脚本，要求：
1. 镜头要有叙事逻辑，从开场到结尾要有完整的故事线
2. 每个镜头注明镜头类型（如特写、全景、中景等）和时长
3. 考虑产品展示的重点，结合用户描述的场景
4. 确保镜头总数的时长总和接近指定的总时长

请输出JSON格式，包含shots数组。
    `.trim();
    
    return prompt;
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const getParamLabel = (key: keyof VideoParams, value: string) => {
    const optionMap: Record<keyof VideoParams, Record<string, string>> = {
      duration: Object.fromEntries(durationOptions.map((o) => [o.value, o.label])),
      aspectRatio: Object.fromEntries(aspectRatioOptions.map((o) => [o.value, o.label])),
      resolution: Object.fromEntries(resolutionOptions.map((o) => [o.value, o.label])),
      style: Object.fromEntries(styleOptions.map((o) => [o.value, o.label])),
    };
    return optionMap[key][value] || value;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragging(true);
    logInfo(requestId.current, 'FRONTEND_DRAG_OVER', 'frontend', 'processing', {});
  };

  const handleDragLeave = () => {
    setDragging(false);
    logInfo(requestId.current, 'FRONTEND_DRAG_LEAVE', 'frontend', 'processing', {});
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    
    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    );
    
    logUserAction(requestId.current, 'image_drop', '/', {
      count: files.length,
      currentCount: uploadedImages.length
    });
    handleFiles(files);
  };

  const handleClickUpload = () => {
    logUserAction(requestId.current, 'image_upload_click', '/');
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(file => 
      file.type.startsWith('image/')
    );
    logUserAction(requestId.current, 'image_select', '/', {
      count: files.length
    });
    handleFiles(files);
    e.target.value = '';
  };

  const handleFiles = async (files: File[]) => {
    const validFiles = files.filter(file => file.size <= MAX_FILE_SIZE);
    const invalidCount = files.length - validFiles.length;

    if (invalidCount > 0) {
      logWarn(requestId.current, 'FRONTEND_FILE_INVALID', 'frontend', 
        `Invalid files: ${invalidCount} (over 20MB limit)`, {}, {});
    }

    const remainingSlots = Math.max(0, MAX_IMAGES - uploadedImages.length);
    const accepted = validFiles.slice(0, remainingSlots);

    const encoded = await Promise.all(
      accepted.map(async (file) => {
        try {
          const dataUrl = await compressImage(file);
          return {
            id: Math.random().toString(36).substr(2, 9),
            url: dataUrl,
            file,
          };
        } catch (e) {
          logError(requestId.current, 'FRONTEND_IMAGE_COMPRESS_ERROR', 'frontend', 'COMPRESS_ERROR', 
            'Image compression failed, falling back to original', {
              fileName: file.name,
              fileSize: file.size
            }, {}, requestId.current, e instanceof Error ? e.stack : undefined);
          try {
            const dataUrl = await fileToBase64(file);
            return {
              id: Math.random().toString(36).substr(2, 9),
              url: dataUrl,
              file,
            };
          } catch (e2) {
            console.error('[LOG] 首页 - 图片转 base64 失败，回退到 blob URL:', e2);
            return {
              id: Math.random().toString(36).substr(2, 9),
              url: URL.createObjectURL(file),
              file,
            };
          }
        }
      })
    );

    console.log(`[LOG] 图片上传成功 - 新增: ${encoded.length}张, 总计: ${uploadedImages.length + encoded.length}张`);
    setUploadedImages(prev => [...prev, ...encoded].slice(0, MAX_IMAGES));
  };

  const removeImage = (id: string) => {
    const image = uploadedImages.find(img => img.id === id);
    if (image && image.url.startsWith('blob:')) {
      URL.revokeObjectURL(image.url);
    }
    console.log(`[LOG] 删除图片 - ID: ${id}`);
    setUploadedImages(prev => prev.filter(img => img.id !== id));
  };

  const toggleDropdown = (paramKey: string) => {
    setActiveDropdown(activeDropdown === paramKey ? null : paramKey);
  };

  const getOptions = (paramKey: string) => {
    switch (paramKey) {
      case 'duration': return durationOptions;
      case 'aspectRatio': return aspectRatioOptions;
      case 'resolution': return resolutionOptions;
      case 'style': return styleOptions;
      default: return [];
    }
  };

  return (
    <div className="h-full w-full bg-surface-0 flex">
      <Sidebar currentPage="home" />

      <main className="main">
        <section className="home-page">
          <span className="vf-tl"></span>
          <span className="vf-tr"></span>
          <span className="vf-bl"></span>
          <span className="vf-br"></span>
          <div className="safety-area"></div>

          <div className="timecode-bar">
            <div className="rec-indicator">
              <span className="rec-dot"></span>
              <span>REC</span>
            </div>
            <span>{timecode}</span>
          </div>

          <div className="creative-panel">
            <div style={{ textAlign: 'center' }}>
              <div className="brand-mark">
                <span className="bm-line"></span>
                <span className="bm-label">Director Mode</span>
                <span className="bm-line"></span>
              </div>
              <h1>AI 导演系统</h1>
              <p className="subtitle">用文字描述，让 AI 为你创作精彩视频</p>
            </div>

            {/* Upload Zone */}
            <div
              className={`upload-zone ${dragging ? 'dragging' : ''} ${uploadedImages.length > 0 ? 'has-images' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleClickUpload}
            >
              {uploadedImages.length > 0 ? (
                <div className="uploaded-images">
                  {uploadedImages.map((image) => (
                    <div key={image.id} className="uploaded-image">
                      <img src={image.url} alt="" />
                      <button className="remove-image-btn" onClick={(e) => { e.stopPropagation(); removeImage(image.id); }}>
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {uploadedImages.length < MAX_IMAGES && (
                    <div className="add-image-placeholder">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="upload-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                  <span className="upload-text">拖拽图片或点击上传参考素材</span>
                  <span className="upload-hint">支持 JPG、PNG，最多 9 张，单张不超过 20MB</span>
                </>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden-file-input"
              onChange={handleFileChange}
            />

            {/* Input Area */}
            <div className="input-area">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="描述你想要创作的视频内容..."
              />
              <span className="input-hint">Enter 发送</span>
            </div>

            {/* Param Strip */}
            <div className="param-strip-expanded">
              <div className="param-item-clickable" onClick={() => toggleDropdown('duration')}>
                <span className="param-label-sm">时长</span>
                <span className="param-value-sm">{getParamLabel('duration', videoParams.duration)}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${activeDropdown === 'duration' ? 'rotate-180' : ''}`} />
                {activeDropdown === 'duration' && (
                  <div className="param-dropdown">
                    {getOptions('duration').map((opt) => (
                      <span
                        key={opt.value}
                        className={`param-dropdown-option ${videoParams.duration === opt.value ? 'selected' : ''}`}
                        onClick={() => handleParamChange('duration', opt.value)}
                      >
                        {opt.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="param-item-clickable" onClick={() => toggleDropdown('aspectRatio')}>
                <span className="param-label-sm">比例</span>
                <span className="param-value-sm">{getParamLabel('aspectRatio', videoParams.aspectRatio)}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${activeDropdown === 'aspectRatio' ? 'rotate-180' : ''}`} />
                {activeDropdown === 'aspectRatio' && (
                  <div className="param-dropdown">
                    {getOptions('aspectRatio').map((opt) => (
                      <span
                        key={opt.value}
                        className={`param-dropdown-option ${videoParams.aspectRatio === opt.value ? 'selected' : ''}`}
                        onClick={() => handleParamChange('aspectRatio', opt.value)}
                      >
                        {opt.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="param-item-clickable" onClick={() => toggleDropdown('resolution')}>
                <span className="param-label-sm">清晰度</span>
                <span className="param-value-sm">{getParamLabel('resolution', videoParams.resolution)}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${activeDropdown === 'resolution' ? 'rotate-180' : ''}`} />
                {activeDropdown === 'resolution' && (
                  <div className="param-dropdown">
                    {getOptions('resolution').map((opt) => (
                      <span
                        key={opt.value}
                        className={`param-dropdown-option ${videoParams.resolution === opt.value ? 'selected' : ''}`}
                        onClick={() => handleParamChange('resolution', opt.value)}
                      >
                        {opt.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="param-item-clickable" onClick={() => toggleDropdown('style')}>
                <span className="param-label-sm">风格</span>
                <span className="param-value-sm">{selectedStyles.length > 0 ? `${selectedStyles.length}个风格` : '选择风格'}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${activeDropdown === 'style' ? 'rotate-180' : ''}`} />
                {activeDropdown === 'style' && (
                  <div className="param-dropdown param-dropdown-scrollable">
                    {getOptions('style').map((opt) => (
                      <span
                        key={opt.value}
                        className={`param-dropdown-option ${selectedStyles.includes(opt.value) ? 'selected' : ''}`}
                        onClick={() => toggleStyle(opt.value)}
                      >
                        {opt.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button - Circle */}
            <button 
              className={`btn-circle ${!uploadedImages.length ? 'disabled' : ''}`} 
              onClick={handleSubmit}
              disabled={!uploadedImages.length || isAnalyzing}
            >
              <Video className="btn-circle-icon" />
              <span className="btn-circle-text">{isAnalyzing ? 'Analyzing...' : 'Action'}</span>
            </button>
          </div>

          {/* Welcome Modal */}
          {showWelcome && (
            <div className="welcome-modal">
              <div className="welcome-content">
                <div className="welcome-icon">🎬</div>
                <h3>欢迎使用 Director Mode</h3>
                <p>上传产品图片，AI将帮您生成精彩的视频内容</p>
                <div className="welcome-steps">
                  <div className="welcome-step">
                    <span className="step-num">1</span>
                    <span>上传图片（最多9张）</span>
                  </div>
                  <div className="welcome-step">
                    <span className="step-num">2</span>
                    <span>描述视频内容</span>
                  </div>
                  <div className="welcome-step">
                    <span className="step-num">3</span>
                    <span>点击 Action 开始创作</span>
                  </div>
                </div>
                <button className="btn btn-primary" onClick={() => setShowWelcome(false)}>
                  开始创作
                </button>
              </div>
            </div>
          )}

          {/* AI Analysis Modal */}
          {isAnalyzing && (
            <div className="analysis-modal">
              <div className="analysis-content">
                <div className="analysis-icon">
                  <div className="analysis-spinner"></div>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                </div>
                <h3 className="analysis-title">AI 正在分析素材</h3>
                <p className="analysis-stage">{analysisStage}</p>
                <div className="analysis-progress-bar">
                  <div 
                    className="analysis-progress-fill" 
                    style={{ width: `${analysisProgress}%` }}
                  ></div>
                </div>
                <p className="analysis-progress-text">{analysisProgress}%</p>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
export interface Project {
  id: string;
  name: string;
  type: 'ai-tool' | 'document' | 'image-generation' | 'other';
  files: FileItem[];
  createdAt: string;
  updatedAt: string;
}

export interface FileItem {
  id: string;
  name: string;
  type: 'folder' | 'file';
  extension?: string;
  size?: number;
  createdAt: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface VideoParams {
  duration: string;
  aspectRatio: string;
  resolution: string;
  style: string;
}

export interface Frame {
  id: string;
  scene: string;
  description: string;
  duration: number;
  cameraAngle: string;
  mood: string;
}

export interface Storyboard {
  id: string;
  projectId: string;
  title: string;
  frames: Frame[];
  createdAt: string;
}

export interface StoryboardScene {
  id: string;
  num: number;
  duration: number;
  camera: string;
  audio: string;
  desc: string;
  notes: string;
  thumb: string;
  scene?: string;
  action?: string;
  emotion?: string;
  purpose?: string;
  composition?: string;
  lighting?: string;
  aiPrompt?: string;
}

export interface ProductFeatures {
  productType: string;
  productCategory: string;
  keyElements: string[];
  mood: string;
  targetAudience: string;
  hasModel: boolean;
  hasScene: boolean;
}

export interface ShotDetail {
  num: number;
  duration: number;
  scene: string;
  camera: string;
  action: string;
  emotion: string;
  purpose: string;
  description: string;
  composition: string;
  lighting: string;
  soundEffect: string;
  notes: string;
  aiPrompt: string;
}

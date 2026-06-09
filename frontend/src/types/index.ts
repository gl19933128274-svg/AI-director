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

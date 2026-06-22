// 分镜模块错误处理
export class StoryboardError extends Error {
  public code: number;
  public field?: string;

  constructor(message: string, code: number, field?: string) {
    super(message);
    this.code = code;
    this.field = field;
    this.name = 'StoryboardError';
  }
}

// 验证错误
export class ValidationError extends StoryboardError {
  constructor(message: string, field: string) {
    super(message, 400, field);
    this.name = 'ValidationError';
  }
}

// 生成错误
export class GenerationError extends StoryboardError {
  constructor(message: string) {
    super(message, 500);
    this.name = 'GenerationError';
  }
}
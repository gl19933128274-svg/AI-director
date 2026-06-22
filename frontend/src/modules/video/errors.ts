// 视频模块错误处理
export class VideoError extends Error {
  public code: number;
  public field?: string;

  constructor(message: string, code: number, field?: string) {
    super(message);
    this.code = code;
    this.field = field;
    this.name = 'VideoError';
  }
}

// 验证错误
export class ValidationError extends VideoError {
  constructor(message: string, field: string) {
    super(message, 400, field);
    this.name = 'ValidationError';
  }
}

// 队列错误
export class QueueError extends VideoError {
  constructor(message: string) {
    super(message, 429);
    this.name = 'QueueError';
  }
}
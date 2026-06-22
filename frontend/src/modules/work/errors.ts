// 作品模块错误处理
export class WorkError extends Error {
  public code: number;
  public field?: string;

  constructor(message: string, code: number, field?: string) {
    super(message);
    this.code = code;
    this.field = field;
    this.name = 'WorkError';
  }
}

export class UserError extends WorkError {
  constructor(message: string, code: number = 400) {
    super(message, code);
    this.name = 'UserError';
  }
}

// 验证错误
export class ValidationError extends WorkError {
  constructor(message: string, field: string) {
    super(message, 400, field);
    this.name = 'ValidationError';
  }
}

// 权限错误
export class PermissionError extends WorkError {
  constructor(message: string = '权限不足') {
    super(message, 403);
    this.name = 'PermissionError';
  }
}
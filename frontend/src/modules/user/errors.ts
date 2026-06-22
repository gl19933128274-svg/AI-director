// 用户模块错误处理
export class UserError extends Error {
  public code: number;
  public field?: string;

  constructor(message: string, code: number, field?: string) {
    super(message);
    this.code = code;
    this.field = field;
    this.name = 'UserError';
  }
}

// 用户认证错误
export class AuthError extends Error {
  public code: number;

  constructor(message: string, code: number = 401) {
    super(message);
    this.code = code;
    this.name = 'AuthError';
  }
}

// 验证错误
export class ValidationError extends UserError {
  constructor(message: string, field: string) {
    super(message, 400, field);
    this.name = 'ValidationError';
  }
}

// 权限错误
export class PermissionError extends AuthError {
  constructor(message: string = '权限不足') {
    super(message, 403);
    this.name = 'PermissionError';
  }
}
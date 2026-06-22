// 会员模块错误处理
export class MembershipError extends Error {
  public code: number;
  public field?: string;

  constructor(message: string, code: number, field?: string) {
    super(message);
    this.code = code;
    this.field = field;
    this.name = 'MembershipError';
  }
}

// 验证错误
export class ValidationError extends MembershipError {
  constructor(message: string, field: string) {
    super(message, 400, field);
    this.name = 'ValidationError';
  }
}

// 权限错误
export class PermissionError extends MembershipError {
  constructor(message: string) {
    super(message, 403);
    this.name = 'PermissionError';
  }
}

// 订单错误
export class OrderError extends MembershipError {
  constructor(message: string, code: number = 500) {
    super(message, code);
    this.name = 'OrderError';
  }
}
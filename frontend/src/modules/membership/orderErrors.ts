// 订单模块错误处理
export class OrderError extends Error {
  public code: number;
  public field?: string;

  constructor(message: string, code: number, field?: string) {
    super(message);
    this.code = code;
    this.field = field;
    this.name = 'OrderError';
  }
}

// 验证错误
export class ValidationError extends OrderError {
  constructor(message: string, field: string) {
    super(message, 400, field);
    this.name = 'ValidationError';
  }
}
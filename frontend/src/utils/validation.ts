export interface ValidationResult {
  valid: boolean;
  errors: string[];
  missingFields: string[];
  invalidFields: string[];
}

export interface SchemaField {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  allowedValues?: string[] | number[];
  nullable?: boolean;
}

export type Schema = Record<string, SchemaField>;

export function validateSchema(data: unknown, schema: Schema): ValidationResult {
  const errors: string[] = [];
  const missingFields: string[] = [];
  const invalidFields: string[] = [];

  if (data === null || data === undefined) {
    return {
      valid: false,
      errors: ['数据不能为空'],
      missingFields: [],
      invalidFields: [],
    };
  }

  if (typeof data !== 'object') {
    return {
      valid: false,
      errors: ['数据必须是对象'],
      missingFields: [],
      invalidFields: [],
    };
  }

  const obj = data as Record<string, unknown>;

  for (const [field, rules] of Object.entries(schema)) {
    const value = obj[field];

    if (rules.required && value === undefined) {
      missingFields.push(field);
      errors.push(`${field} 是必填字段`);
      continue;
    }

    if (value === null) {
      if (!rules.nullable) {
        errors.push(`${field} 不能为 null`);
        invalidFields.push(field);
      }
      continue;
    }

    if (value === undefined) {
      continue;
    }

    switch (rules.type) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push(`${field} 必须是字符串类型`);
          invalidFields.push(field);
        } else {
          if (rules.minLength && value.length < rules.minLength) {
            errors.push(`${field} 长度不能小于 ${rules.minLength}`);
            invalidFields.push(field);
          }
          if (rules.maxLength && value.length > rules.maxLength) {
            errors.push(`${field} 长度不能大于 ${rules.maxLength}`);
            invalidFields.push(field);
          }
          if (rules.pattern && !rules.pattern.test(value)) {
            errors.push(`${field} 格式不正确`);
            invalidFields.push(field);
          }
          if (rules.allowedValues && !rules.allowedValues.includes(value)) {
            errors.push(`${field} 的值必须是 ${rules.allowedValues.join(', ')} 之一`);
            invalidFields.push(field);
          }
        }
        break;

      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          errors.push(`${field} 必须是数字类型`);
          invalidFields.push(field);
        } else {
          if (rules.min !== undefined && value < rules.min) {
            errors.push(`${field} 不能小于 ${rules.min}`);
            invalidFields.push(field);
          }
          if (rules.max !== undefined && value > rules.max) {
            errors.push(`${field} 不能大于 ${rules.max}`);
            invalidFields.push(field);
          }
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push(`${field} 必须是布尔类型`);
          invalidFields.push(field);
        }
        break;

      case 'object':
        if (typeof value !== 'object' || Array.isArray(value)) {
          errors.push(`${field} 必须是对象类型`);
          invalidFields.push(field);
        }
        break;

      case 'array':
        if (!Array.isArray(value)) {
          errors.push(`${field} 必须是数组类型`);
          invalidFields.push(field);
        }
        break;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    missingFields,
    invalidFields,
  };
}

export const VideoGenerationSchema: Schema = {
  image: {
    type: 'string',
    required: true,
    minLength: 1,
    pattern: /^(https?:\/\/|data:image\/)/,
  },
  prompt: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 2000,
  },
  duration: {
    type: 'number',
    required: false,
    min: 1,
    max: 60,
  },
  style: {
    type: 'string',
    required: false,
    allowedValues: ['cinematic', 'realistic', 'anime'],
  },
};

export const StoryboardGenerationSchema: Schema = {
  prompt: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 2000,
  },
  shotCount: {
    type: 'number',
    required: false,
    min: 1,
    max: 20,
  },
  targetDuration: {
    type: 'number',
    required: false,
    min: 5,
    max: 120,
  },
  style: {
    type: 'string',
    required: false,
    allowedValues: ['cinematic', 'realistic', 'anime', 'documentary'],
  },
  quality: {
    type: 'string',
    required: false,
    allowedValues: ['low', 'medium', 'high', 'ultra'],
  },
};

export const TaskCreateSchema: Schema = {
  image_url: {
    type: 'string',
    required: true,
    minLength: 1,
  },
  prompt: {
    type: 'string',
    required: true,
    minLength: 1,
  },
  model_id: {
    type: 'string',
    required: true,
    minLength: 1,
  },
};

export function validateVideoGeneration(input: unknown): ValidationResult {
  return validateSchema(input, VideoGenerationSchema);
}

export function validateStoryboardGeneration(input: unknown): ValidationResult {
  return validateSchema(input, StoryboardGenerationSchema);
}

export function validateTaskCreate(input: unknown): ValidationResult {
  return validateSchema(input, TaskCreateSchema);
}
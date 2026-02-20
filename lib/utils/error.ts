import type { ApiResponse } from "@/types";

export type ErrorType = 
  | 'API_ERROR'
  | 'AUTH_ERROR'
  | 'VALIDATION_ERROR'
  | 'NETWORK_ERROR'
  | 'FILE_ERROR'
  | 'UPLOAD_ERROR'
  | 'UNKNOWN_ERROR';

export class AppError extends Error {
  constructor(
    message: string,
    public type: ErrorType,
    public statusCode: number = 500,
    public details?: unknown,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'AppError';
  }

  getUserMessage(): string {
    const messages: Record<ErrorType, string> = {
      API_ERROR: '服务器请求失败，请稍后重试',
      AUTH_ERROR: '认证失败，请重新登录',
      VALIDATION_ERROR: '输入数据不正确，请检查后重试',
      NETWORK_ERROR: '网络连接失败，请检查网络设置',
      FILE_ERROR: '文件操作失败',
      UPLOAD_ERROR: '文件上传失败，请重试',
      UNKNOWN_ERROR: '发生未知错误，请稍后重试',
    };
    return messages[this.type] || this.message;
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof ApiError) {
    return new AppError(
      error.message,
      error.status === 401 ? 'AUTH_ERROR' : 'API_ERROR',
      error.status,
      error.code,
      error
    );
  }

  if (error instanceof Error) {
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return new AppError(error.message, 'NETWORK_ERROR', 0, undefined, error);
    }
    if (error.message.includes('upload')) {
      return new AppError(error.message, 'UPLOAD_ERROR', 500, undefined, error);
    }
    return new AppError(error.message, 'UNKNOWN_ERROR', 500, undefined, error);
  }

  return new AppError('未知错误', 'UNKNOWN_ERROR', 500, error);
}

interface ErrorHandlerOptions {
  showToast?: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  logError?: boolean;
  rethrow?: boolean;
}

export function handleError(
  error: unknown,
  options: ErrorHandlerOptions = {}
): AppError {
  const { showToast, logError = true, rethrow = false } = options;
  const appError = toAppError(error);

  if (logError) {
    console.error(`[${appError.type}]`, appError.message, {
      statusCode: appError.statusCode,
      details: appError.details,
      originalError: appError.originalError,
    });
  }

  if (showToast) {
    showToast(appError.getUserMessage(), 'error');
  }

  if (rethrow) {
    throw appError;
  }

  return appError;
}

export function withErrorHandling<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  options: ErrorHandlerOptions = {}
): (...args: Parameters<T>) => Promise<ReturnType<T> | undefined> {
  return async (...args: Parameters<T>) => {
    try {
      return await fn(...args) as ReturnType<T>;
    } catch (error) {
      handleError(error, options);
      return undefined;
    }
  };
}

export function createApiError(message: string, status: number = 500): Response {
  const response: ApiResponse = {
    success: false,
    error: message,
  };

  return new Response(JSON.stringify(response), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

export function createApiResponse<T>(data: T): Response {
  const response: ApiResponse<T> = {
    success: true,
    data,
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export function validateRequestBody<T>(
  body: unknown,
  validator: (data: unknown) => data is T
): T | null {
  if (!body || typeof body !== 'object') {
    return null;
  }

  if (!validator(body)) {
    return null;
  }

  return body as T;
}

export function validateRequiredFields(
  data: Record<string, unknown>,
  fields: string[]
): string | null {
  for (const field of fields) {
    const value = data[field];
    if (value === undefined || value === null || value === '') {
      return `缺少必填字段: ${field}`;
    }
  }
  return null;
}

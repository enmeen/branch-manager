import { JsonError, JsonSuccess } from '../types';

/**
 * 输出 JSON 格式的成功响应
 */
export function outputSuccess<T = unknown>(data: T): void {
  const response: JsonSuccess<T> = {
    success: true,
    data,
  };
  console.log(JSON.stringify(response));
}

/**
 * 输出 JSON 格式的错误响应
 */
export function outputError(error: string, code?: string): void {
  const response: JsonError = {
    success: false,
    error,
    ...(code && { code }),
  };
  console.log(JSON.stringify(response));
}

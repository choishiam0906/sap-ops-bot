import { logger } from "../../logger.js";

/**
 * IPC 핸들러를 에러 래핑한다.
 * 에러 발생 시 로깅 후 정규화된 메시지로 reject하여
 * Renderer에서 일관된 에러 처리가 가능하도록 한다.
 */
export function wrapHandler<T>(
  channel: string,
  fn: (...args: unknown[]) => T | Promise<T>,
): (...args: unknown[]) => Promise<T> {
  return async (...args: unknown[]): Promise<T> => {
    try {
      return await fn(...args);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ channel, err }, `IPC 핸들러 에러: ${channel}`);
      throw new Error(message);
    }
  };
}

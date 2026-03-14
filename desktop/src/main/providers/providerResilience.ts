import type { ProviderType } from "../contracts.js";
import { logger } from "../logger.js";

interface CircuitState {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
}

const CIRCUIT_THRESHOLD = 5;
const CIRCUIT_RESET_MS = 30_000;

/**
 * Provider 복원력 래퍼.
 * - withRetry: 지수 백오프 재시도 (최대 3회)
 * - withCircuitBreaker: 연속 N회 실패 시 일시 차단
 * - withFallback: Primary 실패 시 대체 함수 실행
 */
export class ProviderResilience {
  private readonly circuits = new Map<ProviderType, CircuitState>();

  /** 지수 백오프 재시도 */
  async withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
    let lastError: Error | undefined;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * 2 ** attempt, 10_000);
          logger.warn({ attempt: attempt + 1, delay, error: lastError.message }, "재시도 대기");
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
    throw lastError;
  }

  /** Circuit Breaker: 연속 실패 시 차단 */
  async withCircuitBreaker<T>(
    providerType: ProviderType,
    fn: () => Promise<T>,
  ): Promise<T> {
    const circuit = this.getCircuit(providerType);

    if (circuit.isOpen) {
      if (Date.now() - circuit.lastFailure > CIRCUIT_RESET_MS) {
        // Half-open: 한 번 시도
        circuit.isOpen = false;
        circuit.failures = 0;
      } else {
        throw new Error(`${providerType} 서킷 브레이커 오픈 상태 — ${Math.ceil((CIRCUIT_RESET_MS - (Date.now() - circuit.lastFailure)) / 1000)}초 후 재시도`);
      }
    }

    try {
      const result = await fn();
      // 성공 시 리셋
      circuit.failures = 0;
      circuit.isOpen = false;
      return result;
    } catch (err) {
      circuit.failures++;
      circuit.lastFailure = Date.now();

      if (circuit.failures >= CIRCUIT_THRESHOLD) {
        circuit.isOpen = true;
        logger.error(
          { provider: providerType, failures: circuit.failures },
          "서킷 브레이커 오픈"
        );
      }

      throw err;
    }
  }

  /** Provider 장애 시 대체 Provider로 폴백 */
  async withFallback<T>(
    primary: () => Promise<T>,
    fallback: () => Promise<T>,
  ): Promise<T> {
    try {
      return await primary();
    } catch (primaryErr) {
      logger.warn(
        { error: primaryErr instanceof Error ? primaryErr.message : String(primaryErr) },
        "Primary 실패 — Fallback 시도"
      );
      return fallback();
    }
  }

  private getCircuit(providerType: ProviderType): CircuitState {
    let circuit = this.circuits.get(providerType);
    if (!circuit) {
      circuit = { failures: 0, lastFailure: 0, isOpen: false };
      this.circuits.set(providerType, circuit);
    }
    return circuit;
  }
}

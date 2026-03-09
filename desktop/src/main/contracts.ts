/**
 * contracts.ts — 하위 호환성 래퍼
 * 모든 타입과 상수는 types/ 모듈에서 정의되며, 이 파일은 re-export만 담당합니다.
 * 기존 `import { ... } from '../main/contracts.js'` 경로가 깨지지 않도록 유지합니다.
 */
export * from './types/index.js';

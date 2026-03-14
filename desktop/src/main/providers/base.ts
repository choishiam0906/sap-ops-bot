import { ProviderType } from "../contracts.js";
import { SecureRecord } from "../auth/secureStore.js";

export interface ProviderChatInput {
  model: string;
  message: string;
  history: Array<{ role: "user" | "assistant" | "system"; content: string }>;
}

export interface ProviderChatOutput {
  content: string;
  inputTokens: number;
  outputTokens: number;
}

export interface StreamChunk {
  delta: string;
  inputTokens?: number;
  outputTokens?: number;
}

export interface LlmProvider {
  readonly type: ProviderType;
  sendMessage(
    tokens: SecureRecord,
    input: ProviderChatInput
  ): Promise<ProviderChatOutput>;

  /** 스트리밍 지원 시 구현. 미구현 시 sendMessage 폴백. */
  sendMessageStream?(
    tokens: SecureRecord,
    input: ProviderChatInput,
    onChunk: (chunk: StreamChunk) => void,
  ): Promise<ProviderChatOutput>;
}

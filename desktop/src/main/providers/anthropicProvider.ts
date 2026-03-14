import { SecureRecord } from "../auth/secureStore.js";
import {
  LlmProvider,
  ProviderChatInput,
  ProviderChatOutput,
  StreamChunk,
} from "./base.js";

export class AnthropicProvider implements LlmProvider {
  readonly type = "anthropic" as const;

  constructor(private readonly apiBaseUrl: string) {}

  async sendMessage(
    tokens: SecureRecord,
    input: ProviderChatInput
  ): Promise<ProviderChatOutput> {
    const messages = [
      ...input.history,
      { role: "user", content: input.message },
    ];

    const response = await fetch(`${this.apiBaseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "x-api-key": tokens.accessToken,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: input.model,
        messages,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic request failed: ${response.status}`);
    }

    const payload = (await response.json()) as {
      content?: Array<{ text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };

    return {
      content: payload.content?.[0]?.text ?? "",
      inputTokens: payload.usage?.input_tokens ?? 0,
      outputTokens: payload.usage?.output_tokens ?? 0,
    };
  }

  async sendMessageStream(
    tokens: SecureRecord,
    input: ProviderChatInput,
    onChunk: (chunk: StreamChunk) => void,
  ): Promise<ProviderChatOutput> {
    const messages = [
      ...input.history,
      { role: "user", content: input.message },
    ];

    const response = await fetch(`${this.apiBaseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "x-api-key": tokens.accessToken,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: input.model,
        messages,
        max_tokens: 4096,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic stream request failed: ${response.status}`);
    }

    let fullContent = "";
    let inputTokens = 0;
    let outputTokens = 0;

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();

          try {
            const parsed = JSON.parse(data) as {
              type?: string;
              delta?: { type?: string; text?: string };
              message?: { usage?: { input_tokens?: number } };
              usage?: { output_tokens?: number };
            };

            if (parsed.type === "message_start" && parsed.message?.usage) {
              inputTokens = parsed.message.usage.input_tokens ?? 0;
            }

            if (parsed.type === "content_block_delta" && parsed.delta?.text) {
              fullContent += parsed.delta.text;
              onChunk({ delta: parsed.delta.text });
            }

            if (parsed.type === "message_delta" && parsed.usage) {
              outputTokens = parsed.usage.output_tokens ?? 0;
            }
          } catch {
            // JSON 파싱 실패 무시
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    onChunk({ delta: "", inputTokens, outputTokens });
    return { content: fullContent, inputTokens, outputTokens };
  }
}

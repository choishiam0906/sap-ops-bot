import { SecureRecord } from "../auth/secureStore.js";
import {
  LlmProvider,
  ProviderChatInput,
  ProviderChatOutput,
  StreamChunk,
} from "./base.js";

export class OpenAiProvider implements LlmProvider {
  readonly type = "openai" as const;

  constructor(private readonly apiBaseUrl: string) {}

  async sendMessage(
    tokens: SecureRecord,
    input: ProviderChatInput
  ): Promise<ProviderChatOutput> {
    const messages = [
      ...input.history,
      { role: "user", content: input.message },
    ];

    const response = await fetch(`${this.apiBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: input.model,
        messages,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI request failed: ${response.status}`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };

    return {
      content: payload.choices?.[0]?.message?.content ?? "",
      inputTokens: payload.usage?.prompt_tokens ?? 0,
      outputTokens: payload.usage?.completion_tokens ?? 0,
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

    const response = await fetch(`${this.apiBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: input.model,
        messages,
        temperature: 0.2,
        stream: true,
        stream_options: { include_usage: true },
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI stream request failed: ${response.status}`);
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
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data) as {
              choices?: Array<{ delta?: { content?: string } }>;
              usage?: { prompt_tokens?: number; completion_tokens?: number };
            };

            const delta = parsed.choices?.[0]?.delta?.content ?? "";
            if (delta) {
              fullContent += delta;
              onChunk({ delta });
            }

            if (parsed.usage) {
              inputTokens = parsed.usage.prompt_tokens ?? 0;
              outputTokens = parsed.usage.completion_tokens ?? 0;
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

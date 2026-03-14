import { SecureRecord } from "../auth/secureStore.js";
import {
  LlmProvider,
  ProviderChatInput,
  ProviderChatOutput,
  StreamChunk,
} from "./base.js";

export class GoogleProvider implements LlmProvider {
  readonly type = "google" as const;

  constructor(private readonly apiBaseUrl: string) {}

  async sendMessage(
    tokens: SecureRecord,
    input: ProviderChatInput
  ): Promise<ProviderChatOutput> {
    const contents = [
      ...input.history,
      { role: "user" as const, content: input.message },
    ].map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const url = `${this.apiBaseUrl}/v1beta/models/${input.model}:generateContent?key=${tokens.accessToken}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents }),
    });

    if (!response.ok) {
      throw new Error(`Google Gemini request failed: ${response.status}`);
    }

    const payload = (await response.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
      usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
      };
    };

    return {
      content: payload.candidates?.[0]?.content?.parts?.[0]?.text ?? "",
      inputTokens: payload.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: payload.usageMetadata?.candidatesTokenCount ?? 0,
    };
  }

  async sendMessageStream(
    tokens: SecureRecord,
    input: ProviderChatInput,
    onChunk: (chunk: StreamChunk) => void,
  ): Promise<ProviderChatOutput> {
    const contents = [
      ...input.history,
      { role: "user" as const, content: input.message },
    ].map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const url = `${this.apiBaseUrl}/v1beta/models/${input.model}:streamGenerateContent?alt=sse&key=${tokens.accessToken}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents }),
    });

    if (!response.ok) {
      throw new Error(`Google Gemini stream request failed: ${response.status}`);
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
              candidates?: Array<{
                content?: { parts?: Array<{ text?: string }> };
              }>;
              usageMetadata?: {
                promptTokenCount?: number;
                candidatesTokenCount?: number;
              };
            };

            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
            if (text) {
              fullContent += text;
              onChunk({ delta: text });
            }

            if (parsed.usageMetadata) {
              inputTokens = parsed.usageMetadata.promptTokenCount ?? inputTokens;
              outputTokens = parsed.usageMetadata.candidatesTokenCount ?? outputTokens;
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

import { SecureRecord } from "../auth/secureStore.js";
import {
  LlmProvider,
  ProviderChatInput,
  ProviderChatOutput,
  StreamChunk,
} from "./base.js";

/**
 * GitHub Copilot Provider
 *
 * GitHub Copilot Chat API는 2단계 인증을 사용한다:
 * 1. GitHub OAuth 토큰으로 Copilot 세션 토큰 교환
 * 2. Copilot 세션 토큰으로 OpenAI 호환 Chat Completions API 호출
 *
 * 세션 토큰은 짧은 TTL(~30분)을 가지므로 만료 시 자동 갱신한다.
 */

interface CopilotToken {
  token: string;
  expiresAt: number;
}

const COPILOT_TOKEN_URL = "https://api.github.com/copilot_internal/v2/token";
const COPILOT_CHAT_URL = "https://api.githubcopilot.com/chat/completions";

export class CopilotProvider implements LlmProvider {
  readonly type = "copilot" as const;

  private cachedToken: CopilotToken | null = null;

  /**
   * GitHub 토큰 → Copilot 세션 토큰 교환
   * 세션 토큰이 유효하면 캐시에서 반환한다.
   */
  private async getCopilotToken(githubToken: string): Promise<string> {
    // 캐시된 토큰이 유효하면 재사용 (만료 1분 전 갱신)
    if (this.cachedToken && Date.now() < this.cachedToken.expiresAt - 60_000) {
      return this.cachedToken.token;
    }

    const res = await fetch(COPILOT_TOKEN_URL, {
      headers: {
        Authorization: `token ${githubToken}`,
        Accept: "application/json",
        "Editor-Version": "vscode/1.100.0",
        "Editor-Plugin-Version": "copilot/1.300.0",
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(
        `Copilot 토큰 교환 실패 (${res.status}): ${errText}`
      );
    }

    const data = (await res.json()) as {
      token?: string;
      expires_at?: number;
    };

    if (!data.token) {
      throw new Error("Copilot 토큰 응답에 token이 없어요. Copilot 구독을 확인해주세요.");
    }

    this.cachedToken = {
      token: data.token,
      expiresAt: (data.expires_at ?? 0) * 1000,
    };

    return this.cachedToken.token;
  }

  async sendMessage(
    tokens: SecureRecord,
    input: ProviderChatInput
  ): Promise<ProviderChatOutput> {
    const githubToken = tokens.accessToken;
    const copilotToken = await this.getCopilotToken(githubToken);

    const messages = [
      ...input.history,
      { role: "user", content: input.message },
    ];

    const response = await fetch(COPILOT_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${copilotToken}`,
        "Content-Type": "application/json",
        "Editor-Version": "vscode/1.100.0",
        "Editor-Plugin-Version": "copilot/1.300.0",
        "Copilot-Integration-Id": "vscode-chat",
      },
      body: JSON.stringify({
        model: input.model,
        messages,
        temperature: 0.2,
        stream: false,
      }),
    });

    if (!response.ok) {
      // 토큰 만료 시 캐시 무효화 후 1회 재시도
      if (response.status === 401 && this.cachedToken) {
        this.cachedToken = null;
        return this.sendMessage(tokens, input);
      }
      const errText = await response.text();
      throw new Error(`Copilot 요청 실패 (${response.status}): ${errText}`);
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
    const githubToken = tokens.accessToken;
    const copilotToken = await this.getCopilotToken(githubToken);

    const messages = [
      ...input.history,
      { role: "user", content: input.message },
    ];

    const response = await fetch(COPILOT_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${copilotToken}`,
        "Content-Type": "application/json",
        "Editor-Version": "vscode/1.100.0",
        "Editor-Plugin-Version": "copilot/1.300.0",
        "Copilot-Integration-Id": "vscode-chat",
      },
      body: JSON.stringify({
        model: input.model,
        messages,
        temperature: 0.2,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 401 && this.cachedToken) {
        this.cachedToken = null;
        return this.sendMessageStream(tokens, input, onChunk);
      }
      const errText = await response.text();
      throw new Error(`Copilot stream 요청 실패 (${response.status}): ${errText}`);
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

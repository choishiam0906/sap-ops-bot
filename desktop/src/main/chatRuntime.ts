import { randomUUID } from "node:crypto";

import {
  SendMessageInput,
  SendMessageOutput,
  StreamMessageInput,
  StreamEvent,
  ProviderType,
  ChatMessage,
  ChatSession,
  DomainPack,
} from "./contracts.js";
import { SecureStore } from "./auth/secureStore.js";
import { LlmProvider, StreamChunk } from "./providers/base.js";
import { AuditRepository, MessageRepository, SessionRepository } from "./storage/repositories/index.js";
import { SkillSourceRegistry } from "./skills/registry.js";

export class ChatRuntime {
  private readonly providers: Map<ProviderType, LlmProvider>;
  // P4-5: 세션 생성 동시 요청 방지 — 동일 provider에 대한 중복 생성을 막는 Promise mutex
  private readonly sessionMutex = new Map<string, Promise<ChatSession>>();
  private _chatHistoryLimit = 10;

  constructor(
    providers: LlmProvider[],
    private readonly secureStore: SecureStore,
    private readonly sessionRepo: SessionRepository,
    private readonly messageRepo: MessageRepository,
    private readonly auditRepo: AuditRepository,
    private readonly skillRegistry: SkillSourceRegistry
  ) {
    this.providers = new Map(
      providers.map((provider) => [provider.type, provider])
    );
  }

  get chatHistoryLimit(): number {
    return this._chatHistoryLimit;
  }

  set chatHistoryLimit(value: number) {
    this._chatHistoryLimit = Math.max(2, Math.min(100, value));
  }

  listSessions(limit = 50) {
    return this.sessionRepo.list(limit);
  }

  getMessages(sessionId: string, limit = 100) {
    return this.messageRepo.listBySession(sessionId, limit);
  }

  async sendMessage(input: SendMessageInput): Promise<SendMessageOutput> {
    const execution = this.skillRegistry.resolveSkillExecution({
      skillId: input.skillId,
      sourceIds: input.sourceIds,
      context: {
        domainPack: input.domainPack,
        dataType: "chat",
        message: input.message,
        caseContext: input.caseContext,
      },
    });

    const provider = this.providers.get(input.provider);
    if (!provider) {
      throw new Error(`Unsupported provider: ${input.provider}`);
    }

    // P4-5: Promise mutex로 세션 중복 생성 방지
    const session = await this.resolveSession(input);

    if (session.provider !== input.provider) {
      throw new Error(
        "Provider cannot be changed inside an existing session. Create a new session."
      );
    }

    const userMessage = this.messageRepo.append(
      session.id,
      "user",
      input.message
    );
    const historyMessages = this.messageRepo
      .listBySession(session.id, 100)
      .slice(0, -1);

    const history = this.toProviderHistory(historyMessages);
    const tokenRecord = await this.secureStore.get(input.provider);
    if (!tokenRecord?.accessToken) {
      throw new Error(
        `${input.provider} is not authenticated. Complete OAuth first.`
      );
    }

    const message = this.composeMessage(input.message, execution.promptContext);
    const llmResult = await provider.sendMessage(tokenRecord, {
      model: input.model,
      message,
      history,
    });

    const assistantMessage = this.messageRepo.append(
      session.id,
      "assistant",
      llmResult.content,
      llmResult.inputTokens,
      llmResult.outputTokens,
      execution.meta.sources
    );

    // 감사 기록
    this.auditRepo.append({
      id: randomUUID(),
      sessionId: session.id,
      runId: null,
      timestamp: new Date().toISOString(),
      domainPack: input.domainPack,
      action: "send_message",
      externalTransfer: true,
      policyDecision: "ALLOWED",
      provider: input.provider,
      model: input.model,
      skillId: execution.meta.skillUsed,
      sourceIds: execution.meta.sourceIds,
      sourceCount: execution.meta.sourceCount,
    });

    this.sessionRepo.touch(session.id);
    return {
      session: this.sessionRepo.getById(session.id) ?? session,
      userMessage,
      assistantMessage,
      meta: execution.meta,
    };
  }

  /**
   * Provider 네이티브 스트리밍으로 메시지 전송.
   * onChunk 콜백을 통해 실시간 토큰을 Renderer에 전달.
   */
  async sendMessageWithStream(
    input: SendMessageInput,
    onChunk: (chunk: StreamChunk) => void,
  ): Promise<SendMessageOutput> {
    const execution = this.skillRegistry.resolveSkillExecution({
      skillId: input.skillId,
      sourceIds: input.sourceIds,
      context: {
        domainPack: input.domainPack,
        dataType: "chat",
        message: input.message,
        caseContext: input.caseContext,
      },
    });

    const provider = this.providers.get(input.provider);
    if (!provider) {
      throw new Error(`Unsupported provider: ${input.provider}`);
    }

    const session = await this.resolveSession(input);

    if (session.provider !== input.provider) {
      throw new Error(
        "Provider cannot be changed inside an existing session. Create a new session."
      );
    }

    const userMessage = this.messageRepo.append(
      session.id,
      "user",
      input.message
    );
    const historyMessages = this.messageRepo
      .listBySession(session.id, 100)
      .slice(0, -1);

    const history = this.toProviderHistory(historyMessages);
    const tokenRecord = await this.secureStore.get(input.provider);
    if (!tokenRecord?.accessToken) {
      throw new Error(
        `${input.provider} is not authenticated. Complete OAuth first.`
      );
    }

    const message = this.composeMessage(input.message, execution.promptContext);

    let llmResult;
    if (provider.sendMessageStream) {
      llmResult = await provider.sendMessageStream(
        tokenRecord,
        { model: input.model, message, history },
        onChunk,
      );
    } else {
      // 스트리밍 미지원 Provider: 동기 호출 후 전체 내용을 한 번에 전달
      llmResult = await provider.sendMessage(tokenRecord, {
        model: input.model,
        message,
        history,
      });
      onChunk({ delta: llmResult.content });
    }

    const assistantMessage = this.messageRepo.append(
      session.id,
      "assistant",
      llmResult.content,
      llmResult.inputTokens,
      llmResult.outputTokens,
      execution.meta.sources
    );

    this.auditRepo.append({
      id: randomUUID(),
      sessionId: session.id,
      runId: null,
      timestamp: new Date().toISOString(),
      domainPack: input.domainPack,
      action: "send_message_stream",
      externalTransfer: true,
      policyDecision: "ALLOWED",
      provider: input.provider,
      model: input.model,
      skillId: execution.meta.skillUsed,
      sourceIds: execution.meta.sourceIds,
      sourceCount: execution.meta.sourceCount,
    });

    this.sessionRepo.touch(session.id);
    return {
      session: this.sessionRepo.getById(session.id) ?? session,
      userMessage,
      assistantMessage,
      meta: execution.meta,
    };
  }

  async *streamMessage(
    input: StreamMessageInput,
    onEvent: (event: StreamEvent) => void
  ): AsyncGenerator<StreamEvent> {
    const apiBase = input.apiBaseUrl || "http://localhost:8000";
    const url = `${apiBase}/api/v1/chat/stream`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: input.message }),
    });

    if (!response.ok || !response.body) {
      const errorEvent: StreamEvent = {
        type: "error",
        content: `서버 응답 오류: ${response.status}`,
      };
      onEvent(errorEvent);
      yield errorEvent;
      return;
    }

    const reader = response.body.getReader();
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
          if (data === "[DONE]") {
            const doneEvent: StreamEvent = { type: "done" };
            onEvent(doneEvent);
            yield doneEvent;
            return;
          }

          try {
            const event: StreamEvent = JSON.parse(data);
            onEvent(event);
            yield event;
          } catch {
            // JSON 파싱 실패 시 무시
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * P4-5: 세션 조회/생성을 직렬화하여 동시 호출 시 중복 생성을 방지한다.
   * 동일 provider에 대해 세션 생성이 진행 중이면 해당 Promise를 반환하여 대기.
   */
  private resolveSession(input: SendMessageInput): Promise<ChatSession> {
    // 기존 세션이 있으면 즉시 반환
    if (input.sessionId) {
      const existing = this.sessionRepo.getById(input.sessionId);
      if (existing) return Promise.resolve(existing);
    }

    // 동일 provider에 대한 세션 생성이 진행 중이면 해당 Promise 대기
    const mutexKey = input.provider;
    const pending = this.sessionMutex.get(mutexKey);
    if (pending) return pending;

    const creation = Promise.resolve().then(() =>
      this.sessionRepo.create(
        input.provider,
        input.model,
        this.makeTitle(input.message)
      )
    );
    this.sessionMutex.set(mutexKey, creation);

    return creation.finally(() => {
      this.sessionMutex.delete(mutexKey);
    });
  }

  private toProviderHistory(
    messages: ChatMessage[]
  ): Array<{ role: "user" | "assistant" | "system"; content: string }> {
    return messages
      .filter((message) => message.role === "user" || message.role === "assistant")
      .slice(-this._chatHistoryLimit)
      .map((message) => ({
        role: message.role,
        content: message.content,
      }));
  }

  private makeTitle(message: string): string {
    const normalized = message.trim();
    if (!normalized) {
      return "새 대화";
    }
    return normalized.length > 30
      ? `${normalized.slice(0, 30)}...`
      : normalized;
  }

  private composeMessage(message: string, promptContext: string[]): string {
    const sections = [
      ...promptContext,
      "[사용자 요청]",
      message,
    ].filter(Boolean);
    return sections.join("\n\n");
  }
}

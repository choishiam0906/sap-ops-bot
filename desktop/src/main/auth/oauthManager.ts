import { shell } from "electron";
import {
  AuthStatus,
  OAuthAvailability,
  OAuthInitResult,
  ProviderAccount,
  ProviderType,
  SetApiKeyInput,
} from "../contracts.js";
import type { AppConfig } from "../config.js";
import { ProviderAccountRepository } from "../storage/repositories/index.js";
import { SecureStore } from "./secureStore.js";
import { randomCodeVerifier, codeChallenge, randomState } from "./pkce.js";
import {
  createCallbackServer,
  type CallbackServer,
} from "./callbackServer.js";
import { getOAuthConfig } from "./oauthProviders.js";
import {
  initiateDeviceCode as ghInitiateDeviceCode,
  pollDeviceCode as ghPollDeviceCode,
  cancelDeviceCode as ghCancelDeviceCode,
  type DeviceCodeInitResult,
} from "./githubDeviceCode.js";

function nowIso(): string {
  return new Date().toISOString();
}

interface PendingOAuth {
  provider: ProviderType;
  codeVerifier: string;
  state: string;
  redirectUri: string;
  expiresAt: number;
  callbackServer: CallbackServer | null;
}

/**
 * 하이브리드 인증 관리자 — API Key + OAuth 지원.
 *
 * 두 가지 OAuth 흐름:
 * - **콜백 서버** (OpenAI, Google): localhost 서버가 자동으로 code를 수신
 * - **수동 코드 입력** (Anthropic): 브라우저에 표시된 코드를 사용자가 복사-붙여넣기
 */
export class OAuthManager {
  private pendingOAuth = new Map<string, PendingOAuth>();

  constructor(
    private readonly secureStore: SecureStore,
    private readonly providerAccountRepo: ProviderAccountRepository,
    private readonly config: AppConfig
  ) {}

  // ── 기존 API Key 메서드 (변경 없음) ──

  async getStatus(provider: ProviderType): Promise<ProviderAccount> {
    const saved = this.providerAccountRepo.get(provider);
    if (saved) {
      return saved;
    }
    return {
      provider,
      status: "unauthenticated",
      accountHint: null,
      updatedAt: nowIso(),
    };
  }

  async setApiKey(input: SetApiKeyInput): Promise<ProviderAccount> {
    const { provider, apiKey } = input;
    if (!apiKey.trim()) {
      return this.saveStatus({
        provider,
        status: "error",
        accountHint: null,
        authType: "api-key",
        updatedAt: nowIso(),
      });
    }
    await this.secureStore.set(provider, {
      accessToken: apiKey.trim(),
    });
    const hint =
      apiKey.length > 8
        ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`
        : "****";
    return this.saveStatus({
      provider,
      status: "authenticated",
      accountHint: hint,
      authType: "api-key",
      updatedAt: nowIso(),
    });
  }

  async logout(provider: ProviderType): Promise<ProviderAccount> {
    this.cancelOAuth(provider);
    await this.secureStore.delete(provider);
    return this.saveStatus({
      provider,
      status: "unauthenticated",
      accountHint: null,
      updatedAt: nowIso(),
    });
  }

  async getAccessToken(provider: ProviderType): Promise<string> {
    const status = await this.getStatus(provider);
    if (status.status !== "authenticated") {
      throw new Error(
        `${provider}가 인증되지 않았어요. 설정에서 API Key 또는 OAuth로 연결해주세요.`
      );
    }
    const record = await this.secureStore.get(provider);
    if (!record?.accessToken) {
      this.saveStatus({
        provider,
        status: "expired",
        accountHint: null,
        updatedAt: nowIso(),
      });
      throw new Error(`${provider} 인증 정보가 없거나 만료되었어요.`);
    }

    // OAuth 토큰 만료 확인 및 자동 갱신
    if (record.expiresAt && new Date(record.expiresAt) <= new Date()) {
      if (record.refreshToken) {
        return this.refreshAccessToken(provider);
      }
      this.saveStatus({
        provider,
        status: "expired",
        accountHint: null,
        updatedAt: nowIso(),
      });
      throw new Error(`${provider} 토큰이 만료되었어요. 다시 인증해주세요.`);
    }

    return record.accessToken;
  }

  // ── OAuth 메서드 ──

  async getOAuthAvailability(): Promise<OAuthAvailability[]> {
    const providers: ProviderType[] = ["openai", "anthropic", "google"];
    return providers.map((provider) => ({
      provider,
      available: getOAuthConfig(provider, this.config) !== null,
    }));
  }

  async initiateOAuth(provider: ProviderType): Promise<OAuthInitResult> {
    const oauthConfig = getOAuthConfig(provider, this.config);
    if (!oauthConfig) {
      throw new Error(`${provider}는 OAuth를 지원하지 않아요.`);
    }

    // 기존 pending 정리
    this.cancelOAuth(provider);

    const verifier = randomCodeVerifier();
    const challenge = codeChallenge(verifier);
    const state = randomState();

    let callbackServer: CallbackServer | null = null;
    let redirectUri: string;

    if (oauthConfig.useCallbackServer) {
      // 콜백 서버 흐름 (OpenAI, Google)
      const cbPath = oauthConfig.callbackPath ?? "/callback";
      callbackServer = await createCallbackServer({
        port: oauthConfig.callbackPort,
        host: oauthConfig.callbackHost,
        callbackPath: cbPath,
      });
      redirectUri = `${callbackServer.url}${cbPath}`;
    } else {
      // 수동 코드 입력 흐름 (Anthropic)
      redirectUri = oauthConfig.redirectUri!;
    }

    const params = new URLSearchParams({
      response_type: "code",
      client_id: oauthConfig.clientId,
      redirect_uri: redirectUri,
      code_challenge: challenge,
      code_challenge_method: "S256",
      state,
      scope: oauthConfig.scopes.join(" "),
      ...oauthConfig.extraAuthParams,
    });

    const authUrl = `${oauthConfig.authorizationUrl}?${params.toString()}`;

    console.log(`[OAuth] ${provider} 인증 URL:`, authUrl);

    this.pendingOAuth.set(provider, {
      provider,
      codeVerifier: verifier,
      state,
      redirectUri,
      expiresAt: Date.now() + 5 * 60 * 1000,
      callbackServer,
    });

    shell.openExternal(authUrl);

    return {
      authUrl,
      provider,
      useCallbackServer: oauthConfig.useCallbackServer,
    };
  }

  /**
   * 콜백 서버 흐름 — localhost 서버에서 자동으로 code를 수신 대기.
   * OpenAI, Google 등 localhost redirect를 지원하는 provider용.
   */
  async waitForOAuthCallback(
    provider: ProviderType
  ): Promise<ProviderAccount> {
    const pending = this.pendingOAuth.get(provider);
    if (!pending) {
      throw new Error(`${provider}에 대한 OAuth 요청이 없어요.`);
    }
    if (!pending.callbackServer) {
      throw new Error(
        `${provider}는 콜백 서버를 사용하지 않아요. submitOAuthCode를 사용해주세요.`
      );
    }

    const { code, state } = await pending.callbackServer.promise;

    // CSRF 검증
    if (state !== pending.state) {
      this.cleanupPending(provider);
      throw new Error("OAuth state 불일치 — CSRF 공격 가능성이 있어요.");
    }

    return this.exchangeCodeForToken(provider, code, state);
  }

  /**
   * 수동 코드 입력 흐름 — 사용자가 브라우저에서 복사한 코드를 제출.
   * Anthropic 등 localhost redirect를 지원하지 않는 provider용.
   */
  async submitOAuthCode(
    provider: ProviderType,
    code: string
  ): Promise<ProviderAccount> {
    const pending = this.pendingOAuth.get(provider);
    if (!pending) {
      throw new Error(
        `${provider}에 대한 OAuth 요청이 없어요. 다시 OAuth 인증을 시작해주세요.`
      );
    }

    // 만료 확인 — 5분 초과 시 안내
    if (Date.now() > pending.expiresAt) {
      this.cleanupPending(provider);
      throw new Error(
        `OAuth 요청이 만료되었어요 (5분 초과). 다시 인증을 시작해주세요.`
      );
    }

    // Anthropic 콜백 페이지는 "code#state" 형식으로 표시
    let actualCode = code.trim();
    let extractedState: string | undefined;
    if (actualCode.includes("#")) {
      const parts = actualCode.split("#");
      actualCode = parts[0];
      extractedState = parts[1];
    }

    return this.exchangeCodeForToken(provider, actualCode, extractedState);
  }

  cancelOAuth(provider: ProviderType): void {
    const pending = this.pendingOAuth.get(provider);
    if (pending) {
      pending.callbackServer?.close();
      this.pendingOAuth.delete(provider);
    }
  }

  // ── GitHub Device Code (Copilot) ──

  async initiateDeviceCode(): Promise<DeviceCodeInitResult> {
    return ghInitiateDeviceCode(this.config);
  }

  async pollDeviceCode(): Promise<ProviderAccount> {
    const accessToken = await ghPollDeviceCode();

    // GitHub 사용자 정보로 accountHint 추출
    let accountHint: string | null = null;
    try {
      const userRes = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      });
      if (userRes.ok) {
        const user = (await userRes.json()) as { login?: string; email?: string };
        accountHint = user.login ?? user.email ?? null;
      }
    } catch {
      // 사용자 정보 가져오기 실패 시 무시
    }

    await this.secureStore.set("copilot", { accessToken });

    return this.saveStatus({
      provider: "copilot",
      status: "authenticated",
      accountHint,
      authType: "oauth",
      updatedAt: nowIso(),
    });
  }

  cancelDeviceCode(): void {
    ghCancelDeviceCode();
  }

  // ── 토큰 교환 (공통) ──

  private async exchangeCodeForToken(
    provider: ProviderType,
    code: string,
    codeState?: string
  ): Promise<ProviderAccount> {
    const pending = this.pendingOAuth.get(provider);
    if (!pending) {
      throw new Error(`${provider}에 대한 OAuth 요청이 없어요.`);
    }

    const oauthConfig = getOAuthConfig(provider, this.config);
    if (!oauthConfig) {
      this.cleanupPending(provider);
      throw new Error(`${provider} OAuth 설정을 찾을 수 없어요.`);
    }

    // Craft OSS와 동일: state는 콜백 CSRF 검증에만 사용, 토큰 교환에는 포함하지 않음
    const tokenBody: Record<string, string> = {
      grant_type: "authorization_code",
      client_id: oauthConfig.clientId,
      code,
      redirect_uri: pending.redirectUri,
      code_verifier: pending.codeVerifier,
    };

    console.log(`[OAuth] ${provider} 토큰 교환 요청:`, {
      url: oauthConfig.tokenUrl,
      contentType: oauthConfig.tokenContentType,
      codeLength: code.length,
      codePrefix: code.slice(0, 8) + "...",
      hasState: !!codeState,
      redirectUri: pending.redirectUri,
    });

    const tokenRes = await fetch(oauthConfig.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type":
          oauthConfig.tokenContentType === "form"
            ? "application/x-www-form-urlencoded"
            : "application/json",
        Accept: "application/json",
      },
      body:
        oauthConfig.tokenContentType === "form"
          ? new URLSearchParams(tokenBody).toString()
          : JSON.stringify(tokenBody),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error(`[OAuth] ${provider} 토큰 교환 실패:`, {
        status: tokenRes.status,
        body: errText,
        codeLength: code.length,
        hasHash: code.includes("#"),
      });
      throw new Error(
        `토큰 교환 실패 (${tokenRes.status}): ${errText} [code=${code.length}자, state=${codeState ? "있음" : "없음"}]`
      );
    }

    const tokenData = (await tokenRes.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      id_token?: string;
    };

    // 이메일 힌트 추출 (id_token이 있으면 JWT payload에서)
    let accountHint: string | null = null;
    if (tokenData.id_token) {
      try {
        const payload = JSON.parse(
          Buffer.from(tokenData.id_token.split(".")[1], "base64").toString()
        );
        accountHint = payload.email ?? payload.name ?? null;
      } catch {
        // id_token 파싱 실패 시 무시
      }
    }

    // OpenAI Codex: id_token → API Key 변환 시도 (선택사항)
    // Codex CLI도 obtain_api_key().await.ok() 로 실패 시 무시하고 access_token 사용
    let finalAccessToken = tokenData.access_token;

    if (oauthConfig.requiresTokenExchange && tokenData.id_token) {
      console.log(`[OAuth] ${provider} id_token → API Key 변환 시도`);
      try {
        const apiKey = await this.exchangeIdTokenForApiKey(
          oauthConfig,
          tokenData.id_token
        );
        finalAccessToken = apiKey;
        console.log(`[OAuth] ${provider} API Key 변환 성공`);
      } catch (err) {
        // Codex CLI와 동일: 변환 실패 시 access_token으로 폴백
        console.warn(
          `[OAuth] ${provider} API Key 변환 실패 (access_token 사용):`,
          err instanceof Error ? err.message : err
        );
      }
    }

    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : undefined;

    await this.secureStore.set(provider, {
      accessToken: finalAccessToken,
      refreshToken: tokenData.refresh_token,
      expiresAt,
    });

    this.cleanupPending(provider);

    return this.saveStatus({
      provider,
      status: "authenticated",
      accountHint,
      authType: "oauth",
      updatedAt: nowIso(),
    });
  }

  // ── 토큰 갱신 ──

  private async refreshAccessToken(provider: ProviderType): Promise<string> {
    const oauthConfig = getOAuthConfig(provider, this.config);
    const record = await this.secureStore.get(provider);

    if (!oauthConfig || !record?.refreshToken) {
      this.saveStatus({
        provider,
        status: "expired",
        accountHint: null,
        updatedAt: nowIso(),
      });
      throw new Error(`${provider} 토큰 갱신 불가 — 다시 인증해주세요.`);
    }

    const body: Record<string, string> = {
      grant_type: "refresh_token",
      refresh_token: record.refreshToken,
      client_id: oauthConfig.clientId,
    };

    const res = await fetch(oauthConfig.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type":
          oauthConfig.tokenContentType === "form"
            ? "application/x-www-form-urlencoded"
            : "application/json",
      },
      body:
        oauthConfig.tokenContentType === "form"
          ? new URLSearchParams(body).toString()
          : JSON.stringify(body),
    });

    if (!res.ok) {
      this.saveStatus({
        provider,
        status: "expired",
        accountHint: null,
        updatedAt: nowIso(),
      });
      throw new Error(`${provider} 토큰 갱신 실패 — 다시 인증해주세요.`);
    }

    const data = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
    };

    const expiresAt = data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : undefined;

    await this.secureStore.set(provider, {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? record.refreshToken,
      expiresAt,
    });

    return data.access_token;
  }

  // ── RFC 8693 Token Exchange (id_token → API Key) ──

  /**
   * OpenAI Codex: id_token을 API Key로 변환.
   * Craft Agents OSS와 동일한 RFC 8693 Token Exchange 방식.
   */
  private async exchangeIdTokenForApiKey(
    oauthConfig: import("./oauthProviders.js").OAuthProviderConfig,
    idToken: string
  ): Promise<string> {
    const exchangeBody = new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
      client_id: oauthConfig.clientId,
      subject_token: idToken,
      subject_token_type: "urn:ietf:params:oauth:token-type:id_token",
      requested_token: "openai-api-key",
    });

    console.log(`[OAuth] Token Exchange 요청:`, {
      url: oauthConfig.tokenUrl,
      grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
      subject_token_type: "urn:ietf:params:oauth:token-type:id_token",
      requested_token: "openai-api-key",
    });

    const res = await fetch(oauthConfig.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: exchangeBody.toString(),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[OAuth] Token Exchange 실패:`, {
        status: res.status,
        body: errText,
      });
      throw new Error(
        `API Key 변환 실패 (${res.status}): ${errText}`
      );
    }

    const data = (await res.json()) as {
      access_token: string;
      token_type?: string;
    };

    if (!data.access_token) {
      throw new Error("Token Exchange 응답에 access_token이 없어요.");
    }

    return data.access_token;
  }

  // ── 내부 유틸 ──

  private cleanupPending(provider: ProviderType): void {
    const pending = this.pendingOAuth.get(provider);
    if (pending) {
      pending.callbackServer?.close();
      this.pendingOAuth.delete(provider);
    }
  }

  private saveStatus(account: ProviderAccount): ProviderAccount {
    return this.providerAccountRepo.upsert(account);
  }
}

export type { AuthStatus };

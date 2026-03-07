import type { ProviderType } from "../contracts.js";
import type { AppConfig } from "../config.js";

export interface OAuthProviderConfig {
  authorizationUrl: string;
  tokenUrl: string;
  clientId: string;
  scopes: string[];
  tokenContentType: "json" | "form";
  /** true = localhost 콜백 서버 (자동), false = 수동 코드 입력 */
  useCallbackServer: boolean;
  /** 수동 코드 입력 시 사용할 고정 redirect URI */
  redirectUri?: string;
}

export function getOAuthConfig(
  provider: ProviderType,
  config: AppConfig
): OAuthProviderConfig | null {
  switch (provider) {
    case "openai": {
      const clientId = config.oauthOpenaiClientId;
      if (!clientId) return null;
      return {
        authorizationUrl: "https://auth.openai.com/authorize",
        tokenUrl: "https://auth.openai.com/oauth/token",
        clientId,
        scopes: ["openid", "profile", "email", "offline_access"],
        tokenContentType: "form",
        useCallbackServer: true,
      };
    }
    case "anthropic": {
      const clientId = config.oauthAnthropicClientId;
      if (!clientId) return null;
      return {
        authorizationUrl: "https://claude.ai/oauth/authorize",
        tokenUrl: "https://console.anthropic.com/v1/oauth/token",
        clientId,
        scopes: ["org:create_api_key", "user:profile", "user:inference"],
        tokenContentType: "json",
        useCallbackServer: false,
        redirectUri: "https://console.anthropic.com/oauth/code/callback",
      };
    }
    case "google": {
      const clientId = config.oauthGoogleClientId;
      if (!clientId) return null;
      return {
        authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenUrl: "https://oauth2.googleapis.com/token",
        clientId,
        scopes: [
          "openid",
          "https://www.googleapis.com/auth/userinfo.email",
          "https://www.googleapis.com/auth/userinfo.profile",
        ],
        tokenContentType: "form",
        useCallbackServer: true,
      };
    }
    default:
      return null;
  }
}

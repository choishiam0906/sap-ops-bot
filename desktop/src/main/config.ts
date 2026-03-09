/**
 * 앱 설정 — 환경 변수 + 기본값
 * .env 파일로 오버라이드 가능 (dotenv/config 으로 로드)
 */

interface AppConfig {
  // 윈도우
  windowWidth: number;
  windowHeight: number;

  // Provider API Base URLs
  openaiApiBaseUrl: string;
  anthropicApiBaseUrl: string;
  googleApiBaseUrl: string;

  // Backend
  backendApiBaseUrl: string;

  // CBO
  cboMaxFileSizeBytes: number;
  cboSupportedExtensions: string[];

  // OAuth Client IDs
  oauthOpenaiClientId: string;
  oauthAnthropicClientId: string;
  oauthGoogleClientId: string;
  // GitHub Copilot — Device Code OAuth (RFC 8628)
  githubCopilotClientId: string;
}

function parseIntSafe(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseList(value: string | undefined, fallback: string[]): string[] {
  if (!value) return fallback;
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

export function loadConfig(): AppConfig {
  return {
    windowWidth: parseIntSafe(process.env.WINDOW_WIDTH, 1320),
    windowHeight: parseIntSafe(process.env.WINDOW_HEIGHT, 860),

    openaiApiBaseUrl:
      process.env.OPENAI_API_BASE_URL ?? "https://api.openai.com/v1",
    anthropicApiBaseUrl:
      process.env.ANTHROPIC_API_BASE_URL ?? "https://api.anthropic.com",
    googleApiBaseUrl:
      process.env.GOOGLE_API_BASE_URL ?? "https://generativelanguage.googleapis.com",

    backendApiBaseUrl:
      process.env.SAP_OPS_BACKEND_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1",

    cboMaxFileSizeBytes: parseIntSafe(process.env.CBO_MAX_FILE_SIZE_BYTES, 500_000),
    cboSupportedExtensions: parseList(
      process.env.CBO_SUPPORTED_EXTENSIONS,
      [".txt", ".md", ".abap", ".cbo"]
    ),

    oauthOpenaiClientId:
      process.env.OAUTH_OPENAI_CLIENT_ID ?? "app_EMoamEEZ73f0CkXaXp7hrann",
    oauthAnthropicClientId:
      process.env.OAUTH_ANTHROPIC_CLIENT_ID ?? "9d1c250a-e61b-44d9-88ed-5944d1962f5e",
    oauthGoogleClientId: process.env.OAUTH_GOOGLE_CLIENT_ID ?? "",
    githubCopilotClientId:
      process.env.GITHUB_COPILOT_CLIENT_ID ?? "Iv1.b507a08c87ecfe98",
  };
}

export type { AppConfig };

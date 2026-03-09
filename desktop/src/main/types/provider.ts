export type ProviderType = "openai" | "anthropic" | "google" | "copilot" | "openrouter" | "ollama";

export const PROVIDER_LABELS: Record<ProviderType, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google Gemini",
  copilot: "GitHub Copilot",
  openrouter: "OpenRouter",
  ollama: "Ollama",
};

export const PROVIDER_MODELS: Record<ProviderType, { value: string; label: string }[]> = {
  openai: [
    { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
    { value: 'gpt-4.1', label: 'GPT-4.1' },
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'o4-mini', label: 'o4-mini' },
  ],
  anthropic: [
    { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
    { value: 'claude-opus-4-6', label: 'Claude Opus 4.6' },
    { value: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' },
  ],
  google: [
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
  ],
  copilot: [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { value: 'o4-mini', label: 'o4-mini' },
  ],
  openrouter: [
    { value: 'anthropic/claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
    { value: 'anthropic/claude-opus-4-6', label: 'Claude Opus 4.6' },
    { value: 'openai/gpt-4.1', label: 'GPT-4.1' },
    { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { value: 'meta-llama/llama-4-scout', label: 'Llama 4 Scout' },
    { value: 'deepseek/deepseek-r1', label: 'DeepSeek R1' },
  ],
  ollama: [
    { value: 'llama3.3', label: 'Llama 3.3' },
    { value: 'mistral', label: 'Mistral' },
    { value: 'codellama', label: 'Code Llama' },
    { value: 'gemma2', label: 'Gemma 2' },
    { value: 'phi3', label: 'Phi-3' },
    { value: 'qwen2.5', label: 'Qwen 2.5' },
  ],
};

export const DEFAULT_MODELS: Record<ProviderType, string> = {
  openai: 'gpt-4.1-mini',
  anthropic: 'claude-sonnet-4-6',
  google: 'gemini-2.5-flash',
  copilot: 'gpt-4o',
  openrouter: 'anthropic/claude-sonnet-4-6',
  ollama: 'llama3.3',
};

export type AuthStatus =
  | "unauthenticated"
  | "pending"
  | "authenticated"
  | "expired"
  | "error";

export interface ProviderAccount {
  provider: ProviderType;
  status: AuthStatus;
  accountHint: string | null;
  authType?: "api-key" | "oauth";
  updatedAt: string;
}

export interface OAuthInitResult {
  authUrl: string;
  provider: ProviderType;
  useCallbackServer: boolean;
}

export interface OAuthAvailability {
  provider: ProviderType;
  available: boolean;
}

export interface SetApiKeyInput {
  provider: ProviderType;
  apiKey: string;
}

export interface DeviceCodeInitResult {
  userCode: string;
  verificationUri: string;
  expiresIn: number;
  interval: number;
}

export interface SubmitFeedbackInput {
  messageId: string;
  rating: "positive" | "negative";
  comment?: string;
}

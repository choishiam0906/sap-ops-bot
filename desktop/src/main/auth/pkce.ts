import { randomBytes, createHash } from "node:crypto";

/** PKCE code_verifier 생성 — 43자 URL-safe Base64 */
export function randomCodeVerifier(): string {
  return randomBytes(32).toString("base64url");
}

/** PKCE code_challenge 생성 — SHA256(verifier) → Base64url */
export function codeChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

/** CSRF 보호용 random state — 64자 hex */
export function randomState(): string {
  return randomBytes(32).toString("hex");
}

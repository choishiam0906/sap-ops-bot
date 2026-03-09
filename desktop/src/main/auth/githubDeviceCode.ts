/**
 * GitHub Device Code OAuth (RFC 8628)
 *
 * GitHub Copilot 연결을 위한 Device Code 흐름:
 * 1. POST /login/device/code → user_code + device_code 획득
 * 2. 사용자가 github.com/login/device 에서 user_code 입력
 * 3. 앱이 POST /login/oauth/access_token 을 polling → access_token 획득
 */

import type { AppConfig } from "../config.js";

// ── 타입 ──

export interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

export interface DeviceCodeInitResult {
  userCode: string;
  verificationUri: string;
  expiresIn: number;
  interval: number;
}

// ── 내부 상태 ──

interface PendingDeviceCode {
  deviceCode: string;
  clientId: string;
  interval: number;
  expiresAt: number;
  cancelled: boolean;
}

let pending: PendingDeviceCode | null = null;

// ── 공개 API ──

/**
 * Device Code 흐름 시작 — GitHub에 device code를 요청하고 user_code를 반환
 */
export async function initiateDeviceCode(
  config: AppConfig
): Promise<DeviceCodeInitResult> {
  // 기존 pending 정리
  cancelDeviceCode();

  const clientId = config.githubCopilotClientId;
  if (!clientId) {
    throw new Error("GitHub Copilot Client ID가 설정되지 않았어요.");
  }

  const res = await fetch("https://github.com/login/device/code", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      scope: "read:user",
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(
      `GitHub Device Code 요청 실패 (${res.status}): ${errText}`
    );
  }

  const data = (await res.json()) as DeviceCodeResponse;

  pending = {
    deviceCode: data.device_code,
    clientId,
    interval: data.interval || 5,
    expiresAt: Date.now() + data.expires_in * 1000,
    cancelled: false,
  };

  console.log(
    `[DeviceCode] GitHub device code 발급 완료 (user_code: ${data.user_code})`
  );

  return {
    userCode: data.user_code,
    verificationUri: data.verification_uri,
    expiresIn: data.expires_in,
    interval: data.interval || 5,
  };
}

/**
 * Device Code polling — 사용자가 브라우저에서 코드를 입력할 때까지 대기
 * 성공 시 access_token 반환
 */
export async function pollDeviceCode(): Promise<string> {
  if (!pending) {
    throw new Error("진행 중인 Device Code 인증이 없어요.");
  }

  const { deviceCode, clientId, interval, expiresAt } = pending;

  while (!pending.cancelled && Date.now() < expiresAt) {
    // interval 대기 (GitHub 권장 polling 간격)
    await sleep(interval * 1000);

    if (pending.cancelled) {
      throw new Error("Device Code 인증이 취소되었어요.");
    }

    const res = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        device_code: deviceCode,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(
        `GitHub token polling 실패 (${res.status}): ${errText}`
      );
    }

    const data = (await res.json()) as {
      access_token?: string;
      token_type?: string;
      scope?: string;
      error?: string;
      error_description?: string;
      interval?: number;
    };

    if (data.access_token) {
      console.log("[DeviceCode] GitHub 인증 성공");
      pending = null;
      return data.access_token;
    }

    // RFC 8628 에러 코드 처리
    if (data.error === "authorization_pending") {
      // 아직 사용자가 코드를 입력하지 않음 — 계속 polling
      continue;
    }

    if (data.error === "slow_down") {
      // polling 간격을 늘려야 함
      if (data.interval && pending) {
        pending.interval = data.interval;
      }
      continue;
    }

    if (data.error === "expired_token") {
      pending = null;
      throw new Error("Device Code가 만료되었어요. 다시 시도해주세요.");
    }

    if (data.error === "access_denied") {
      pending = null;
      throw new Error("인증이 거부되었어요.");
    }

    // 알 수 없는 에러
    pending = null;
    throw new Error(
      `GitHub 인증 실패: ${data.error_description ?? data.error ?? "알 수 없는 에러"}`
    );
  }

  // 만료 또는 취소
  pending = null;
  throw new Error("Device Code 인증 시간이 초과되었어요.");
}

/**
 * Device Code 인증 취소
 */
export function cancelDeviceCode(): void {
  if (pending) {
    pending.cancelled = true;
    pending = null;
  }
}

// ── 유틸 ──

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

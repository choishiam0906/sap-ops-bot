import { createServer, type Server } from "node:http";
import { URL } from "node:url";

export interface CallbackResult {
  code: string;
  state: string;
}

export interface CallbackServer {
  url: string;
  promise: Promise<CallbackResult>;
  close: () => void;
}

const PORT_MIN = 6477;
const PORT_MAX = 6577;
const TIMEOUT_MS = 5 * 60 * 1000; // 5분

const SUCCESS_HTML = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>인증 완료</title>
<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#fafafa;color:#333}
.card{text-align:center;padding:40px;border-radius:12px;background:#fff;box-shadow:0 2px 12px rgba(0,0,0,.08)}
h1{font-size:24px;margin:0 0 8px}p{color:#666;margin:0}</style>
</head><body><div class="card"><h1>인증 완료!</h1><p>이 창을 닫고 앱으로 돌아가세요.</p></div></body></html>`;

async function tryListen(server: Server, port: number, host = "127.0.0.1"): Promise<boolean> {
  return new Promise((resolve) => {
    server.once("error", () => resolve(false));
    server.listen(port, host, () => resolve(true));
  });
}

export interface CallbackServerOptions {
  /** 고정 포트 (지정 시 해당 포트만 시도) */
  port?: number;
  /** 호스트 (기본: "127.0.0.1") */
  host?: string;
  /** 콜백 경로 (기본: "/callback", OpenAI는 "/auth/callback") */
  callbackPath?: string;
}

export async function createCallbackServer(
  options?: CallbackServerOptions
): Promise<CallbackServer> {
  let settled = false;
  let resolveCallback: (result: CallbackResult) => void;
  let rejectCallback: (err: Error) => void;

  const promise = new Promise<CallbackResult>((resolve, reject) => {
    resolveCallback = resolve;
    rejectCallback = reject;
  });

  const expectedPath = options?.callbackPath ?? "/callback";

  const server = createServer((req, res) => {
    if (!req.url || settled) {
      res.writeHead(404);
      res.end();
      return;
    }

    const parsed = new URL(req.url, `http://127.0.0.1`);
    if (parsed.pathname !== expectedPath) {
      res.writeHead(404);
      res.end();
      return;
    }

    const code = parsed.searchParams.get("code");
    const state = parsed.searchParams.get("state");
    const error = parsed.searchParams.get("error");

    if (error) {
      res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`<html><body><h1>인증 실패</h1><p>${error}</p></body></html>`);
      settled = true;
      rejectCallback(new Error(`OAuth 에러: ${error}`));
      cleanup();
      return;
    }

    if (!code || !state) {
      res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
      res.end("<html><body><h1>잘못된 요청</h1><p>code 또는 state가 없어요.</p></body></html>");
      return;
    }

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(SUCCESS_HTML);

    settled = true;
    resolveCallback({ code, state });
    cleanup();
  });

  // 타임아웃 후 자동 종료
  const timer = setTimeout(() => {
    if (!settled) {
      settled = true;
      rejectCallback(new Error("OAuth 콜백 타임아웃 (5분)"));
      cleanup();
    }
  }, TIMEOUT_MS);

  function cleanup() {
    clearTimeout(timer);
    server.close();
  }

  const host = options?.host ?? "127.0.0.1";

  // 포트 바인딩 시도
  let boundPort = 0;
  if (options?.port) {
    // 고정 포트 지정 시 해당 포트만 시도
    if (await tryListen(server, options.port, host)) {
      boundPort = options.port;
    }
    if (boundPort === 0) {
      clearTimeout(timer);
      throw new Error(`포트 ${options.port}을(를) 사용할 수 없어요. 다른 프로세스가 사용 중일 수 있습니다.`);
    }
  } else {
    // 범위 내 포트 자동 탐색
    for (let port = PORT_MIN; port <= PORT_MAX; port++) {
      if (await tryListen(server, port, host)) {
        boundPort = port;
        break;
      }
    }
    if (boundPort === 0) {
      clearTimeout(timer);
      throw new Error(`포트 ${PORT_MIN}~${PORT_MAX} 범위에서 사용 가능한 포트를 찾지 못했어요.`);
    }
  }

  return {
    url: `http://${host}:${boundPort}`,
    promise,
    close: () => {
      if (!settled) {
        settled = true;
        rejectCallback(new Error("OAuth 취소됨"));
      }
      cleanup();
    },
  };
}

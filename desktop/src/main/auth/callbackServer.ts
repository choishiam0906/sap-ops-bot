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

async function tryListen(server: Server, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    server.once("error", () => resolve(false));
    server.listen(port, "127.0.0.1", () => resolve(true));
  });
}

export async function createCallbackServer(): Promise<CallbackServer> {
  let settled = false;
  let resolveCallback: (result: CallbackResult) => void;
  let rejectCallback: (err: Error) => void;

  const promise = new Promise<CallbackResult>((resolve, reject) => {
    resolveCallback = resolve;
    rejectCallback = reject;
  });

  const server = createServer((req, res) => {
    if (!req.url || settled) {
      res.writeHead(404);
      res.end();
      return;
    }

    const parsed = new URL(req.url, `http://127.0.0.1`);
    if (parsed.pathname !== "/callback") {
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

  // 포트 바인딩 시도 (PORT_MIN ~ PORT_MAX)
  let boundPort = 0;
  for (let port = PORT_MIN; port <= PORT_MAX; port++) {
    if (await tryListen(server, port)) {
      boundPort = port;
      break;
    }
  }

  if (boundPort === 0) {
    clearTimeout(timer);
    throw new Error(`포트 ${PORT_MIN}~${PORT_MAX} 범위에서 사용 가능한 포트를 찾지 못했어요.`);
  }

  return {
    url: `http://127.0.0.1:${boundPort}`,
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

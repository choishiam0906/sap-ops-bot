import "dotenv/config";

import { app, BrowserWindow, dialog, ipcMain } from "electron";
import type { OpenDialogOptions } from "electron";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { OAuthManager } from "./auth/oauthManager.js";
import { SecureStore } from "./auth/secureStore.js";
import {
  CboAnalyzeFileInput,
  CboAnalyzeFolderInput,
  CboAnalyzeFolderPickInput,
  CboAnalyzePickInput,
  CboAnalyzeTextInput,
  CboRunDiffInput,
  CboSyncKnowledgeInput,
  OAuthCompleteInput,
  ProviderType,
  SendMessageInput,
} from "./contracts.js";
import { CopilotProvider } from "./providers/copilotProvider.js";
import { CodexProvider } from "./providers/codexProvider.js";
import { ChatRuntime } from "./chatRuntime.js";
import { CboAnalyzer } from "./cbo/analyzer.js";
import { CboBatchRuntime } from "./cbo/batchRuntime.js";
import {
  CboAnalysisRepository,
  MessageRepository,
  ProviderAccountRepository,
  SessionRepository,
} from "./storage/repositories.js";
import { LocalDatabase } from "./storage/sqlite.js";

let mainWindow: BrowserWindow | null = null;
let chatRuntime: ChatRuntime;
let oauthManager: OAuthManager;
let cboAnalyzer: CboAnalyzer;
let cboBatchRuntime: CboBatchRuntime;
const mainDir = fileURLToPath(new URL(".", import.meta.url));

function initRuntime(): void {
  const dbPath = join(app.getPath("userData"), "sap-ops-bot.sqlite");
  const db = new LocalDatabase(dbPath);

  const sessionRepo = new SessionRepository(db);
  const messageRepo = new MessageRepository(db);
  const accountRepo = new ProviderAccountRepository(db);
  const analysisRepo = new CboAnalysisRepository(db);
  const secureStore = new SecureStore("sap-ops-bot-desktop");

  const codexProvider = new CodexProvider(
    process.env.CODEX_OAUTH_VERIFICATION_URL ?? "https://chat.openai.com/auth/device",
    process.env.CODEX_OAUTH_TOKEN_URL ?? "https://api.openai.com/oauth/token",
    process.env.CODEX_API_BASE_URL ?? "https://api.openai.com/v1"
  );
  const copilotProvider = new CopilotProvider(
    process.env.COPILOT_OAUTH_VERIFICATION_URL ?? "https://github.com/login/device",
    process.env.COPILOT_OAUTH_TOKEN_URL ?? "https://github.com/login/oauth/access_token",
    process.env.COPILOT_API_BASE_URL ?? "https://api.githubcopilot.com"
  );

  const providers = [codexProvider, copilotProvider];
  chatRuntime = new ChatRuntime(providers, secureStore, sessionRepo, messageRepo);
  oauthManager = new OAuthManager(providers, secureStore, accountRepo);
  cboAnalyzer = new CboAnalyzer(providers, secureStore);
  cboBatchRuntime = new CboBatchRuntime(
    cboAnalyzer,
    analysisRepo,
    process.env.SAP_OPS_BACKEND_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1"
  );
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    webPreferences: {
      preload: join(mainDir, "../preload/index.js"),
    },
  });

  const splash = `
    <html>
      <head>
        <title>SAP Ops Bot Desktop</title>
        <style>
          :root {
            color-scheme: light;
            font-family: "Segoe UI", "Pretendard", sans-serif;
          }
          body {
            margin: 0;
            background: linear-gradient(120deg, #eef6ff, #f8fbff);
            color: #102a43;
          }
          .wrap {
            max-width: 1100px;
            margin: 0 auto;
            padding: 24px;
          }
          h1 {
            margin: 0;
            font-size: 28px;
          }
          p.lead {
            margin-top: 8px;
            color: #486581;
          }
          .grid {
            margin-top: 20px;
            display: grid;
            gap: 16px;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          }
          .card {
            background: #ffffffcc;
            border: 1px solid #d9e2ec;
            border-radius: 12px;
            padding: 16px;
          }
          .row {
            display: flex;
            gap: 8px;
            align-items: center;
            margin-bottom: 10px;
            flex-wrap: wrap;
          }
          label {
            font-size: 12px;
            color: #334e68;
          }
          input[type="text"], select, textarea {
            width: 100%;
            border: 1px solid #bcccdc;
            border-radius: 8px;
            padding: 8px 10px;
            font-size: 13px;
            box-sizing: border-box;
          }
          textarea {
            min-height: 220px;
            resize: vertical;
            font-family: "Consolas", "Courier New", monospace;
          }
          button {
            border: 0;
            border-radius: 8px;
            padding: 10px 14px;
            background: #006edc;
            color: #fff;
            cursor: pointer;
            font-weight: 600;
          }
          button.secondary {
            background: #486581;
          }
          button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
          .status {
            margin-top: 12px;
            font-size: 13px;
            min-height: 20px;
            color: #0b6b38;
          }
          .status.error {
            color: #9f1239;
          }
          pre {
            margin: 0;
            white-space: pre-wrap;
            word-break: break-word;
            background: #0f172a;
            color: #e2e8f0;
            border-radius: 10px;
            padding: 14px;
            min-height: 260px;
            overflow: auto;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="wrap">
          <h1>SAP Ops Bot Desktop</h1>
          <p class="lead">CBO 텍스트/마크다운 소스를 선택해서 1차 규칙 분석(+선택적 LLM 보강)을 수행합니다.</p>
          <div class="grid">
            <section class="card">
              <div class="row">
                <label style="width:100%;">파일명(텍스트 직접 입력 분석용)</label>
                <input id="fileName" type="text" value="inline-cbo.md" />
              </div>
              <div class="row">
                <label style="width:100%;">소스 입력</label>
                <textarea id="sourceText" placeholder="분석할 CBO 소스(.txt/.md)를 붙여넣으세요"></textarea>
              </div>
              <div class="row">
                <label><input id="useLlm" type="checkbox" /> LLM 보강 분석 사용</label>
              </div>
              <div class="row">
                <div style="flex:1; min-width:150px;">
                  <label>Provider</label>
                  <select id="provider">
                    <option value="codex">codex</option>
                    <option value="copilot">copilot</option>
                  </select>
                </div>
                <div style="flex:2; min-width:220px;">
                  <label>Model</label>
                  <input id="model" type="text" value="gpt-4.1-mini" />
                </div>
              </div>
              <div class="row">
                <button id="analyzeText">텍스트 분석</button>
                <button id="analyzeFile" class="secondary">파일 선택 후 분석</button>
                <button id="analyzeFolder" class="secondary">폴더 배치 분석</button>
                <button id="listRuns" class="secondary">최근 실행 이력</button>
              </div>
              <div class="row">
                <label style="width:100%;">Run ID (상세 조회/동기화)</label>
                <input id="runId" type="text" placeholder="최근 실행 이력 조회 후 자동 입력됩니다." />
              </div>
              <div class="row">
                <label style="width:100%;">비교 기준 Run ID (diff from)</label>
                <input id="fromRunId" type="text" placeholder="최근 실행 이력 조회 시 자동 입력됩니다." />
              </div>
              <div class="row">
                <button id="getRunDetail" class="secondary">Run 상세 조회</button>
                <button id="syncRunKnowledge" class="secondary">Run 지식 동기화</button>
                <button id="diffRuns" class="secondary">Run 리스크 비교</button>
              </div>
              <div id="status" class="status"></div>
            </section>
            <section class="card">
              <label style="display:block; margin-bottom:8px;">분석 결과(JSON)</label>
              <pre id="resultView">{ "status": "ready" }</pre>
            </section>
          </div>
        </div>

        <script>
          const api = window.sapOpsDesktop;
          const fileNameEl = document.getElementById("fileName");
          const sourceTextEl = document.getElementById("sourceText");
          const providerEl = document.getElementById("provider");
          const modelEl = document.getElementById("model");
          const useLlmEl = document.getElementById("useLlm");
          const analyzeTextButton = document.getElementById("analyzeText");
          const analyzeFileButton = document.getElementById("analyzeFile");
          const analyzeFolderButton = document.getElementById("analyzeFolder");
          const listRunsButton = document.getElementById("listRuns");
          const runIdEl = document.getElementById("runId");
          const fromRunIdEl = document.getElementById("fromRunId");
          const getRunDetailButton = document.getElementById("getRunDetail");
          const syncRunKnowledgeButton = document.getElementById("syncRunKnowledge");
          const diffRunsButton = document.getElementById("diffRuns");
          const statusEl = document.getElementById("status");
          const resultViewEl = document.getElementById("resultView");

          function toMessage(error) {
            if (error && typeof error === "object" && typeof error.message === "string") {
              return error.message;
            }
            return "알 수 없는 오류가 발생했습니다.";
          }

          function setStatus(message, isError) {
            statusEl.textContent = message;
            statusEl.classList.toggle("error", Boolean(isError));
          }

          function resolveLlmOptions() {
            if (!useLlmEl.checked) {
              return {};
            }
            const model = modelEl.value.trim();
            if (!model) {
              throw new Error("LLM 보강을 사용하려면 model 값을 입력하세요.");
            }
            return {
              provider: providerEl.value,
              model,
            };
          }

          function renderResult(payload) {
            resultViewEl.textContent = JSON.stringify(payload, null, 2);
          }

          function setBusy(busy) {
            analyzeTextButton.disabled = busy;
            analyzeFileButton.disabled = busy;
            analyzeFolderButton.disabled = busy;
            listRunsButton.disabled = busy;
            getRunDetailButton.disabled = busy;
            syncRunKnowledgeButton.disabled = busy;
            diffRunsButton.disabled = busy;
          }

          async function ensureRunIdFromLatest() {
            const existing = runIdEl.value.trim();
            if (existing) {
              return existing;
            }
            const runs = await api.listCboRuns(1);
            const latest = Array.isArray(runs) && runs.length > 0 ? runs[0] : null;
            if (!latest || !latest.id) {
              throw new Error("조회 가능한 분석 run 이력이 없습니다.");
            }
            runIdEl.value = latest.id;
            return latest.id;
          }

          async function ensureFromRunId() {
            const existing = fromRunIdEl.value.trim();
            if (existing) {
              return existing;
            }
            const runs = await api.listCboRuns(2);
            if (!Array.isArray(runs) || runs.length < 2 || !runs[1].id) {
              throw new Error("비교할 이전 run 이력이 부족합니다. 최소 2개 run이 필요합니다.");
            }
            fromRunIdEl.value = runs[1].id;
            return runs[1].id;
          }

          if (!api) {
            setStatus("preload API 연결 실패: 앱을 다시 시작하세요.", true);
          }

          analyzeTextButton.addEventListener("click", async () => {
            if (!api) {
              return;
            }
            const source = sourceTextEl.value;
            if (!source.trim()) {
              setStatus("분석할 텍스트를 입력하세요.", true);
              return;
            }
            try {
              setBusy(true);
              setStatus("텍스트 분석 실행 중...", false);
              const llmOptions = resolveLlmOptions();
              const result = await api.analyzeCboText({
                fileName: fileNameEl.value,
                content: source,
                ...llmOptions,
              });
              renderResult(result);
              setStatus("텍스트 분석 완료", false);
            } catch (error) {
              setStatus(toMessage(error), true);
            } finally {
              setBusy(false);
            }
          });

          analyzeFileButton.addEventListener("click", async () => {
            if (!api) {
              return;
            }
            try {
              setBusy(true);
              setStatus("파일 선택 대기 중...", false);
              const llmOptions = resolveLlmOptions();
              const response = await api.pickAndAnalyzeCboFile(llmOptions);
              if (!response || response.canceled) {
                setStatus("파일 선택이 취소되었습니다.", false);
                return;
              }
              renderResult({
                filePath: response.filePath,
                result: response.result,
              });
              setStatus("파일 분석 완료: " + response.filePath, false);
            } catch (error) {
              setStatus(toMessage(error), true);
            } finally {
              setBusy(false);
            }
          });

          analyzeFolderButton.addEventListener("click", async () => {
            if (!api) {
              return;
            }
            try {
              setBusy(true);
              setStatus("폴더 선택 대기 중...", false);
              const llmOptions = resolveLlmOptions();
              const response = await api.pickAndAnalyzeCboFolder({
                recursive: true,
                skipUnchanged: true,
                ...llmOptions,
              });
              if (!response || response.canceled || !response.output) {
                setStatus("폴더 선택이 취소되었습니다.", false);
                return;
              }
              renderResult(response.output);
              runIdEl.value = response.output.run.id;
              setStatus(
                "폴더 배치 분석 완료: " + response.output.run.successFiles + "건 성공",
                false
              );
            } catch (error) {
              setStatus(toMessage(error), true);
            } finally {
              setBusy(false);
            }
          });

          listRunsButton.addEventListener("click", async () => {
            if (!api) {
              return;
            }
            try {
              setBusy(true);
              setStatus("실행 이력 조회 중...", false);
              const runs = await api.listCboRuns(20);
              if (Array.isArray(runs) && runs.length > 0 && runs[0].id) {
                runIdEl.value = runs[0].id;
              }
              if (Array.isArray(runs) && runs.length > 1 && runs[1].id) {
                fromRunIdEl.value = runs[1].id;
              }
              renderResult({ runs });
              setStatus("실행 이력 조회 완료", false);
            } catch (error) {
              setStatus(toMessage(error), true);
            } finally {
              setBusy(false);
            }
          });

          getRunDetailButton.addEventListener("click", async () => {
            if (!api) {
              return;
            }
            try {
              setBusy(true);
              setStatus("실행 상세 조회 중...", false);
              const runId = await ensureRunIdFromLatest();
              const detail = await api.getCboRunDetail(runId, 500);
              renderResult({ detail });
              setStatus("실행 상세 조회 완료", false);
            } catch (error) {
              setStatus(toMessage(error), true);
            } finally {
              setBusy(false);
            }
          });

          syncRunKnowledgeButton.addEventListener("click", async () => {
            if (!api) {
              return;
            }
            try {
              setBusy(true);
              setStatus("지식 동기화 실행 중...", false);
              const runId = await ensureRunIdFromLatest();
              const output = await api.syncCboRunKnowledge({ runId });
              renderResult({ sync: output });
              setStatus(
                "동기화 완료(" + output.mode + "): " + output.synced + "건 성공 / " + output.failed + "건 실패",
                output.failed > 0
              );
            } catch (error) {
              setStatus(toMessage(error), true);
            } finally {
              setBusy(false);
            }
          });

          diffRunsButton.addEventListener("click", async () => {
            if (!api) {
              return;
            }
            try {
              setBusy(true);
              setStatus("run 리스크 diff 계산 중...", false);
              const toRunId = await ensureRunIdFromLatest();
              const fromRunId = await ensureFromRunId();
              const diff = await api.diffCboRuns({ fromRunId, toRunId });
              renderResult({ diff });
              setStatus(
                "diff 완료: 신규 " + diff.added + " / 해소 " + diff.resolved + " / 지속 " + diff.persisted,
                false
              );
            } catch (error) {
              setStatus(toMessage(error), true);
            } finally {
              setBusy(false);
            }
          });
        </script>
      </body>
    </html>
  `;
  mainWindow.loadURL(`data:text/html,${encodeURIComponent(splash)}`);
}

function registerIpc(): void {
  ipcMain.handle("auth:start", async (_event, provider: ProviderType) => {
    return oauthManager.start(provider);
  });

  ipcMain.handle("auth:complete", async (_event, input: OAuthCompleteInput) => {
    return oauthManager.complete(input);
  });

  ipcMain.handle("auth:status", async (_event, provider: ProviderType) => {
    return oauthManager.getStatus(provider);
  });

  ipcMain.handle("auth:logout", async (_event, provider: ProviderType) => {
    return oauthManager.logout(provider);
  });

  ipcMain.handle("chat:send", async (_event, input: SendMessageInput) => {
    return chatRuntime.sendMessage(input);
  });

  ipcMain.handle("sessions:list", async (_event, limit = 50) => {
    return chatRuntime.listSessions(limit);
  });

  ipcMain.handle(
    "sessions:messages",
    async (_event, sessionId: string, limit = 100) => {
      return chatRuntime.getMessages(sessionId, limit);
    }
  );

  ipcMain.handle("cbo:analyzeText", async (_event, input: CboAnalyzeTextInput) => {
    return cboAnalyzer.analyzeText(input);
  });

  ipcMain.handle("cbo:analyzeFile", async (_event, input: CboAnalyzeFileInput) => {
    return cboAnalyzer.analyzeFile(input);
  });

  ipcMain.handle("cbo:analyzeFolder", async (_event, input: CboAnalyzeFolderInput) => {
    return cboBatchRuntime.analyzeFolder(input);
  });

  ipcMain.handle(
    "cbo:pickAndAnalyzeFile",
    async (_event, input: CboAnalyzePickInput = {}) => {
      const dialogOptions: OpenDialogOptions = {
        title: "CBO 소스 파일 선택",
        properties: ["openFile"],
        filters: [{ name: "Text/Markdown", extensions: ["txt", "md"] }],
      };
      const selection = mainWindow
        ? await dialog.showOpenDialog(mainWindow, dialogOptions)
        : await dialog.showOpenDialog(dialogOptions);

      if (selection.canceled || selection.filePaths.length === 0) {
        return {
          canceled: true,
          filePath: null,
          result: null,
        };
      }

      const filePath = selection.filePaths[0];
      const result = await cboAnalyzer.analyzeFile({
        filePath,
        provider: input.provider,
        model: input.model,
      });

      return {
        canceled: false,
        filePath,
        result,
      };
    }
  );

  ipcMain.handle(
    "cbo:pickAndAnalyzeFolder",
    async (_event, input: CboAnalyzeFolderPickInput = {}) => {
      const selection = mainWindow
        ? await dialog.showOpenDialog(mainWindow, {
            title: "CBO 소스 폴더 선택",
            properties: ["openDirectory"],
          })
        : await dialog.showOpenDialog({
            title: "CBO 소스 폴더 선택",
            properties: ["openDirectory"],
          });

      if (selection.canceled || selection.filePaths.length === 0) {
        return {
          canceled: true,
          rootPath: null,
          output: null,
        };
      }

      const rootPath = selection.filePaths[0];
      const output = await cboBatchRuntime.analyzeFolder({
        rootPath,
        recursive: input.recursive,
        provider: input.provider,
        model: input.model,
        skipUnchanged: input.skipUnchanged,
      });

      return {
        canceled: false,
        rootPath,
        output,
      };
    }
  );

  ipcMain.handle("cbo:runs:list", async (_event, limit = 20) => {
    return cboBatchRuntime.listRuns(limit);
  });

  ipcMain.handle(
    "cbo:runs:detail",
    async (_event, runId: string, limitFiles = 500) => {
      return cboBatchRuntime.getRunDetail(runId, limitFiles);
    }
  );

  ipcMain.handle(
    "cbo:runs:syncKnowledge",
    async (_event, input: CboSyncKnowledgeInput) => {
      return cboBatchRuntime.syncRunToKnowledge(input);
    }
  );

  ipcMain.handle("cbo:runs:diff", async (_event, input: CboRunDiffInput) => {
    return cboBatchRuntime.diffRuns(input);
  });
}

app.whenReady().then(() => {
  initRuntime();
  registerIpc();
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

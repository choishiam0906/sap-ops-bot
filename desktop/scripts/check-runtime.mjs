import process from "node:process";

const requiredMajor = 22;
const recommendedVersion = "22.22.1";
const currentVersion = process.versions.node;
const major = Number(currentVersion.split(".")[0]);

if (major === requiredMajor) {
  process.exit(0);
}

const lifecycleEvent = process.env.npm_lifecycle_event ?? "command";
const lines = [
  `Node.js ${requiredMajor}.x LTS가 필요합니다. 현재 버전: v${currentVersion}`,
  "이 프로젝트는 Electron 31 + better-sqlite3/keytar 네이티브 모듈 조합을 사용합니다.",
  `검증된 권장 버전은 v${recommendedVersion}입니다.`,
  "`.nvmrc` 또는 `.node-version`에 맞춰 런타임을 전환한 뒤 다시 시도하세요.",
  "권장 기준: Node.js 22 LTS + npm 10",
];

if (lifecycleEvent === "preinstall") {
  lines.push("런타임을 맞춘 뒤 `npm install`을 다시 실행하세요.");
}

console.error(lines.join("\n"));
process.exit(1);

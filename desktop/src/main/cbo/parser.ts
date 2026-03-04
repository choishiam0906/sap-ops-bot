import { readFile, stat } from "node:fs/promises";
import { basename, extname } from "node:path";

const SUPPORTED_EXTENSIONS = new Set([".txt", ".md"]);
const MAX_FILE_BYTES = 1_000_000; // 1MB

export interface ParsedCboSource {
  fileName: string;
  content: string;
}

function normalizeContent(raw: string): string {
  return raw.replace(/\r\n/g, "\n").trim();
}

function ensureTextLikeContent(content: string): void {
  if (content.includes("\u0000")) {
    throw new Error("Binary-like file is not supported. Upload text/markdown only.");
  }
}

export async function parseCboFile(filePath: string): Promise<ParsedCboSource> {
  const extension = extname(filePath).toLowerCase();
  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    throw new Error("Unsupported file extension. Only .txt and .md are allowed.");
  }

  const info = await stat(filePath);
  if (info.size > MAX_FILE_BYTES) {
    throw new Error("File is too large. Maximum size is 1MB.");
  }

  const raw = await readFile(filePath, "utf-8");
  ensureTextLikeContent(raw);

  const content = normalizeContent(raw);
  if (!content) {
    throw new Error("File is empty.");
  }

  return {
    fileName: basename(filePath),
    content,
  };
}

export function parseCboText(fileName: string, content: string): ParsedCboSource {
  const normalized = normalizeContent(content);
  if (!normalized) {
    throw new Error("Source content is empty.");
  }
  ensureTextLikeContent(normalized);
  return {
    fileName: fileName.trim() || "inline-source.txt",
    content: normalized,
  };
}

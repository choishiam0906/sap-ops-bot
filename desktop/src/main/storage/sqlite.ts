import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

import Database from "better-sqlite3";

export class LocalDatabase {
  private readonly db: Database.Database;

  constructor(dbPath: string) {
    mkdirSync(dirname(dbPath), { recursive: true });
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        provider TEXT NOT NULL,
        model TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        input_tokens INTEGER NOT NULL DEFAULT 0,
        output_tokens INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS provider_accounts (
        provider TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        account_hint TEXT,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS analysis_runs (
        id TEXT PRIMARY KEY,
        mode TEXT NOT NULL,
        root_path TEXT,
        provider TEXT,
        model TEXT,
        total_files INTEGER NOT NULL DEFAULT 0,
        success_files INTEGER NOT NULL DEFAULT 0,
        failed_files INTEGER NOT NULL DEFAULT 0,
        skipped_files INTEGER NOT NULL DEFAULT 0,
        started_at TEXT NOT NULL,
        finished_at TEXT
      );

      CREATE TABLE IF NOT EXISTS analysis_files (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_hash TEXT,
        status TEXT NOT NULL,
        error_code TEXT,
        error_message TEXT,
        summary TEXT,
        metadata_json TEXT,
        analyzed_at TEXT NOT NULL,
        FOREIGN KEY (run_id) REFERENCES analysis_runs(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS analysis_risks (
        id TEXT PRIMARY KEY,
        analysis_file_id TEXT NOT NULL,
        severity TEXT NOT NULL,
        title TEXT NOT NULL,
        detail TEXT NOT NULL,
        evidence TEXT,
        FOREIGN KEY (analysis_file_id) REFERENCES analysis_files(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS analysis_recommendations (
        id TEXT PRIMARY KEY,
        analysis_file_id TEXT NOT NULL,
        priority TEXT NOT NULL,
        action TEXT NOT NULL,
        rationale TEXT NOT NULL,
        FOREIGN KEY (analysis_file_id) REFERENCES analysis_files(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_messages_session_created
      ON messages (session_id, created_at);

      CREATE INDEX IF NOT EXISTS idx_sessions_updated
      ON sessions (updated_at);

      CREATE INDEX IF NOT EXISTS idx_analysis_runs_started
      ON analysis_runs (started_at DESC);

      CREATE INDEX IF NOT EXISTS idx_analysis_files_run
      ON analysis_files (run_id, analyzed_at DESC);

      CREATE INDEX IF NOT EXISTS idx_analysis_files_hash
      ON analysis_files (file_path, file_hash, status);
    `);
  }

  prepare(sql: string): Database.Statement {
    return this.db.prepare(sql);
  }

  transaction<T>(fn: () => T): () => T {
    return this.db.transaction(fn);
  }

  close(): void {
    this.db.close();
  }
}

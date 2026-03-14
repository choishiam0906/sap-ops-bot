import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

import Database from "better-sqlite3";

import { MigrationRunner } from "./migrationRunner.js";
import { allMigrations } from "./migrations/index.js";

export class LocalDatabase {
  private readonly db: Database.Database;

  constructor(dbPath: string) {
    mkdirSync(dirname(dbPath), { recursive: true });
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.initSchema();
    this.runMigrations();
  }

  private runMigrations(): void {
    const runner = new MigrationRunner(this.db);
    runner.run(allMigrations);
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        provider TEXT NOT NULL,
        model TEXT NOT NULL,
        todo_state TEXT DEFAULT 'open',
        is_flagged INTEGER DEFAULT 0,
        is_archived INTEGER DEFAULT 0,
        labels TEXT DEFAULT '[]',
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
        source_references_json TEXT DEFAULT '[]',
        created_at TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS provider_accounts (
        provider TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        account_hint TEXT,
        auth_type TEXT,
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

      CREATE INDEX IF NOT EXISTS idx_sessions_cockpit
      ON sessions (is_archived, todo_state, is_flagged, updated_at DESC);

      CREATE INDEX IF NOT EXISTS idx_analysis_runs_started
      ON analysis_runs (started_at DESC);

      CREATE INDEX IF NOT EXISTS idx_analysis_files_run
      ON analysis_files (run_id, analyzed_at DESC);

      CREATE INDEX IF NOT EXISTS idx_analysis_files_hash
      ON analysis_files (file_path, file_hash, status);

      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        session_id TEXT,
        run_id TEXT,
        timestamp TEXT NOT NULL DEFAULT (datetime('now')),
        security_mode TEXT NOT NULL,
        domain_pack TEXT NOT NULL,
        action TEXT NOT NULL,
        external_transfer INTEGER NOT NULL DEFAULT 0,
        policy_decision TEXT NOT NULL,
        provider TEXT,
        model TEXT,
        skill_id TEXT,
        source_ids TEXT,
        source_count INTEGER NOT NULL DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp
      ON audit_logs (timestamp DESC);

      CREATE INDEX IF NOT EXISTS idx_audit_logs_session
      ON audit_logs (session_id);

      CREATE TABLE IF NOT EXISTS knowledge_vault (
        id TEXT PRIMARY KEY,
        classification TEXT NOT NULL,
        source_type TEXT NOT NULL,
        domain_pack TEXT,
        title TEXT NOT NULL,
        excerpt TEXT,
        source_id TEXT,
        file_path TEXT,
        indexed_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_vault_classification
      ON knowledge_vault (classification);

      CREATE INDEX IF NOT EXISTS idx_vault_domain
      ON knowledge_vault (domain_pack);

      CREATE TABLE IF NOT EXISTS configured_sources (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL,
        title TEXT NOT NULL,
        root_path TEXT,
        domain_pack TEXT,
        classification_default TEXT,
        include_globs TEXT NOT NULL DEFAULT '[]',
        enabled INTEGER NOT NULL DEFAULT 1,
        sync_status TEXT NOT NULL DEFAULT 'idle',
        last_indexed_at TEXT,
        connection_meta_json TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS source_documents (
        id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL,
        relative_path TEXT NOT NULL,
        absolute_path TEXT NOT NULL,
        title TEXT NOT NULL,
        excerpt TEXT,
        content_text TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        domain_pack TEXT,
        classification TEXT,
        tags_json TEXT NOT NULL DEFAULT '[]',
        indexed_at TEXT NOT NULL,
        FOREIGN KEY (source_id) REFERENCES configured_sources(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_configured_sources_kind
      ON configured_sources (kind, domain_pack, updated_at DESC);

      CREATE INDEX IF NOT EXISTS idx_source_documents_source
      ON source_documents (source_id, indexed_at DESC);

      CREATE INDEX IF NOT EXISTS idx_source_documents_domain
      ON source_documents (domain_pack, indexed_at DESC);
    `);

    // ─── Closing (마감 관리) 테이블 ───
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS closing_plans (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL,
        target_date TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'in-progress',
        progress_percent INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS closing_steps (
        id TEXT PRIMARY KEY,
        plan_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        assignee TEXT,
        module TEXT,
        deadline TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        sort_order INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (plan_id) REFERENCES closing_plans(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_closing_plans_target_date ON closing_plans(target_date);
      CREATE INDEX IF NOT EXISTS idx_closing_plans_status ON closing_plans(status);
      CREATE INDEX IF NOT EXISTS idx_closing_steps_plan_id ON closing_steps(plan_id);
      CREATE INDEX IF NOT EXISTS idx_closing_steps_deadline ON closing_steps(deadline);
      CREATE INDEX IF NOT EXISTS idx_closing_steps_plan_order ON closing_steps(plan_id, sort_order);
    `);

    // ─── Routine (루틴 업무 자동화) 테이블 ───
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS routine_templates (
        id TEXT PRIMARY KEY,
        frequency TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        trigger_day INTEGER,
        trigger_month INTEGER,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS routine_template_steps (
        id TEXT PRIMARY KEY,
        template_id TEXT NOT NULL REFERENCES routine_templates(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        module TEXT,
        sort_order INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS routine_executions (
        id TEXT PRIMARY KEY,
        template_id TEXT NOT NULL REFERENCES routine_templates(id) ON DELETE CASCADE,
        plan_id TEXT NOT NULL REFERENCES closing_plans(id) ON DELETE CASCADE,
        execution_date TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_routine_exec_unique
      ON routine_executions(template_id, execution_date);

      CREATE INDEX IF NOT EXISTS idx_routine_templates_frequency
      ON routine_templates(frequency, is_active);

      CREATE INDEX IF NOT EXISTS idx_routine_template_steps_template
      ON routine_template_steps(template_id, sort_order);

      CREATE INDEX IF NOT EXISTS idx_routine_executions_date
      ON routine_executions(execution_date);
    `);

    // ─── Agent (스킬 조합 워크플로우) 테이블 ───
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS agent_executions (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'running',
        started_at TEXT NOT NULL,
        completed_at TEXT,
        error_message TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS agent_step_results (
        id TEXT PRIMARY KEY,
        execution_id TEXT NOT NULL REFERENCES agent_executions(id) ON DELETE CASCADE,
        step_id TEXT NOT NULL,
        skill_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        started_at TEXT,
        completed_at TEXT,
        output_text TEXT,
        error TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_agent_executions_agent
      ON agent_executions(agent_id, started_at DESC);

      CREATE INDEX IF NOT EXISTS idx_agent_step_results_exec
      ON agent_step_results(execution_id);
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

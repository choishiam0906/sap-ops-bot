import type { Migration } from "../migrationRunner.js";
import { migration001 } from "./001_baseline.js";
import { migration002 } from "./002_v5_schedule.js";
import { migration003 } from "./003_v5_policy.js";

/** 모든 마이그레이션을 버전 순서로 내보낸다. */
export const allMigrations: Migration[] = [
  migration001,
  migration002,
  migration003,
];

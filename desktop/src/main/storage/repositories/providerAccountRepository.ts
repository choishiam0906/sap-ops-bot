import type { ProviderAccount, ProviderType } from "../../contracts.js";
import type { LocalDatabase } from "../sqlite.js";

export class ProviderAccountRepository {
  constructor(private readonly db: LocalDatabase) {}

  upsert(account: ProviderAccount): ProviderAccount {
    this.db
      .prepare(
        `INSERT INTO provider_accounts(provider, status, account_hint, auth_type, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(provider) DO UPDATE SET
           status=excluded.status,
           account_hint=excluded.account_hint,
           auth_type=excluded.auth_type,
           updated_at=excluded.updated_at`
      )
      .run(
        account.provider,
        account.status,
        account.accountHint,
        account.authType ?? null,
        account.updatedAt
      );
    return account;
  }

  get(provider: ProviderType): ProviderAccount | null {
    const row = this.db
      .prepare(
        `SELECT provider, status, account_hint AS accountHint, auth_type AS authType, updated_at AS updatedAt
         FROM provider_accounts WHERE provider = ?`
      )
      .get(provider) as ProviderAccount | undefined;
    return row ?? null;
  }
}

import { Database } from "@db/sqlite";
import { createDbQuery } from "./queries/create_db.ts";
import { createAcceptInviteTrigger } from "./queries/accept_invite_trigger.ts";
import { createDeclineInviteTrigger } from "./queries/decline_invite_trigger.ts";
import { createBanUserTrigger } from "./queries/ban_user_trigger.ts";

export const db: Database = new Database(Deno.env.get("DB_PATH") ?? "chat.db");

export function initDatabase(): void {
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(createDbQuery);

  db.exec(createAcceptInviteTrigger);
  db.exec(createDeclineInviteTrigger);

  db.exec(createBanUserTrigger);
}

export function closeDatabase(): void {
  db.close();
}

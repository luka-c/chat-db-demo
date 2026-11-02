import { initDatabase } from "../db.ts";

export function setupDb(): void {
  initDatabase();
}

export function authHeaders(jwt: string) {
  return { Authorization: `Bearer ${jwt}` };
}

export function jsonHeader() {
  return { "Content-Type": "application/json" };
}

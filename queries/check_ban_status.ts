import { db } from "../db.ts";

export function checkBanStatus(userId: number, chatId: number): boolean {
  const userBansFromChat = db.sql`
    SELECT * 
    FROM Bans
    WHERE bannedUserId = ${userId}
    AND chatId = ${chatId};
  `;

  if (userBansFromChat.length == 0) {
    return false;
  }

  return true;
}

import { db } from "../db.ts";
import { ChatUser } from "../types/user_in_chat.ts";
import { UserStatus } from "../types/user_status.ts";

export function checkUserStatusInChat(
  userId: number,
  chatId: number,
): UserStatus {
  const chatUserRow = db.sql<ChatUser>`
        SELECT * FROM ChatUser
        WHERE userId = ${userId}
        AND chatId = ${chatId} 
    `;

  if (chatUserRow.length == 0) {
    return UserStatus.notInChat;
  }

  if (chatUserRow[0].isAdmin) {
    return UserStatus.adminOfChat;
  }

  return UserStatus.inChat;
}

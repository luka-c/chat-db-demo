import { Hono } from "hono";
import { chatMessagesRouter } from "./messages.ts";
import { chatBansRouter } from "./bans.ts";
import { zValidator } from "@hono/zod-validator";
import { Chat, newChatSchema, updateChatSchema } from "../../types/chat.ts";
import { chatUsersRouter } from "./users.ts";
import { Variables } from "../../helpers/hono_variables.ts";
import { db } from "../../db.ts";
import { checkUserStatusInChat } from "../../queries/check_user_status.ts";
import { UserStatus } from "../../types/user_status.ts";
import { errorMessages } from "../../helpers/constants.ts";

export const chatsRouter = new Hono<{ Variables: Variables }>();

// Create new chat
chatsRouter.post("/", zValidator("json", newChatSchema), (ctx) => {
  const body = ctx.req.valid("json");
  const jwtPayload = ctx.get("jwtPayload");

  let newChat: Chat | undefined;

  db.transaction(() => {
    const createdChat = db.sql<Chat>`
      INSERT INTO Chats
      (name)
      VALUES (${body.name})
      RETURNING *;
    `;

    db.sql`
      INSERT INTO ChatUser
      (userId, chatId, isAdmin)
      VALUES (${jwtPayload.userId}, ${createdChat[0].id}, true);
    `;

    newChat = createdChat[0];
  }).default();

  if (!newChat) {
    return ctx.text(errorMessages.somethingWentWrong, 500);
  }

  return ctx.json(newChat, 201);
});

// Update chat info
chatsRouter.put("/:chatId", zValidator("json", updateChatSchema), (ctx) => {
  const chatId = Number.parseInt(ctx.req.param("chatId"));
  const jwtPayload = ctx.get("jwtPayload");
  const body = ctx.req.valid("json");

  const userStatus = checkUserStatusInChat(jwtPayload.userId, chatId);

  if (userStatus !== UserStatus.adminOfChat) {
    return ctx.text(errorMessages.forbidden, 403);
  }

  const updatedChats = db.sql<Chat>`
    UPDATE Chats
    SET name = ${body.name}
    WHERE id = ${chatId}
    RETURNING *;
  `;

  if (updatedChats.length == 0) {
    return ctx.text(errorMessages.notFound, 404);
  }

  return ctx.json(updatedChats[0], 200);
});

chatsRouter.delete("/:chatId", (ctx) => {
  const chatId = Number.parseInt(ctx.req.param("chatId"));
  const jwtPayload = ctx.get("jwtPayload");

  const userStatus = checkUserStatusInChat(jwtPayload.userId, chatId);

  if (userStatus !== UserStatus.adminOfChat) {
    return ctx.text(errorMessages.forbidden, 403);
  }

  const affectedRows = db.sql<Chat>`
    DELETE FROM Chats
    WHERE id = ${chatId}
    RETURNING *;
  `;

  if (affectedRows.length == 0) {
    return ctx.text(errorMessages.notFound, 404);
  }

  return ctx.body(null, 204);
});

chatsRouter.route("/", chatMessagesRouter);
chatsRouter.route("/", chatBansRouter);
chatsRouter.route("/", chatUsersRouter);

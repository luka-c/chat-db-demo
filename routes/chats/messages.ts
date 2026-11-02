import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  Message,
  newMessageSchema,
  updateMessageSchema,
} from "../../types/message.ts";
import { Variables } from "../../helpers/hono_variables.ts";
import { checkUserStatusInChat } from "../../queries/check_user_status.ts";
import { UserStatus } from "../../types/user_status.ts";
import { errorMessages } from "../../helpers/constants.ts";
import { db } from "../../db.ts";

export const chatMessagesRouter = new Hono<{ Variables: Variables }>().basePath(
  "/:chatId/messages",
);

// List messages in specific chat
chatMessagesRouter.get("/", (ctx) => {
  const chatId = Number.parseInt(ctx.req.param("chatId"));
  const jwtPayload = ctx.get("jwtPayload");

  const userStatus = checkUserStatusInChat(jwtPayload.userId, chatId);

  if (userStatus == UserStatus.notInChat) {
    return ctx.text(errorMessages.forbidden, 403);
  }

  const foundMessages = db.sql<Message>`
    SELECT *
    FROM Messages
    WHERE chatId = ${chatId};
  `;

  return ctx.json(foundMessages, 200);
});

// Create message in specific chat
chatMessagesRouter.post("/", zValidator("json", newMessageSchema), (ctx) => {
  const chatId = Number.parseInt(ctx.req.param("chatId"));
  const body = ctx.req.valid("json");
  const jwtPayload = ctx.get("jwtPayload");

  const userStatus = checkUserStatusInChat(jwtPayload.userId, chatId);

  if (userStatus == UserStatus.notInChat) {
    return ctx.text(errorMessages.forbidden, 403);
  }

  const newMessages = db.sql`
      INSERT INTO Messages
      (senderId, chatId, content)
      VALUES (${jwtPayload.userId}, ${chatId}, ${body.content})
      RETURNING *;
    `;

  if (newMessages.length == 0) {
    return ctx.text(errorMessages.somethingWentWrong, 500);
  }

  return ctx.json(newMessages[0], 201);
});

// Edit chat message info
chatMessagesRouter.put(
  "/:messageId",
  zValidator("json", updateMessageSchema),
  (ctx) => {
    const chatId = Number.parseInt(ctx.req.param("chatId"));
    const messageId = Number.parseInt(ctx.req.param("messageId"));
    const body = ctx.req.valid("json");
    const jwtPayload = ctx.get("jwtPayload");

    const userStatus = checkUserStatusInChat(jwtPayload.userId, chatId);

    if (userStatus == UserStatus.notInChat) {
      return ctx.text(errorMessages.forbidden, 403);
    }

    const updatedMessages = db.sql<Message>`
      UPDATE Messages
      SET content = ${body.content}
      WHERE id = ${messageId}
      AND chatId = ${chatId}
      AND senderId = ${jwtPayload.userId}
      RETURNING *;
    `;

    if (updatedMessages.length == 0) {
      return ctx.text(errorMessages.notFound, 404);
    }

    return ctx.json(updatedMessages[0], 200);
  },
);

// Delete chat message
chatMessagesRouter.delete("/:messageId", (ctx) => {
  const chatId = Number.parseInt(ctx.req.param("chatId"));
  const messageId = ctx.req.param("messageId");
  const jwtPayload = ctx.get("jwtPayload");

  const userStatus = checkUserStatusInChat(jwtPayload.userId, chatId);

  if (userStatus == UserStatus.notInChat) {
    return ctx.text(errorMessages.forbidden, 403);
  }

  const affectedRows = db.sql<Message>`
      DELETE FROM Messages
      WHERE id = ${messageId}
      AND chatId = ${chatId}
      AND senderId = ${jwtPayload.userId}
      RETURNING *;
    `;

  if (affectedRows.length == 0) {
    return ctx.text(errorMessages.notFound, 404);
  }

  return ctx.body(null, 204);
});

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { Ban, createBanSchema } from "../../types/ban.ts";
import { Variables } from "../../helpers/hono_variables.ts";
import { checkUserStatusInChat } from "../../queries/check_user_status.ts";
import { UserStatus } from "../../types/user_status.ts";
import { errorMessages } from "../../helpers/constants.ts";
import { db } from "../../db.ts";

export const chatBansRouter = new Hono<{ Variables: Variables }>().basePath(
  "/:chatId/bans",
);

// Ban user from chat
chatBansRouter.post("/", zValidator("json", createBanSchema), (ctx) => {
  const chatId = Number.parseInt(ctx.req.param("chatId"));
  const body = ctx.req.valid("json");
  const jwtPayload = ctx.get("jwtPayload");

  if (jwtPayload.userId == body.bannedUserId) {
    return ctx.text("A user cannot ban themselves.", 400);
  }

  const userStatus = checkUserStatusInChat(jwtPayload.userId, chatId);

  if (userStatus !== UserStatus.adminOfChat) {
    return ctx.text(errorMessages.forbidden, 403);
  }

  const userToBanStatus = checkUserStatusInChat(body.bannedUserId, chatId);

  if (userToBanStatus == UserStatus.adminOfChat) {
    return ctx.text("Chat admins cannot be banned.", 400);
  }

  let newBans: Ban[] = [];

  try {
    newBans = db.sql<Ban>`
      INSERT INTO Bans
      (bannedUserId, chatId, bannedBy)
      VALUES (${body.bannedUserId}, ${chatId}, ${jwtPayload.userId})
      RETURNING *;
    `;
  } catch (_error) {
    return ctx.text(errorMessages.userAlreadyBannedOrNotFound, 400);
  }

  if (newBans.length == 0) {
    return ctx.text(errorMessages.somethingWentWrong, 500);
  }

  return ctx.json(newBans[0], 201);
});

// Unban user from chat
chatBansRouter.delete("/:userId", (ctx) => {
  const chatId = Number.parseInt(ctx.req.param("chatId"));
  const userId = Number.parseInt(ctx.req.param("userId"));
  const jwtPayload = ctx.get("jwtPayload");

  if (jwtPayload.userId == userId) {
    return ctx.text("A user cannot unban themselves.", 400);
  }

  const userStatus = checkUserStatusInChat(jwtPayload.userId, chatId);

  if (userStatus !== UserStatus.adminOfChat) {
    return ctx.text(errorMessages.forbidden, 403);
  }

  const affectedRows = db.sql`
    DELETE FROM Bans
    WHERE bannedUserId = ${userId}
    AND chatId = ${chatId}
    RETURNING *;
  `;

  if (affectedRows.length == 0) {
    return ctx.text(errorMessages.notFound, 404);
  }

  return ctx.body(null, 204);
});

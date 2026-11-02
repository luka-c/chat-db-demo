import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  addUserToChatSchema,
  ChatUser,
  updateChatUserSchema,
} from "../../types/user_in_chat.ts";
import { Invite, newInviteSchema } from "../../types/invite.ts";
import { Variables } from "../../helpers/hono_variables.ts";
import { checkUserStatusInChat } from "../../queries/check_user_status.ts";
import { UserStatus } from "../../types/user_status.ts";
import { errorMessages } from "../../helpers/constants.ts";
import { db } from "../../db.ts";
import { User, ViewableUser } from "../../types/user.ts";
import { checkBanStatus } from "../../queries/check_ban_status.ts";

export const chatUsersRouter = new Hono<{ Variables: Variables }>().basePath(
  "/:chatId/users",
);

// List users in chat
chatUsersRouter.get("/", (ctx) => {
  const chatId = Number.parseInt(ctx.req.param("chatId"));
  const jwtPayload = ctx.get("jwtPayload");

  const userStatus = checkUserStatusInChat(jwtPayload.userId, chatId);

  if (userStatus == UserStatus.notInChat) {
    return ctx.text(errorMessages.forbidden, 403);
  }

  const foundUsers = db.sql<ViewableUser>`
    SELECT id, username
    FROM ChatUser 
    INNER JOIN Users ON userId = id
    WHERE chatId = ${chatId};
  `;

  return ctx.json(foundUsers, 200);
});

// Add user directly to chat
chatUsersRouter.post("/", zValidator("json", addUserToChatSchema), (ctx) => {
  const chatId = Number.parseInt(ctx.req.param("chatId"));
  const body = ctx.req.valid("json");
  const jwtPayload = ctx.get("jwtPayload");

  const userStatus = checkUserStatusInChat(jwtPayload.userId, chatId);

  if (userStatus != UserStatus.adminOfChat) {
    return ctx.text(errorMessages.forbidden, 403);
  }

  const foundUsers = db.sql<User>`
    SELECT * 
    FROM Users
    WHERE username = ${body.username};
  `;

  if (foundUsers.length == 0) {
    return ctx.text(errorMessages.notFound, 404);
  }

  if (jwtPayload.userId == foundUsers[0].id) {
    return ctx.text("A user cannot add themselves.", 400);
  }

  const isUserBanned = checkBanStatus(foundUsers[0].id, chatId);

  if (isUserBanned) {
    return ctx.text(errorMessages.userBanned, 400);
  }

  let newUsersInChat = [];

  try {
    newUsersInChat = db.sql<ChatUser>`
      INSERT INTO ChatUser
      (userId, chatId)
      VALUES (${foundUsers[0].id}, ${chatId})
      RETURNING *;
    `;
  } catch (_error) {
    return ctx.text(errorMessages.userAlreadyInChat, 400);
  }

  if (newUsersInChat.length == 0) {
    return ctx.text(errorMessages.somethingWentWrong, 500);
  }

  return ctx.json(newUsersInChat[0], 201);
});

// Remove user from chat
chatUsersRouter.delete("/:userId", (ctx) => {
  const chatId = Number.parseInt(ctx.req.param("chatId"));
  const userId = Number.parseInt(ctx.req.param("userId"));
  const jwtPayload = ctx.get("jwtPayload");

  if (jwtPayload.userId == userId) {
    return ctx.text("A user cannot remove themselves.", 400);
  }

  const userStatus = checkUserStatusInChat(jwtPayload.userId, chatId);

  if (userStatus != UserStatus.adminOfChat) {
    return ctx.text(errorMessages.forbidden, 403);
  }

  const affectedRows = db.sql`
    DELETE FROM ChatUser
    WHERE userId = ${userId}
    AND chatId = ${chatId}
    AND isAdmin = false
    RETURNING *;
  `;

  if (affectedRows.length == 0) {
    return ctx.text(errorMessages.notFound, 404);
  }

  return ctx.body(null, 204);
});

// Invite user to chat
chatUsersRouter.post("/invites", zValidator("json", newInviteSchema), (ctx) => {
  const chatId = Number.parseInt(ctx.req.param("chatId"));
  const body = ctx.req.valid("json");
  const jwtPayload = ctx.get("jwtPayload");

  const userStatus = checkUserStatusInChat(jwtPayload.userId, chatId);

  if (userStatus != UserStatus.adminOfChat) {
    return ctx.text(errorMessages.forbidden, 403);
  }

  const foundUsers = db.sql<User>`
    SELECT * 
    FROM Users
    WHERE username = ${body.invitedUserUsername};
  `;

  if (foundUsers.length == 0) {
    return ctx.text(errorMessages.notFound, 404);
  }

  if (jwtPayload.userId == foundUsers[0].id) {
    return ctx.text("A user cannot invite themselves.", 400);
  }

  const isUserBanned = checkBanStatus(foundUsers[0].id, chatId);

  if (isUserBanned) {
    return ctx.text(errorMessages.userBanned, 400);
  }

  let newUserInvites: Invite[] = [];

  try {
    newUserInvites = db.sql<Invite>`
      INSERT INTO Invites
      (invitedUserId, chatId, invitedBy)
      VALUES (${foundUsers[0].id}, ${chatId}, ${jwtPayload.userId})
      RETURNING *;
    `;
  } catch (_error) {
    return ctx.text(errorMessages.userAlreadyInvited, 400);
  }

  if (newUserInvites.length == 0) {
    return ctx.text(errorMessages.somethingWentWrong, 500);
  }

  return ctx.json(newUserInvites[0], 201);
});

// Promote or demote chat user
chatUsersRouter.put(
  "/:userId",
  zValidator("json", updateChatUserSchema),
  (ctx) => {
    const chatId = Number.parseInt(ctx.req.param("chatId"));
    const userId = Number.parseInt(ctx.req.param("userId"));
    const body = ctx.req.valid("json");
    const jwtPayload = ctx.get("jwtPayload");

    const userStatus = checkUserStatusInChat(jwtPayload.userId, chatId);

    if (userStatus != UserStatus.adminOfChat) {
      return ctx.text(errorMessages.forbidden, 403);
    }

    const updatedUsers = db.sql<ChatUser>`
      UPDATE ChatUser
      SET isAdmin = ${body.isAdmin}
      WHERE chatId = ${chatId}
      AND userId = ${userId}
      AND (
        ${body.isAdmin} = true
        OR isAdmin = false
        OR (
          SELECT COUNT(*)
          FROM ChatUser
          WHERE chatId = ${chatId}
          AND isAdmin = true
        ) > 1
      )
      RETURNING *;
    `;

    if (updatedUsers.length == 0) {
      const targetStatus = checkUserStatusInChat(userId, chatId);

      if (targetStatus == UserStatus.notInChat) {
        return ctx.text(errorMessages.notFound, 404);
      }

      return ctx.text("A chat must have at least one admin.", 400);
    }

    return ctx.json(updatedUsers[0], 200);
  },
);

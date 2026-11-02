import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { updateUserSchema, ViewableUser } from "../types/user.ts";
import { db } from "../db.ts";
import { Invite, inviteSchema } from "../types/invite.ts";
import { Variables } from "../helpers/hono_variables.ts";
import { errorMessages } from "../helpers/constants.ts";

export const usersRouter = new Hono<{ Variables: Variables }>();

// Get user info
usersRouter.get("/:userId", (ctx) => {
  const userId = Number.parseInt(ctx.req.param("userId"));

  const jwtPayload = ctx.get("jwtPayload");

  if (jwtPayload.userId !== userId) {
    return ctx.text(errorMessages.forbidden, 403);
  }

  const foundUsers = db.sql<ViewableUser>`
      SELECT id, username
      FROM Users
      WHERE id = ${userId};
    `;

  if (foundUsers.length == 0) {
    return ctx.text(errorMessages.notFound, 404);
  }

  return ctx.json(foundUsers[0], 200);
});

// Update user info
usersRouter.put("/:userId", zValidator("json", updateUserSchema), (ctx) => {
  const userId = Number.parseInt(ctx.req.param("userId"));
  const body = ctx.req.valid("json");

  const jwtPayload = ctx.get("jwtPayload");

  if (jwtPayload.userId !== userId) {
    return ctx.text(errorMessages.forbidden, 403);
  }

  let updatedUsers: ViewableUser[] = [];

  try {
    updatedUsers = db.sql<ViewableUser>`
      UPDATE Users
      SET username = ${body.username}
      WHERE id = ${userId}
      RETURNING id, username;
    `;
  } catch (_error) {
    return ctx.text(errorMessages.usernameExists, 400);
  }

  if (updatedUsers.length == 0) {
    return ctx.text(errorMessages.notFound, 404);
  }

  return ctx.json(updatedUsers[0], 200);
});

// Delete user
usersRouter.delete("/:userId", (ctx) => {
  const userId = Number.parseInt(ctx.req.param("userId"));

  const jwtPayload = ctx.get("jwtPayload");

  if (jwtPayload.userId !== userId) {
    return ctx.text(errorMessages.forbidden, 403);
  }

  const affectedRows = db.sql`
    DELETE FROM Users
    WHERE id = ${userId}
    RETURNING *;
  `;

  if (affectedRows.length == 0) {
    return ctx.text(errorMessages.notFound, 404);
  }

  return ctx.body(null, 204);
});

// Get available invites
usersRouter.get("/:userId/invites", (ctx) => {
  const userId = Number.parseInt(ctx.req.param("userId"));

  const jwtPayload = ctx.get("jwtPayload");

  if (jwtPayload.userId !== userId) {
    return ctx.text(errorMessages.forbidden, 403);
  }

  const invites = db.sql<Invite>`
    SELECT * FROM Invites
    WHERE invitedUserId = ${userId};
  `;

  return ctx.json(invites, 200);
});

// Accept invite
usersRouter.post(
  "/:userId/invites/:chatId/accept",
  zValidator("json", inviteSchema.pick({ invitedBy: true })),
  (ctx) => {
    const userId = Number.parseInt(ctx.req.param("userId"));

    const jwtPayload = ctx.get("jwtPayload");

    if (jwtPayload.userId !== userId) {
      return ctx.text(errorMessages.forbidden, 403);
    }

    const chatId = ctx.req.param("chatId");

    const body = ctx.req.valid("json");
    const invitedBy = body.invitedBy;

    const updatedInvites = db.sql`
      UPDATE Invites
      SET accepted = true
      WHERE invitedUserId = ${userId}
      AND chatId = ${chatId}
      AND invitedBy = ${invitedBy}
      RETURNING *;
    `;

    if (updatedInvites.length == 0) {
      return ctx.text(errorMessages.notFound, 404);
    }

    return ctx.json(updatedInvites[0], 200);
  },
);

// Decline invite
usersRouter.post(
  "/:userId/invites/:chatId/decline",
  zValidator("json", inviteSchema.pick({ invitedBy: true })),
  (ctx) => {
    const userId = Number.parseInt(ctx.req.param("userId"));

    const jwtPayload = ctx.get("jwtPayload");

    if (jwtPayload.userId !== userId) {
      return ctx.text(errorMessages.forbidden, 403);
    }

    const chatId = ctx.req.param("chatId");

    const body = ctx.req.valid("json");
    const invitedBy = body.invitedBy;

    const updatedInvites = db.sql`
      UPDATE Invites
      SET accepted = false
      WHERE invitedUserId = ${userId}
      AND chatId = ${chatId}
      AND invitedBy = ${invitedBy}
      RETURNING *;
    `;

    if (updatedInvites.length == 0) {
      return ctx.text(errorMessages.notFound, 404);
    }

    return ctx.json(updatedInvites[0], 200);
  },
);

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db } from "../db.ts";
import { userLoginSchema, User, createUserSchema } from "../types/user.ts";
import { createPasswordHash, validatePassword } from "../helpers/hash.ts";
import { createJwt } from "../helpers/jwt.ts";
import { errorMessages } from "../helpers/constants.ts";

export const authRouter = new Hono();

authRouter.post(
  "/signup",
  zValidator("json", createUserSchema),
  async (ctx) => {
    const body = ctx.req.valid("json");
    const passwordHash = await createPasswordHash(body.password);

    let insertedUsers = [];

    try {
      insertedUsers = db.sql<User>`
        INSERT INTO Users
        (username, password)
        VALUES (${body.username}, ${passwordHash})
        RETURNING *;
    `;
    } catch (_error) {
      return ctx.text(errorMessages.usernameExists, 400);
    }

    if (insertedUsers.length == 0) {
      return ctx.text(errorMessages.somethingWentWrong, 500);
    }

    const jwt = await createJwt(insertedUsers[0].id);

    return ctx.json(
      {
        token: jwt,
      },
      201,
    );
  },
);

authRouter.post("/login", zValidator("json", userLoginSchema), async (ctx) => {
  const body = ctx.req.valid("json");

  const foundUsers = db.sql<User>`
    SELECT *
    FROM Users
    WHERE username = ${body.username};
  `;

  if (foundUsers.length == 0) {
    return ctx.text(errorMessages.invalidCredentials, 401);
  }

  const isPasswordValid = await validatePassword(
    body.password,
    foundUsers[0].password,
  );

  if (!isPasswordValid) {
    return ctx.text(errorMessages.invalidCredentials, 401);
  }

  const jwt = await createJwt(foundUsers[0].id);

  return ctx.json(
    {
      token: jwt,
    },
    200,
  );
});

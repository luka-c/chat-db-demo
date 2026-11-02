import { Hono } from "hono";
import { jwt } from "hono/jwt";
import { HTTPException } from "hono/http-exception";
import { usersRouter } from "./routes/users.ts";
import { chatsRouter } from "./routes/chats/index.ts";
import { authRouter } from "./routes/auth.ts";
import { JWT_SECRET } from "./helpers/constants.ts";
import { Variables } from "./helpers/hono_variables.ts";

export const app = new Hono<{ Variables: Variables }>();

app.get("/", (c) => c.text("Chat Demo API"));

// Authenticate routes first
app.use("/users/*", jwt({ secret: JWT_SECRET, alg: "HS256" }));
app.use("/chats/*", jwt({ secret: JWT_SECRET, alg: "HS256" }));

// Register routes
app.route("/users", usersRouter);
app.route("/chats", chatsRouter);
app.route("/auth", authRouter);

// Register global error handler
app.onError((error, c) => {
  if (error instanceof HTTPException) {
    return error.getResponse();
  }

  console.error(error);

  return c.json({ message: "Internal server error" }, 500);
});

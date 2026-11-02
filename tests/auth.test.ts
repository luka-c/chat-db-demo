import { assertEquals } from "@std/assert/equals";
import { app } from "../app.ts";
import { jsonHeader, setupDb } from "./helpers.test.ts";

setupDb();

Deno.test("Short password doesn't create user.", async () => {
  const res = await app.request("/auth/signup", {
    method: "POST",
    headers: jsonHeader(),
    body: JSON.stringify({
      username: "test",
      password: "123",
    }),
  });

  assertEquals(res.status, 400);
});

Deno.test("Short username doesn't create user.", async () => {
  const res = await app.request("/auth/signup", {
    method: "POST",
    headers: jsonHeader(),
    body: JSON.stringify({
      username: "t",
      password: "123456789",
    }),
  });

  assertEquals(res.status, 400);
});

Deno.test("Correct username and password create user.", async () => {
  const res = await app.request("/auth/signup", {
    method: "POST",
    headers: jsonHeader(),
    body: JSON.stringify({
      username: "testUser",
      password: "123456789",
    }),
  });

  assertEquals(res.status, 201);
});

Deno.test("Incorrect username doesn't login user.", async () => {
  const res = await app.request("/auth/login", {
    method: "POST",
    headers: jsonHeader(),
    body: JSON.stringify({
      username: "wrongUser",
      password: "123456789",
    }),
  });

  assertEquals(res.status, 401);
});

Deno.test("Incorrect password doesn't login user.", async () => {
  const res = await app.request("/auth/login", {
    method: "POST",
    headers: jsonHeader(),
    body: JSON.stringify({
      username: "testUser",
      password: "wrongPassword",
    }),
  });

  assertEquals(res.status, 401);
});

Deno.test("Correct username and password login user.", async () => {
  const res = await app.request("/auth/login", {
    method: "POST",
    headers: jsonHeader(),
    body: JSON.stringify({
      username: "testUser",
      password: "123456789",
    }),
  });

  assertEquals(res.status, 200);
});

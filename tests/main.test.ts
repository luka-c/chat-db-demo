import { assertEquals } from "@std/assert";
import { app } from "../app.ts";
import { setupDb } from "./helpers.test.ts";

setupDb();

Deno.test("GET / returns the API name.", async () => {
  const res = await app.request("/");
  assertEquals(res.status, 200);
  assertEquals(await res.text(), "Chat Demo API");
});

Deno.test("Protected routes reject requests without a token.", async () => {
  for (const path of ["/users", "/chats"]) {
    const res = await app.request(path);
    assertEquals(res.status, 401);
  }
});

Deno.test("Unknown route returns 404.", async () => {
  const res = await app.request("/trlababalan");
  assertEquals(res.status, 404);
});

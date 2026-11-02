import { assertEquals } from "@std/assert/equals";
import { app } from "../app.ts";
import { authHeaders, jsonHeader, setupDb } from "./helpers.test.ts";
import { createJwt } from "../helpers/jwt.ts";
import { ViewableUser } from "../types/user.ts";

setupDb();

const firstUserToken = await createJwt(1);
const secondUserToken = await createJwt(2);
const thirdUserToken = await createJwt(3);
const fourthUserToken = await createJwt(4);

Deno.test("Create 4 new users.", async () => {
  for (let i = 0; i < 4; i++) {
    const res = await app.request("/auth/signup", {
      method: "POST",
      headers: jsonHeader(),
      body: JSON.stringify({
        username: `testUser${i + 1}`,
        password: "123456789",
      }),
    });

    assertEquals(res.status, 201);
  }
});

Deno.test("List of all users does not exist.", async () => {
  const res = await app.request("/users", {
    headers: authHeaders(firstUserToken),
  });

  assertEquals(res.status, 404);
});

Deno.test("User can't fetch another user's details.", async () => {
  const res = await app.request("/users/2", {
    headers: authHeaders(firstUserToken),
  });

  assertEquals(res.status, 403);
});

Deno.test("User can fetch their own details.", async () => {
  const res = await app.request("/users/1", {
    headers: authHeaders(firstUserToken),
  });

  const body = await res.json();

  assertEquals(res.status, 200);
  assertEquals(body["id"], 1);
  assertEquals(body["username"], "testUser1");
});

Deno.test("User can't change another user's details.", async () => {
  const res = await app.request("/users/2", {
    method: "PUT",
    headers: {
      ...authHeaders(firstUserToken),
      ...jsonHeader(),
    },
    body: JSON.stringify({ username: "modifiedUsername" }),
  });

  assertEquals(res.status, 403);
});

Deno.test("User can't change their username to a non unique one.", async () => {
  const res = await app.request("/users/1", {
    method: "PUT",
    headers: {
      ...authHeaders(firstUserToken),
      ...jsonHeader(),
    },
    body: JSON.stringify({ username: "testUser2" }),
  });

  assertEquals(res.status, 400);
});

Deno.test("User can't change their username to a short one.", async () => {
  const res = await app.request("/users/2", {
    method: "PUT",
    headers: {
      ...authHeaders(secondUserToken),
      ...jsonHeader(),
    },
    body: JSON.stringify({ username: "tes" }),
  });

  assertEquals(res.status, 400);
});

Deno.test("User can change their own username with a unique one.", async () => {
  const res = await app.request("/users/1", {
    method: "PUT",

    headers: {
      ...authHeaders(firstUserToken),
      ...jsonHeader(),
    },
    body: JSON.stringify({ username: "modifiedUsername" }),
  });

  const body = await res.json();

  assertEquals(res.status, 200);
  assertEquals(body["id"], 1);
  assertEquals(body["username"], "modifiedUsername");
});

Deno.test("User can't delete another user.", async () => {
  const res = await app.request("/users/2", {
    method: "DELETE",
    headers: {
      ...authHeaders(firstUserToken),
    },
  });

  assertEquals(res.status, 403);
});

Deno.test("User can delete themselves.", async () => {
  const res = await app.request("/users/1", {
    method: "DELETE",
    headers: {
      ...authHeaders(firstUserToken),
    },
  });

  assertEquals(res.status, 204);
});

Deno.test("Deleted user's details can't be fetched.", async () => {
  const res = await app.request("/users/1", {
    headers: authHeaders(firstUserToken),
  });

  assertEquals(res.status, 404);
});

Deno.test("Deleted user can't be deleted again.", async () => {
  const res = await app.request("/users/1", {
    method: "DELETE",
    headers: {
      ...authHeaders(firstUserToken),
    },
  });

  assertEquals(res.status, 404);
});

Deno.test("Deleted user can't be updated.", async () => {
  const res = await app.request("/users/1", {
    method: "PUT",
    headers: {
      ...authHeaders(firstUserToken),
      ...jsonHeader(),
    },
    body: JSON.stringify({ username: "ghostUsername" }),
  });

  assertEquals(res.status, 404);
});

// ------ INVITES ------

let testChatId = 0;

Deno.test("Create a chat for invite tests as user 2.", async () => {
  const res = await app.request("/chats", {
    method: "POST",
    headers: {
      ...authHeaders(secondUserToken),
      ...jsonHeader(),
    },
    body: JSON.stringify({ name: "testChat" }),
  });

  const body = await res.json();

  assertEquals(res.status, 201);

  testChatId = body["id"];
});

Deno.test("User with no invites gets an empty list.", async () => {
  const res = await app.request("/users/3/invites", {
    headers: authHeaders(thirdUserToken),
  });

  const body = await res.json();

  assertEquals(res.status, 200);
  assertEquals(body.length, 0);
});

Deno.test("User can't list another user's invites.", async () => {
  const res = await app.request("/users/4/invites", {
    headers: authHeaders(thirdUserToken),
  });

  assertEquals(res.status, 403);
});

Deno.test("Chat admin invites users 3 and 4.", async () => {
  for (const username of ["testUser3", "testUser4"]) {
    const res = await app.request(`/chats/${testChatId}/users/invites`, {
      method: "POST",
      headers: {
        ...authHeaders(secondUserToken),
        ...jsonHeader(),
      },
      body: JSON.stringify({ invitedUserUsername: username }),
    });

    assertEquals(res.status, 201);
  }
});

Deno.test("User can list their pending invites.", async () => {
  const res = await app.request("/users/3/invites", {
    headers: authHeaders(thirdUserToken),
  });

  const body = await res.json();

  assertEquals(res.status, 200);
  assertEquals(body.length, 1);
  assertEquals(body[0]["invitedUserId"], 3);
  assertEquals(body[0]["chatId"], testChatId);
  assertEquals(body[0]["invitedBy"], 2);
  assertEquals(body[0]["accepted"], null);
});

Deno.test("User can't accept another user's invite.", async () => {
  const res = await app.request(`/users/3/invites/${testChatId}/accept`, {
    method: "POST",
    headers: {
      ...authHeaders(fourthUserToken),
      ...jsonHeader(),
    },
    body: JSON.stringify({ invitedBy: 2 }),
  });

  assertEquals(res.status, 403);
});

Deno.test("Accepting an invite without invitedBy fails.", async () => {
  const res = await app.request(`/users/3/invites/${testChatId}/accept`, {
    method: "POST",
    headers: {
      ...authHeaders(thirdUserToken),
      ...jsonHeader(),
    },
    body: JSON.stringify({}),
  });

  assertEquals(res.status, 400);
});

Deno.test("Accepting an invite for a nonexistent chat fails.", async () => {
  const res = await app.request("/users/3/invites/999/accept", {
    method: "POST",
    headers: {
      ...authHeaders(thirdUserToken),
      ...jsonHeader(),
    },
    body: JSON.stringify({ invitedBy: 2 }),
  });

  assertEquals(res.status, 404);
});

Deno.test("Accepting an invite from the wrong inviter fails.", async () => {
  const res = await app.request(`/users/3/invites/${testChatId}/accept`, {
    method: "POST",
    headers: {
      ...authHeaders(thirdUserToken),
      ...jsonHeader(),
    },
    body: JSON.stringify({ invitedBy: 4 }),
  });

  assertEquals(res.status, 404);
});

Deno.test("User can accept an invite.", async () => {
  const res = await app.request(`/users/3/invites/${testChatId}/accept`, {
    method: "POST",
    headers: {
      ...authHeaders(thirdUserToken),
      ...jsonHeader(),
    },
    body: JSON.stringify({ invitedBy: 2 }),
  });

  const body = await res.json();

  assertEquals(res.status, 200);
  assertEquals(body["invitedUserId"], 3);
  assertEquals(Boolean(body["accepted"]), true);
});

Deno.test("User who accepted an invite is in the chat.", async () => {
  const res = await app.request(`/chats/${testChatId}/users`, {
    headers: authHeaders(thirdUserToken),
  });

  const body = (await res.json()) as ViewableUser[];

  const usernames = body
    .map((user) => user.username)
    .sort((a, b) => a.localeCompare(b));

  assertEquals(res.status, 200);
  assertEquals(usernames, ["testUser2", "testUser3"]);
});

Deno.test("User can't decline another user's invite.", async () => {
  const res = await app.request(`/users/4/invites/${testChatId}/decline`, {
    method: "POST",
    headers: {
      ...authHeaders(thirdUserToken),
      ...jsonHeader(),
    },
    body: JSON.stringify({ invitedBy: 2 }),
  });

  assertEquals(res.status, 403);
});

Deno.test("Declining an invite for a nonexistent chat fails.", async () => {
  const res = await app.request("/users/4/invites/999/decline", {
    method: "POST",
    headers: {
      ...authHeaders(fourthUserToken),
      ...jsonHeader(),
    },
    body: JSON.stringify({ invitedBy: 2 }),
  });

  assertEquals(res.status, 404);
});

Deno.test("User can decline an invite.", async () => {
  const res = await app.request(`/users/4/invites/${testChatId}/decline`, {
    method: "POST",
    headers: {
      ...authHeaders(fourthUserToken),
      ...jsonHeader(),
    },
    body: JSON.stringify({ invitedBy: 2 }),
  });

  const body = await res.json();

  assertEquals(res.status, 200);
  assertEquals(body["invitedUserId"], 4);
  assertEquals(Boolean(body["accepted"]), false);
});

Deno.test("User who declined an invite is not in the chat.", async () => {
  const res = await app.request(`/chats/${testChatId}/users`, {
    headers: authHeaders(fourthUserToken),
  });

  assertEquals(res.status, 403);
});

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

// ------ CHATS ------

Deno.test("Chat with a short name isn't created.", async () => {
  const res = await app.request("/chats", {
    method: "POST",
    headers: {
      ...authHeaders(firstUserToken),
      ...jsonHeader(),
    },
    body: JSON.stringify({ name: "ab" }),
  });

  assertEquals(res.status, 400);
});

Deno.test("Chat without a name isn't created.", async () => {
  const res = await app.request("/chats", {
    method: "POST",
    headers: {
      ...authHeaders(firstUserToken),
      ...jsonHeader(),
    },
    body: JSON.stringify({}),
  });

  assertEquals(res.status, 400);
});

Deno.test("User can create a chat.", async () => {
  const res = await app.request("/chats", {
    method: "POST",
    headers: {
      ...authHeaders(firstUserToken),
      ...jsonHeader(),
    },
    body: JSON.stringify({ name: "testChat" }),
  });

  const body = await res.json();

  assertEquals(res.status, 201);
  assertEquals(body["id"], 1);
  assertEquals(body["name"], "testChat");
});

Deno.test("Chat creator is the chat admin.", async () => {
  const res = await app.request("/chats/1/users", {
    headers: authHeaders(firstUserToken),
  });

  const body = await res.json();

  assertEquals(res.status, 200);
  assertEquals(body.length, 1);
  assertEquals(body[0]["username"], "testUser1");
});

Deno.test("User not in chat can't update it.", async () => {
  const res = await app.request("/chats/1", {
    method: "PUT",
    headers: {
      ...authHeaders(secondUserToken),
      ...jsonHeader(),
    },
    body: JSON.stringify({ name: "thisIsMyChatNow" }),
  });

  assertEquals(res.status, 403);
});

Deno.test("User not in chat can't delete it.", async () => {
  const res = await app.request("/chats/1", {
    method: "DELETE",
    headers: authHeaders(secondUserToken),
  });

  assertEquals(res.status, 403);
});

Deno.test("Nonexistent chat can't be updated.", async () => {
  const res = await app.request("/chats/999", {
    method: "PUT",
    headers: {
      ...authHeaders(firstUserToken),
      ...jsonHeader(),
    },
    body: JSON.stringify({ name: "doesThisExist" }),
  });

  assertEquals(res.status, 403);
});

Deno.test("Admin adds user 2 directly to the chat.", async () => {
  const res = await app.request("/chats/1/users", {
    method: "POST",
    headers: {
      ...authHeaders(firstUserToken),
      ...jsonHeader(),
    },
    body: JSON.stringify({ username: "testUser2" }),
  });

  const body = await res.json();

  assertEquals(res.status, 201);
  assertEquals(body["userId"], 2);
  assertEquals(body["chatId"], 1);
  assertEquals(Boolean(body["isAdmin"]), false);
});

Deno.test("Non admin chat member can't update the chat.", async () => {
  const res = await app.request("/chats/1", {
    method: "PUT",
    headers: {
      ...authHeaders(secondUserToken),
      ...jsonHeader(),
    },
    body: JSON.stringify({ name: "canIUpdateThis" }),
  });

  assertEquals(res.status, 403);
});

Deno.test("Non admin chat member can't delete the chat.", async () => {
  const res = await app.request("/chats/1", {
    method: "DELETE",
    headers: authHeaders(secondUserToken),
  });

  assertEquals(res.status, 403);
});

Deno.test("Admin can't update chat with a too short name.", async () => {
  const res = await app.request("/chats/1", {
    method: "PUT",
    headers: {
      ...authHeaders(firstUserToken),
      ...jsonHeader(),
    },
    body: JSON.stringify({ name: "ab" }),
  });

  assertEquals(res.status, 400);
});

Deno.test("Admin can update the chat.", async () => {
  const res = await app.request("/chats/1", {
    method: "PUT",
    headers: {
      ...authHeaders(firstUserToken),
      ...jsonHeader(),
    },
    body: JSON.stringify({ name: "renamedChat" }),
  });

  const body = await res.json();

  assertEquals(res.status, 200);
  assertEquals(body["id"], 1);
  assertEquals(body["name"], "renamedChat");
});

// ------ MESSAGES ------

Deno.test("User not in chat can't list messages.", async () => {
  const res = await app.request("/chats/1/messages", {
    headers: authHeaders(thirdUserToken),
  });

  assertEquals(res.status, 403);
});

Deno.test("Chat member gets an empty list of messages.", async () => {
  const res = await app.request("/chats/1/messages", {
    headers: authHeaders(secondUserToken),
  });

  const body = await res.json();

  assertEquals(res.status, 200);
  assertEquals(body.length, 0);
});

Deno.test("User not in chat can't create a message.", async () => {
  const res = await app.request("/chats/1/messages", {
    method: "POST",
    headers: {
      ...authHeaders(thirdUserToken),
      ...jsonHeader(),
    },
    body: JSON.stringify({ content: "Hello" }),
  });

  assertEquals(res.status, 403);
});

Deno.test("Empty message isn't created.", async () => {
  const res = await app.request("/chats/1/messages", {
    method: "POST",
    headers: {
      ...authHeaders(secondUserToken),
      ...jsonHeader(),
    },
    body: JSON.stringify({ content: "" }),
  });

  assertEquals(res.status, 400);
});

Deno.test("Too long message isn't created.", async () => {
  const res = await app.request("/chats/1/messages", {
    method: "POST",
    headers: {
      ...authHeaders(secondUserToken),
      ...jsonHeader(),
    },
    body: JSON.stringify({ content: "spam".repeat(257) }),
  });

  assertEquals(res.status, 400);
});

Deno.test("Chat member can create a message.", async () => {
  const res = await app.request("/chats/1/messages", {
    method: "POST",
    headers: {
      ...authHeaders(secondUserToken),
      ...jsonHeader(),
    },
    body: JSON.stringify({ content: "Hello from user 2" }),
  });

  const body = await res.json();

  assertEquals(res.status, 201);
  assertEquals(body["id"], 1);
  assertEquals(body["senderId"], 2);
  assertEquals(body["chatId"], 1);
  assertEquals(body["content"], "Hello from user 2");
});

Deno.test("Chat admin can create a message.", async () => {
  const res = await app.request("/chats/1/messages", {
    method: "POST",
    headers: {
      ...authHeaders(firstUserToken),
      ...jsonHeader(),
    },
    body: JSON.stringify({ content: "Hello from user 1" }),
  });

  const body = await res.json();

  assertEquals(res.status, 201);
  assertEquals(body["id"], 2);
  assertEquals(body["senderId"], 1);
});

Deno.test("Chat member can list messages.", async () => {
  const res = await app.request("/chats/1/messages", {
    headers: authHeaders(secondUserToken),
  });

  const body = await res.json();

  assertEquals(res.status, 200);
  assertEquals(body.length, 2);
});

Deno.test("User not in chat can't edit a message.", async () => {
  const res = await app.request("/chats/1/messages/1", {
    method: "PUT",
    headers: {
      ...authHeaders(thirdUserToken),
      ...jsonHeader(),
    },
    body: JSON.stringify({ content: "Edited message" }),
  });

  assertEquals(res.status, 403);
});

Deno.test("User can't edit another user's message.", async () => {
  const res = await app.request("/chats/1/messages/1", {
    method: "PUT",
    headers: {
      ...authHeaders(firstUserToken),
      ...jsonHeader(),
    },
    body: JSON.stringify({ content: "Edited by the wrong user" }),
  });

  assertEquals(res.status, 404);
});

Deno.test("User can't edit a message to be empty.", async () => {
  const res = await app.request("/chats/1/messages/1", {
    method: "PUT",
    headers: {
      ...authHeaders(secondUserToken),
      ...jsonHeader(),
    },
    body: JSON.stringify({ content: "" }),
  });

  assertEquals(res.status, 400);
});

Deno.test("User can edit their own message.", async () => {
  const res = await app.request("/chats/1/messages/1", {
    method: "PUT",
    headers: {
      ...authHeaders(secondUserToken),
      ...jsonHeader(),
    },
    body: JSON.stringify({ content: "Edited by user 2" }),
  });

  const body = await res.json();

  assertEquals(res.status, 200);
  assertEquals(body["id"], 1);
  assertEquals(body["content"], "Edited by user 2");
});

Deno.test("Nonexistent message can't be edited.", async () => {
  const res = await app.request("/chats/1/messages/999", {
    method: "PUT",
    headers: {
      ...authHeaders(secondUserToken),
      ...jsonHeader(),
    },
    body: JSON.stringify({ content: "Edited nonexistent message" }),
  });

  assertEquals(res.status, 404);
});

Deno.test("User not in chat can't delete a message.", async () => {
  const res = await app.request("/chats/1/messages/1", {
    method: "DELETE",
    headers: authHeaders(thirdUserToken),
  });

  assertEquals(res.status, 403);
});

Deno.test("User can't delete another user's message.", async () => {
  const res = await app.request("/chats/1/messages/2", {
    method: "DELETE",
    headers: authHeaders(secondUserToken),
  });

  assertEquals(res.status, 404);
});

Deno.test("Nonexistent message can't be deleted.", async () => {
  const res = await app.request("/chats/1/messages/999", {
    method: "DELETE",
    headers: authHeaders(secondUserToken),
  });

  assertEquals(res.status, 404);
});

Deno.test("User can delete their own message.", async () => {
  const res = await app.request("/chats/1/messages/1", {
    method: "DELETE",
    headers: authHeaders(secondUserToken),
  });

  assertEquals(res.status, 204);
});

Deno.test("Deleted message is no longer in chat.", async () => {
  const res = await app.request("/chats/1/messages", {
    headers: authHeaders(secondUserToken),
  });

  const body = await res.json();

  assertEquals(res.status, 200);
  assertEquals(body.length, 1);
  assertEquals(body[0]["id"], 2);
});

// ------ CHAT USERS ------

Deno.test("User not in chat can't list chat users.", async () => {
  const res = await app.request("/chats/1/users", {
    headers: authHeaders(thirdUserToken),
  });

  assertEquals(res.status, 403);
});

Deno.test("Chat member can list chat users.", async () => {
  const res = await app.request("/chats/1/users", {
    headers: authHeaders(secondUserToken),
  });

  const body = (await res.json()) as ViewableUser[];

  const usernames = body
    .map((user) => user.username)
    .sort((a, b) => a.localeCompare(b));

  assertEquals(res.status, 200);
  assertEquals(body.length, 2);
  assertEquals(usernames, ["testUser1", "testUser2"]);
});

Deno.test("Non admin user can't add another user directly.", async () => {
  const res = await app.request("/chats/1/users", {
    method: "POST",
    headers: {
      ...authHeaders(secondUserToken),
      ...jsonHeader(),
    },
    body: JSON.stringify({ username: "testUser3" }),
  });

  assertEquals(res.status, 403);
});

Deno.test("Admin can't add a nonexistent user.", async () => {
  const res = await app.request("/chats/1/users", {
    method: "POST",
    headers: {
      ...authHeaders(firstUserToken),
      ...jsonHeader(),
    },
    body: JSON.stringify({ username: "nobodyHere" }),
  });

  assertEquals(res.status, 404);
});

Deno.test("Admin can't add themselves.", async () => {
  const res = await app.request("/chats/1/users", {
    method: "POST",
    headers: {
      ...authHeaders(firstUserToken),
      ...jsonHeader(),
    },
    body: JSON.stringify({ username: "testUser1" }),
  });

  assertEquals(res.status, 400);
});

Deno.test("Admin can't add a user who is already in the chat.", async () => {
  const res = await app.request("/chats/1/users", {
    method: "POST",
    headers: {
      ...authHeaders(firstUserToken),
      ...jsonHeader(),
    },
    body: JSON.stringify({ username: "testUser2" }),
  });

  assertEquals(res.status, 400);
});

Deno.test("Adding a user without a username fails.", async () => {
  const res = await app.request("/chats/1/users", {
    method: "POST",
    headers: {
      ...authHeaders(firstUserToken),
      ...jsonHeader(),
    },
    body: JSON.stringify({}),
  });

  assertEquals(res.status, 400);
});

Deno.test("Admin can add user 3 directly.", async () => {
  const res = await app.request("/chats/1/users", {
    method: "POST",
    headers: {
      ...authHeaders(firstUserToken),
      ...jsonHeader(),
    },
    body: JSON.stringify({ username: "testUser3" }),
  });

  const body = await res.json();

  assertEquals(res.status, 201);
  assertEquals(body["userId"], 3);
  assertEquals(body["chatId"], 1);
});

Deno.test("Non admin user can't remove a user.", async () => {
  const res = await app.request("/chats/1/users/1", {
    method: "DELETE",
    headers: authHeaders(secondUserToken),
  });

  assertEquals(res.status, 403);
});

Deno.test("Admin can't remove themselves.", async () => {
  const res = await app.request("/chats/1/users/1", {
    method: "DELETE",
    headers: authHeaders(firstUserToken),
  });

  assertEquals(res.status, 400);
});

Deno.test("Admin can't remove a user who is not in the chat.", async () => {
  const res = await app.request("/chats/1/users/4", {
    method: "DELETE",
    headers: authHeaders(firstUserToken),
  });

  assertEquals(res.status, 404);
});

Deno.test("Admin can remove a user from the chat.", async () => {
  const res = await app.request("/chats/1/users/3", {
    method: "DELETE",
    headers: authHeaders(firstUserToken),
  });

  assertEquals(res.status, 204);
});

Deno.test("Removed user can no longer access the chat.", async () => {
  const res = await app.request("/chats/1/messages", {
    headers: authHeaders(thirdUserToken),
  });

  assertEquals(res.status, 403);
});

// ------ PROMOTING AND DEMOTING ------

Deno.test("Non admin user can't promote a user.", async () => {
  const res = await app.request("/chats/1/users/2", {
    method: "PUT",
    headers: {
      ...authHeaders(secondUserToken),
      ...jsonHeader(),
    },
    body: JSON.stringify({ isAdmin: true }),
  });

  assertEquals(res.status, 403);
});

Deno.test("Admin can't promote a user who is not in the chat.", async () => {
  const res = await app.request("/chats/1/users/4", {
    method: "PUT",
    headers: {
      ...authHeaders(firstUserToken),
      ...jsonHeader(),
    },
    body: JSON.stringify({ isAdmin: true }),
  });

  assertEquals(res.status, 404);
});

Deno.test("Admin can promote a chat member.", async () => {
  const res = await app.request("/chats/1/users/2", {
    method: "PUT",
    headers: {
      ...authHeaders(firstUserToken),
      ...jsonHeader(),
    },
    body: JSON.stringify({ isAdmin: true }),
  });

  const body = await res.json();

  assertEquals(res.status, 200);
  assertEquals(body["userId"], 2);
  assertEquals(Boolean(body["isAdmin"]), true);
});

Deno.test("Promoted user can update the chat.", async () => {
  const res = await app.request("/chats/1", {
    method: "PUT",
    headers: {
      ...authHeaders(secondUserToken),
      ...jsonHeader(),
    },
    body: JSON.stringify({ name: "iAmTheAdminNow" }),
  });

  const body = await res.json();

  assertEquals(res.status, 200);
  assertEquals(body["name"], "iAmTheAdminNow");
});

Deno.test("Admin can't remove another admin.", async () => {
  const res = await app.request("/chats/1/users/2", {
    method: "DELETE",
    headers: authHeaders(firstUserToken),
  });

  assertEquals(res.status, 404);
});

Deno.test("Admin can demote another admin.", async () => {
  const res = await app.request("/chats/1/users/2", {
    method: "PUT",
    headers: {
      ...authHeaders(firstUserToken),
      ...jsonHeader(),
    },
    body: JSON.stringify({ isAdmin: false }),
  });

  const body = await res.json();

  assertEquals(res.status, 200);
  assertEquals(body["userId"], 2);
  assertEquals(Boolean(body["isAdmin"]), false);
});

Deno.test("The last admin can't be demoted.", async () => {
  const res = await app.request("/chats/1/users/1", {
    method: "PUT",
    headers: {
      ...authHeaders(firstUserToken),
      ...jsonHeader(),
    },
    body: JSON.stringify({ isAdmin: false }),
  });

  assertEquals(res.status, 400);
});

// ------ INVITES ------

Deno.test("Non admin can't invite a user.", async () => {
  const res = await app.request("/chats/1/users/invites", {
    method: "POST",
    headers: {
      ...authHeaders(secondUserToken),
      ...jsonHeader(),
    },
    body: JSON.stringify({ invitedUserUsername: "testUser3" }),
  });

  assertEquals(res.status, 403);
});

Deno.test("Admin can't invite a nonexistent user.", async () => {
  const res = await app.request("/chats/1/users/invites", {
    method: "POST",
    headers: {
      ...authHeaders(firstUserToken),
      ...jsonHeader(),
    },
    body: JSON.stringify({ invitedUserUsername: "nobodyHere" }),
  });

  assertEquals(res.status, 404);
});

Deno.test("Admin can't invite themselves.", async () => {
  const res = await app.request("/chats/1/users/invites", {
    method: "POST",
    headers: {
      ...authHeaders(firstUserToken),
      ...jsonHeader(),
    },
    body: JSON.stringify({ invitedUserUsername: "testUser1" }),
  });

  assertEquals(res.status, 400);
});

Deno.test("Inviting without a username fails.", async () => {
  const res = await app.request("/chats/1/users/invites", {
    method: "POST",
    headers: {
      ...authHeaders(firstUserToken),
      ...jsonHeader(),
    },
    body: JSON.stringify({}),
  });

  assertEquals(res.status, 400);
});

Deno.test("Admin can invite a user.", async () => {
  const res = await app.request("/chats/1/users/invites", {
    method: "POST",
    headers: {
      ...authHeaders(firstUserToken),
      ...jsonHeader(),
    },
    body: JSON.stringify({ invitedUserUsername: "testUser3" }),
  });

  const body = await res.json();

  assertEquals(res.status, 201);
  assertEquals(body["invitedUserId"], 3);
  assertEquals(body["chatId"], 1);
  assertEquals(body["invitedBy"], 1);
  assertEquals(body["accepted"], null);
});

Deno.test("Admin can't invite the same user twice.", async () => {
  const res = await app.request("/chats/1/users/invites", {
    method: "POST",
    headers: {
      ...authHeaders(firstUserToken),
      ...jsonHeader(),
    },
    body: JSON.stringify({ invitedUserUsername: "testUser3" }),
  });

  assertEquals(res.status, 400);
});

// ------ BANS ------

Deno.test("Admin can't ban themselves.", async () => {
  const res = await app.request("/chats/1/bans", {
    method: "POST",
    headers: {
      ...authHeaders(firstUserToken),
      ...jsonHeader(),
    },
    body: JSON.stringify({ bannedUserId: 1 }),
  });

  assertEquals(res.status, 400);
});

Deno.test("Non admin can't ban a user.", async () => {
  const res = await app.request("/chats/1/bans", {
    method: "POST",
    headers: {
      ...authHeaders(secondUserToken),
      ...jsonHeader(),
    },
    body: JSON.stringify({ bannedUserId: 4 }),
  });

  assertEquals(res.status, 403);
});

Deno.test("Banning without a user id fails.", async () => {
  const res = await app.request("/chats/1/bans", {
    method: "POST",
    headers: {
      ...authHeaders(firstUserToken),
      ...jsonHeader(),
    },
    body: JSON.stringify({}),
  });

  assertEquals(res.status, 400);
});

Deno.test("Promote user 2 to test banning an admin.", async () => {
  const res = await app.request("/chats/1/users/2", {
    method: "PUT",
    headers: {
      ...authHeaders(firstUserToken),
      ...jsonHeader(),
    },
    body: JSON.stringify({ isAdmin: true }),
  });

  assertEquals(res.status, 200);
});

Deno.test("Admin can't ban another admin.", async () => {
  const res = await app.request("/chats/1/bans", {
    method: "POST",
    headers: {
      ...authHeaders(secondUserToken),
      ...jsonHeader(),
    },
    body: JSON.stringify({ bannedUserId: 1 }),
  });

  assertEquals(res.status, 400);
});

Deno.test("Demote user 2 back to a regular member.", async () => {
  const res = await app.request("/chats/1/users/2", {
    method: "PUT",
    headers: {
      ...authHeaders(firstUserToken),
      ...jsonHeader(),
    },
    body: JSON.stringify({ isAdmin: false }),
  });

  assertEquals(res.status, 200);
});

Deno.test("Admin can't ban a nonexistent user.", async () => {
  const res = await app.request("/chats/1/bans", {
    method: "POST",
    headers: {
      ...authHeaders(firstUserToken),
      ...jsonHeader(),
    },
    body: JSON.stringify({ bannedUserId: 999 }),
  });

  assertEquals(res.status, 400);
});

Deno.test("Admin can ban a chat member.", async () => {
  const res = await app.request("/chats/1/bans", {
    method: "POST",
    headers: {
      ...authHeaders(firstUserToken),
      ...jsonHeader(),
    },
    body: JSON.stringify({ bannedUserId: 2 }),
  });

  const body = await res.json();

  assertEquals(res.status, 201);
  assertEquals(body["bannedUserId"], 2);
  assertEquals(body["chatId"], 1);
  assertEquals(body["bannedBy"], 1);
});

Deno.test("Banned user is removed from the chat.", async () => {
  const res = await app.request("/chats/1/messages", {
    headers: authHeaders(secondUserToken),
  });

  assertEquals(res.status, 403);
});

Deno.test("Admin can't ban the same user twice.", async () => {
  const res = await app.request("/chats/1/bans", {
    method: "POST",
    headers: {
      ...authHeaders(firstUserToken),
      ...jsonHeader(),
    },
    body: JSON.stringify({ bannedUserId: 2 }),
  });

  assertEquals(res.status, 400);
});

Deno.test("Banned user can't be added directly.", async () => {
  const res = await app.request("/chats/1/users", {
    method: "POST",
    headers: {
      ...authHeaders(firstUserToken),
      ...jsonHeader(),
    },
    body: JSON.stringify({ username: "testUser2" }),
  });

  assertEquals(res.status, 400);
});

Deno.test("Banned user can't be invited.", async () => {
  const res = await app.request("/chats/1/users/invites", {
    method: "POST",
    headers: {
      ...authHeaders(firstUserToken),
      ...jsonHeader(),
    },
    body: JSON.stringify({ invitedUserUsername: "testUser2" }),
  });

  assertEquals(res.status, 400);
});

Deno.test("Admin can't unban themselves.", async () => {
  const res = await app.request("/chats/1/bans/1", {
    method: "DELETE",
    headers: authHeaders(firstUserToken),
  });

  assertEquals(res.status, 400);
});

Deno.test("User not in chat can't unban a user.", async () => {
  const res = await app.request("/chats/1/bans/2", {
    method: "DELETE",
    headers: authHeaders(fourthUserToken),
  });

  assertEquals(res.status, 403);
});

Deno.test("Admin can't unban a user who isn't banned.", async () => {
  const res = await app.request("/chats/1/bans/4", {
    method: "DELETE",
    headers: authHeaders(firstUserToken),
  });

  assertEquals(res.status, 404);
});

Deno.test("Admin can unban a user.", async () => {
  const res = await app.request("/chats/1/bans/2", {
    method: "DELETE",
    headers: authHeaders(firstUserToken),
  });

  assertEquals(res.status, 204);
});

Deno.test("Unbanned user can be added to the chat again.", async () => {
  const res = await app.request("/chats/1/users", {
    method: "POST",
    headers: {
      ...authHeaders(firstUserToken),
      ...jsonHeader(),
    },
    body: JSON.stringify({ username: "testUser2" }),
  });

  assertEquals(res.status, 201);
});

// ------ CHAT DELETION ------

Deno.test("Non admin can't delete the chat.", async () => {
  const res = await app.request("/chats/1", {
    method: "DELETE",
    headers: authHeaders(secondUserToken),
  });

  assertEquals(res.status, 403);
});

Deno.test("Admin can delete the chat.", async () => {
  const res = await app.request("/chats/1", {
    method: "DELETE",
    headers: authHeaders(firstUserToken),
  });

  assertEquals(res.status, 204);
});

Deno.test("Deleted chat's messages can't be listed.", async () => {
  const res = await app.request("/chats/1/messages", {
    headers: authHeaders(firstUserToken),
  });

  assertEquals(res.status, 403);
});

Deno.test("Deleted chat can't be deleted again.", async () => {
  const res = await app.request("/chats/1", {
    method: "DELETE",
    headers: authHeaders(firstUserToken),
  });

  assertEquals(res.status, 403);
});

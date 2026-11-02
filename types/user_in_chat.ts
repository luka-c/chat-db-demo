import z from "@zod/zod";

export const chatUserSchema = z.object({
  userId: z.number(),
  chatId: z.number(),
  isAdmin: z.boolean(),
});

export const addUserToChatSchema = z.object({
  username: z.string(),
});

export const updateChatUserSchema = chatUserSchema.pick({
  isAdmin: true,
});

export type ChatUser = z.infer<typeof chatUserSchema>;

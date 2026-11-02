import z from "@zod/zod";

export const chatSchema = z.object({
  id: z.number(),
  name: z.string().min(3).max(64),
  createdAt: z.string(),
});

export const newChatSchema = chatSchema.omit({
  id: true,
  createdAt: true,
});

export const updateChatSchema = chatSchema.pick({
  name: true,
});

export type Chat = z.infer<typeof chatSchema>;

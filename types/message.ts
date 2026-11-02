import z from "@zod/zod";

export const messageSchema = z.object({
  id: z.number(),
  senderId: z.number(),
  chatId: z.number(),
  content: z.string().min(1).max(256),
  sentAt: z.string(),
});

export const newMessageSchema = messageSchema.pick({
  content: true,
});

export const updateMessageSchema = messageSchema.pick({
  content: true,
});

export type Message = z.infer<typeof messageSchema>;

import z from "@zod/zod";

export const banSchema = z.object({
  bannedUserId: z.number(),
  chatId: z.number(),
  bannedBy: z.number(),
  bannedAt: z.string(),
});

export const createBanSchema = banSchema.pick({
  bannedUserId: true,
});

export type Ban = z.infer<typeof banSchema>;

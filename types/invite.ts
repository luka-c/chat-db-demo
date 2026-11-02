import z from "@zod/zod";

export const inviteSchema = z.object({
  invitedUserId: z.number(),
  chatId: z.number(),
  invitedBy: z.number(),
  accepted: z.boolean().nullable(),
});

export const newInviteSchema = z.object({
  invitedUserUsername: z.string(),
});

export type Invite = z.infer<typeof inviteSchema>;

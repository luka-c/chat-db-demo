import z from "@zod/zod";

export const userSchema = z.object({
  id: z.number(),
  username: z.string().min(4).max(64),
  password: z.string().min(8).max(64),
  createdAt: z.string(),
});

export const userLoginSchema = userSchema.omit({
  id: true,
  createdAt: true,
});

export const createUserSchema = userSchema.omit({
  id: true,
  createdAt: true,
});

export const updateUserSchema = userSchema.pick({ username: true });

export type User = z.infer<typeof userSchema>;

export type ViewableUser = Pick<User, "id" | "username">;

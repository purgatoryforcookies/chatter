import { z } from "zod";

export const userSchema = z.object({
  preferred_username: z.string(),
  email: z.email().optional(),
  sub: z.string(),
  iss: z.string(),
  aud: z.union([z.string(), z.array(z.string())]),
  realm_access: z.object({
  roles: z
    .array(z.string())
    .transform((roles) =>
      roles.filter((r): r is z.infer<typeof Role> => Role.safeParse(r).success)
    ),
}),
});

export type User = z.infer<typeof userSchema>;

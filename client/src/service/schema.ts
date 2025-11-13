import z from "zod";

export const userSchema = z.object({
	preferred_username: z.string(),
	email: z.email().optional(),
	sub: z.string(),
	exp: z.number().optional(),
});

export type User = z.infer<typeof userSchema>;

/**
 * This token schema is used for parsing
 * anonymous tokens minted by the server.
 */
export const tokenSchema = z.object({ token: z.string(), refreshToken: z.string() });

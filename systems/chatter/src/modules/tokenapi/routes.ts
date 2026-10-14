import { randomBytes } from "node:crypto";
import { Router } from "express";
import z from "zod";
import { NotFoundError } from "../restapi/errors.js";
import { readToken } from "../restapi/middlewares/identity.js";
import { validateRequest } from "../restapi/middlewares/validate.js";
import type { TokenAuthServicePort, TokenChatServicePort } from "./ports.js";

const tokenBodySchema = z
  .object({
    username: z.string().min(1),
  })
  .optional();

const newTokenRequestSchema = {
  body: tokenBodySchema,
};

export const createTokenRoutes = ({
  chatService,
  authService,
}: {
  chatService: TokenChatServicePort;
  authService: TokenAuthServicePort;
}): Router => {
  const router = Router();
  const roles = ["visitor"];

  router.post("/", validateRequest(newTokenRequestSchema), async (req, res) => {
    const username = tokenBodySchema.parse(req.body)?.username;
    const id = `Anonymous-${randomBytes(3).toString("hex")}`;
    const user = { sub: id, preferred_username: username || id };

    await chatService.createUser({
      id,
      username: user.preferred_username,
      type: "anonymous",
    });

    const token = await authService.createFirstPartyToken({ user, roles });
    const refreshToken = await authService.createFirstPartyRefreshToken({
      user,
      roles,
    });

    res.status(201).json({ token, refreshToken });
  });

  router.get("/refresh", async (req, res) => {
    const refresh = readToken({ header: req.headers["authorization"] });
    const verified = await authService.verifyFirstPartyRefreshToken({
      token: refresh,
    });
    const user = {
      sub: verified.sub,
      preferred_username: verified.preferred_username,
    };

    const token = await authService.createFirstPartyToken({ user, roles });
    const refreshToken = await authService.createFirstPartyRefreshToken({
      user,
      roles,
    });

    res.status(201).json({ token, refreshToken });
  });

  router.get("/me", async (req, res) => {
    const token = readToken({ header: req.headers["authorization"] });

    let sub: string;
    if (authService.isFirstPartyToken({ token })) {
      sub = (await authService.verifyFirstPartyToken({ token })).sub;
    } else {
      const claims = await authService.verify({ token });
      await chatService.createUser({
        id: claims.sub,
        username: claims.preferred_username,
        type: "normal",
      });
      sub = claims.sub;
    }

    const user = await chatService.getUser({ id: sub });
    if (!user) {
      throw new NotFoundError("User not found");
    }
    res.status(200).json(user);
  });

  return router;
};

import { randomBytes } from "crypto";
import { Router } from "express";
import z from "zod";
import { authService, chatService } from "../../main";
import { ForbiddenError, NotFoundError } from "../errors";
import { validateRequest } from "../middleware/validate";
import { User } from "../schema";

const router = Router();

const getNewTokenRequest = {
  body: z.object({
    username: z.string().optional(),
  }),
};

router.post("/", validateRequest(getNewTokenRequest), async (req, res) => {
  const username = req.body?.username;

  const newAnonymousUserId = `Anonymous-${randomBytes(3).toString("hex")}`;

  const newToken = await authService.createFirstPartyToken(
    {
      sub: newAnonymousUserId,
      preferred_username: username || newAnonymousUserId,
    },
    ["visitor"]
  );

  const newResfreshToken = await authService.createFirstPartyRefreshToken(
    {
      sub: newAnonymousUserId,
      preferred_username: username || newAnonymousUserId,
    },
    ["visitor"]
  );

  await chatService.createUser(
    newAnonymousUserId,
    username || newAnonymousUserId,
    "anonymous"
  );

  res.status(201).json({
    token: newToken,
    refreshToken: newResfreshToken,
  });
});

router.get("/refresh", async (req, res) => {
  const token = req.headers["authorization"];
  const parsedToken = z.string().optional().parse(token);

  if (!parsedToken) {
    throw new ForbiddenError("Authorization header is missing");
  }

  const user = await authService.verifyFirstPartyToken(parsedToken);

  const newToken = authService.createFirstPartyToken(user, ["visitor"]);
  const newResfreshToken = authService.createFirstPartyRefreshToken(user, [
    "visitor",
  ]);

  res.status(201).json({
    token: newToken,
    refreshToken: newResfreshToken,
  });
});

router.get("/me", async (req, res) => {
  const token = req.headers["authorization"];
  const parsedToken = z.string().optional().parse(token);

  if (!parsedToken) {
    throw new ForbiddenError("Authorization header is missing");
  }

  const tokenUser = await new Promise<User>(async (res, rej) => {
    try {
      if (!authService.isFirstPartyToken(parsedToken)) {
        const user = await authService.verify(parsedToken);

        /**
         * Registered users are created here in case they are not
         * in the chat database yet.
         */
        await chatService.createUser(user.sub, user.preferred_username);

        res(user);
        return;
      }
      const user = await authService.verifyFirstPartyToken(parsedToken);

      res(user);
    } catch (error) {
      rej(error);
    }
  });

  const user = await chatService.getUser(tokenUser.sub);
  if (!user) {
    throw new NotFoundError("User not found");
  }
  res.status(200).json(user);
});

export default router;

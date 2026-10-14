import type { RequestHandler } from "express";
import pino from "pino";
import type { AuthServicePort } from "../ports.js";
import { readToken, resolveIdentity } from "./identity.js";

const logger = pino({ name: "auth-middleware" });

declare global {
  namespace Express {
    interface Request {
      sub: string;
      username: string;
      roles: string[];
    }
  }
}

export const createRestAuth =
  ({ authService }: { authService: AuthServicePort }): RequestHandler =>
  async (req, _res, next) => {
    if (req.path === "/token" || req.path.startsWith("/token/")) {
      next();
      return;
    }
    try {
      const token = readToken({ header: req.headers["authorization"] });
      const identity = await resolveIdentity({ authService, token });
      req.sub = identity.sub;
      req.username = identity.username;
      req.roles = identity.roles;
    } catch (error) {
      logger.error(`Authentication failed. Path: ${req.url}`);
      throw error;
    }
    next();
  };

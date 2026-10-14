import pino from "pino";
import { ForbiddenError } from "../restapi/errors.js";
import {
  readToken,
  resolveIdentity,
} from "../restapi/middlewares/identity.js";
import type { CustomSocketServer, WsAuthServicePort } from "./ports.js";

const logger = pino({ name: "socket-auth" });

export const createSocketIoAuth =
  ({
    authService,
  }: {
    authService: WsAuthServicePort;
  }): Parameters<CustomSocketServer["use"]>[0] =>
  async (socket, next) => {
    try {
      const { token } = socket.handshake.auth;
      if (typeof token !== "string") {
        throw new ForbiddenError("Authorization token is missing");
      }
      const identity = await resolveIdentity({
        authService,
        token: readToken({ header: token }),
      });
      socket.data.sub = identity.sub;
      socket.data.username = identity.username;
      socket.data.roles = identity.roles;
    } catch (error) {
      logger.error(error);
      next(new ForbiddenError());
      return;
    }
    next();
  };

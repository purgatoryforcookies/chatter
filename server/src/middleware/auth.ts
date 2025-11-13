import { RequestHandler } from "express";
import z from "zod";
import { authService } from "../../main";
import { CustomSocketServer } from "../../types";
import { ForbiddenError } from "../errors";

type MiddlewareFunction = Parameters<CustomSocketServer["use"]>[0];

export const restAuth: RequestHandler = async (req, res, next) => {
  const token = req.headers["authorization"];

  const parsedToken = z.string().optional().parse(token);

  if (!parsedToken) {
    console.log(`No token provided. Path: ${req.url}`);
    throw new ForbiddenError("Authorization header is missing");
  }

  if (parsedToken) {
    if (!authService.isFirstPartyToken(parsedToken)) {
      const decodedAccessToken = await authService.verify(parsedToken);

      req.username = decodedAccessToken.preferred_username;
      req.sub = decodedAccessToken.sub;
      req.roles = decodedAccessToken.realm_access.roles;
      return next();
    } else {
      const decodedToken = await authService.verifyFirstPartyToken(parsedToken);
      req.username = decodedToken.preferred_username;
      req.sub = decodedToken.sub;
      req.roles = decodedToken.realm_access.roles;
    }
  }

  next();
};

export const socketIoAuth: MiddlewareFunction = async (socket, next) => {
  try {
    const { token } = socket.handshake.auth;

    const parsedToken = z.string().optional().parse(token);

    if (!parsedToken) {
      throw new ForbiddenError("Authorization header is missing");
    }

    if (parsedToken) {
      if (!authService.isFirstPartyToken(parsedToken)) {
        const decodedAccessToken = await authService.verify(parsedToken);

        socket.data.username = decodedAccessToken.preferred_username;
        socket.data.sub = decodedAccessToken.sub;
        socket.data.roles = decodedAccessToken.realm_access.roles;

        return next();
      } else {
        const decodedToken = await authService.verifyFirstPartyToken(
          parsedToken
        );
        socket.data.username = decodedToken.preferred_username;
        socket.data.sub = decodedToken.sub;
        socket.data.roles = decodedToken.realm_access.roles;
      }
    }
  } catch (error) {
    console.log(error);
    return next(new ForbiddenError());
  }

  next();
};

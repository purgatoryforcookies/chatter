import express from "express";
import helmet from "helmet";
import { join } from "path";
import pino from "pino";
import { exit } from "process";
import { config } from "./src/config";
import { registerDevelopmentRoutes } from "./src/dev";
import { globalErrorHandlerRest } from "./src/middleware/error";
import { globalHeaders } from "./src/middleware/globalHeaders";
import apiRouter from "./src/routers/private";
import tokenRouter from "./src/routers/token";
import { User, userSchema } from "./src/schema";
import { app, io, server } from "./src/server";
import { AuthService } from "./src/service/auth";
import { ChatService } from "./src/service/chat";
import { registerWsRoutes } from "./src/wsRouter";

const logger = pino({ name: "main" });

export const authService = new AuthService<User>({
  issuer: config.auth.issuer,
  audience: config.auth.audience,
  decodedTokenSchema: userSchema,
  minting: {
    issuer: config.jwt.issuer,
    expiry: config.jwt.expiration,
    refreshExpiry: config.jwt.refreshExp,
    secret: config.jwt.secret,
    refreshSecret: config.jwt.refreshSecret,
  },
});
export const chatService = new ChatService();

export const main = async () => {
  app.use(express.json());
  app.use(
    helmet({
      contentSecurityPolicy: false,
      xFrameOptions: false,
    })
  );
  app.use(globalHeaders);

  registerWsRoutes(io, chatService);
  app.use("/api/token", tokenRouter);
  app.use("/api", apiRouter);

  app.get("/hello", async (_req, res) => {
    if (await chatService.hasPendingMigrations()) {
      return res.status(503).end();
    }

    res.status(200).send("Hello");
  });

  if (config.isDev) {
    await registerDevelopmentRoutes(app, io);
  } else {
    app.use("/", express.static(join(__dirname, "client")));
  }

  app.use(globalErrorHandlerRest);

  return server;
};

if (require.main === module) {
  try {
    main().then(async (server) => {
      await chatService.hasPendingMigrations();
      server.listen(config.server.port);
    });
  } catch (error) {
    logger.error(error);
    exit(1);
  }
}

import { createAdapter } from "@socket.io/redis-streams-adapter";
import express from "express";
import helmet from "helmet";
import { createServer } from "http";
import Redis from "ioredis";
import { join } from "path";
import pino from "pino";
import { Server } from "socket.io";
import { config } from "./src/config";
import { registerDevelopmentRoutes } from "./src/dev";
import { globalErrorHandlerRest } from "./src/middleware/error";
import { globalHeaders } from "./src/middleware/globalHeaders";
import apiRouter from "./src/routers/private";
import tokenRouter from "./src/routers/token";
import { User, userSchema } from "./src/schema";
import { AuthService } from "./src/service/auth";
import { ChatService } from "./src/service/chat";
import { registerWsRoutes } from "./src/wsRouter";
import { CustomSocketServer } from "./types";

const logger = pino({ name: "main" });

const app = express();
const server = createServer(app);
const redisClient = new Redis({
  host: config.redis.url,
  tls: !config.isInEcs ? undefined : {},
});

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

export const io = new Server<CustomSocketServer>(server, {
  adapter: createAdapter(redisClient),
  cookie: {
    name: "x-chat",
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  },
});

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
    return res.status(503);
  }

  res.status(200).send("Hello");
});

const main = async () => {
  if (config.isDev) {
    await registerDevelopmentRoutes(app, io);
  } else {
    app.use("/", express.static(join(__dirname, "client")));
  }

  app.use(globalErrorHandlerRest);

  await chatService.hasPendingMigrations();

  server.listen(config.server.port, async () => {
    logger.info(
      `Server running in ${config.server.port}. Redis: ${redisClient.status}`
    );

    redisClient.on("ready", () => {
      logger.info(`Redis: ${redisClient.status}`);
    });
    redisClient.on("error", (error) => {
      logger.error(`Redis: ${redisClient.status}, error: ${error.message}`);
    });
  });
};
main();

import { createAdapter } from "@socket.io/redis-streams-adapter";
import express from "express";
import helmet from "helmet";
import { createServer } from "http";
import Redis from "ioredis";
import { join } from "path";
import { Server } from "socket.io";
import { config } from "./src/config";
import { socketIoAuth } from "./src/middleware/auth";
import { globalErrorHandlerRest } from "./src/middleware/error";
import apiRouter from "./src/routers/private";
import tokenRouter from "./src/routers/token";
import { User, userSchema } from "./src/schema";
import { AuthService } from "./src/service/auth";
import { ChatService } from "./src/service/chat";
import { registerWsRoutes } from "./src/wsRouter";
import { CustomSocketServer } from "./types";

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

app.use(function (_req, res, next) {
  res.header(
    "Access-Control-Allow-Origin",
    "https://key.purgatoryforcookies.com, https://chatter.purgatoryforcookies.com"
  );
  next();
});
io.use(socketIoAuth);
registerWsRoutes(io, chatService);
app.use("/api/token", tokenRouter);
app.use("/api", apiRouter);

app.get("/hello", (_req, res) => {
  res.status(200).send("Hello");
});

const main = async () => {
  if (config.isDev) {
    if (!config.server.clientProxy) {
      throw new Error(
        "Development mode needs to know where to proxy client requests! CLIENT_PROXY?"
      );
    }
    console.log(
      `PROXY: Creating proxy for client ${config.server.clientProxy}`
    );
    const { instrument } = await import("@socket.io/admin-ui");
    const { createProxyMiddleware } = await import("http-proxy-middleware");

    const middleWareProxy = createProxyMiddleware({
      target: config.server.clientProxy,
      ws: true,
      changeOrigin: true,
    });
    app.use(
      "/socketio-panel",
      express.static(
        join(__dirname, "node_modules/@socket.io/admin-ui/ui/dist")
      )
    );
    app.use("/", middleWareProxy);
    instrument(io, {
      auth: false,
    });
  } else {
    app.use("/", express.static(join(__dirname, "client")));
  }

  app.use(globalErrorHandlerRest);

  server.listen(config.server.port, async () => {
    console.log(
      `Server running in ${config.server.port}. Redis: ${redisClient.status}`
    );

    redisClient.on("ready", () => {
      console.log(`Redis: ${redisClient.status}`);
    });
    redisClient.on("error", (error) => {
      console.log(`Redis: ${redisClient.status}, error: ${error.message}`);
    });
  });
};
main();

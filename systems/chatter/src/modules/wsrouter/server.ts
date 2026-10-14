import { createAdapter } from "@socket.io/redis-streams-adapter";
import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import type { CustomSocketServer, RedisStreamsClientPort } from "./ports.js";

export const createSocketServer = ({
  httpServer,
  redisClient,
}: {
  httpServer: HttpServer;
  redisClient: RedisStreamsClientPort;
}): CustomSocketServer =>
  new Server(httpServer, {
    cookie: {
      name: "x-chat",
      path: "/",
      httpOnly: true,
      sameSite: "lax",
    },
    adapter: createAdapter(redisClient),
  });

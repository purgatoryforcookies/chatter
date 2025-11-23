import { createAdapter } from "@socket.io/redis-streams-adapter";
import express from "express";
import { createServer } from "http";
import pino from "pino";
import { Server } from "socket.io";
import { CustomSocketServer } from "../types";
import { redisClient } from "./service/redis";

const logger = pino({ name: "server" });

export const app = express();
export const server = createServer(app);

server.on("error", (err) => {
  logger.error(err);
});
server.on("close", () => {
  logger.info("Closing server...");
});
server.on("listening", () => {
  const address = server.address();
  if (typeof address === "object") {
    logger.info(
      `Server running in ${address?.port} - ${address?.address}. Redis: ${redisClient.status}`
    );
  } else {
    logger.info(`Server running in ${address}. Redis: ${redisClient.status}`);
  }
});
export const io = new Server<CustomSocketServer>(server, {
  adapter: createAdapter(redisClient),
  cookie: {
    name: "x-chat",
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  },
});

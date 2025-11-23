import express from "express";
import { join } from "path";
import pino from "pino";
import { Server } from "socket.io";
import { config } from "./config";

const logger = pino({ name: "dev-proxy" });

export const registerDevelopmentRoutes = async (
  app: express.Express,
  io: Server
) => {
  if (!config.server.clientProxy) {
    throw new Error(
      "Development mode needs to know where to proxy client requests! CLIENT_PROXY?"
    );
  }
  logger.info(`Creating proxy for client ${config.server.clientProxy}`);
  const { instrument } = await import("@socket.io/admin-ui");
  const { createProxyMiddleware } = await import("http-proxy-middleware");

  const middleWareProxy = createProxyMiddleware({
    target: config.server.clientProxy,
    ws: true,
    changeOrigin: true,
  });
  app.use(
    "/socketio-panel",
    express.static(join(__dirname, "node_modules/@socket.io/admin-ui/ui/dist"))
  );
  app.use("/", middleWareProxy);
  instrument(io, {
    auth: false,
  });
};

import express from "express";
import { createServer } from "node:http";
import { createAuthService } from "../modules/authservice/auth.js";
import { createChatService } from "../modules/chatservice/chat.js";
import { createDao } from "../modules/dao/dao.js";
import { createOidcProvider } from "../modules/oidcprovider/oidcprovider.js";
import { createRedisClient } from "../modules/redisclient/redis.js";
import { createRestAuth } from "../modules/restapi/middlewares/auth.js";
import { globalErrorHandlerRest } from "../modules/restapi/middlewares/error.js";
import { helmetMiddleware } from "../modules/restapi/middlewares/helmet.js";
import { createRestRoutes } from "../modules/restapi/routes.js";
import { createTokenRoutes } from "../modules/tokenapi/routes.js";
import { createRoomSockets } from "../modules/wsrouter/roomSockets.js";
import { createSocketServer } from "../modules/wsrouter/server.js";
import { registerWsRoutes } from "../modules/wsrouter/wsRouter.js";

export const createApp = () => {
  const dao = createDao();
  const redisClient = createRedisClient();
  const oidcProvider = createOidcProvider();
  const authService = createAuthService({ oidcProvider });
  const chatService = createChatService({ dao });

  const app = express();
  const httpServer = createServer(app);
  const io = createSocketServer({ httpServer, redisClient });
  const roomSockets = createRoomSockets({ io });

  registerWsRoutes({ io, chatService, authService });

  app.use(express.json());
  app.use(helmetMiddleware);
  app.use("/api", createRestAuth({ authService }));
  app.use("/api/token", createTokenRoutes({ chatService, authService }));
  app.use("/api", createRestRoutes({ chatService, roomSockets }));
  app.use(globalErrorHandlerRest);

  return {
    httpServer,
    close: async (): Promise<void> => {
      await io.close();
      await redisClient.quit();
      await dao.close();
    },
  };
};

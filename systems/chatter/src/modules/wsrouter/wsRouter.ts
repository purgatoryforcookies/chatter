import pino from "pino";
import z from "zod";
import { createSocketIoAuth } from "./auth.js";
import type {
  CustomSocketServer,
  WsAuthServicePort,
  WsChatServicePort,
} from "./ports.js";

const logger = pino({ name: "ws-router" });

const messageSchema = z
  .string()
  .transform((value) => value.replace(/[^\x00-\x7F]/g, ""));
const roomSchema = z.string();

export const registerWsRoutes = ({
  io,
  chatService,
  authService,
}: {
  io: CustomSocketServer;
  chatService: WsChatServicePort;
  authService: WsAuthServicePort;
}): void => {
  io.use(createSocketIoAuth({ authService }));

  io.on("connection", async (socket) => {
    logger.info(`Client ${socket.id} connected`);

    try {
      const user = await chatService.getUser({ id: socket.data.sub });
      if (!user) {
        logger.error("No user found!");
        return;
      }
      const allSockets = await io.fetchSockets();
      const users = allSockets.map((s) => s.data.sub);

      const rooms = await chatService.getAllRooms({ userId: socket.data.sub });
      await socket.join(rooms.map((row) => row.id));
      socket.emit("hello", users);
      socket.broadcast.emit("userConnected", user);
    } catch (error) {
      logger.error(error);
    }

    socket.on("message", async (room, message, ack) => {
      try {
        const content = messageSchema.parse(message);
        const roomId = roomSchema.parse(room);

        const result = await chatService.sendMessage({
          userId: socket.data.sub,
          roomId,
          content,
        });
        socket.to(result.room).emit("message", result);
        ack(result);
      } catch (error) {
        logger.error(error, `Users ${socket.data.sub} message failed`);
        ack(null, "Cannot send message");
      }
    });

    socket.on("disconnect", (reason) => {
      logger.info(`Client ${socket.data.sub} disconnected: ${reason}`);
      socket.broadcast.emit("userDisconnected", socket.data.sub);
    });
  });
};

import z from "zod";
import { CustomSocketServer } from "../types";
import { socketIoAuth } from "./middleware/auth";
import { ChatService } from "./service/chat";

export const registerWsRoutes = (
  io: CustomSocketServer,
  service: ChatService
) => {
  io.use(socketIoAuth);

  io.on("connection", async (socket) => {
    console.log(`Client ${socket.id} connected`);

    try {
      const user = await service.getUser(socket.data.sub);
      if (!user) {
        console.log("No user found!");
        return;
      }
      const allSockets = await io.fetchSockets();
      const users = allSockets.map((s) => s.data.sub);

      const rooms = await service.getAllRooms(socket.data.sub);
      await socket.join(rooms.map((row) => row.id));
      socket.emit("hello", users);
      socket.broadcast.emit("userConnected", user);
    } catch (error) {
      socket;
    }

    socket.on("message", async (room, message, ack) => {
      try {
        const parsedMessage = z
          .string()
          .transform((value) => value.replace(/[^\x00-\x7F]/g, ""))
          .parse(message);
        const parsedRoom = z.string().parse(room);

        const result = await service.sendMessage(
          socket.data.sub,
          parsedRoom,
          parsedMessage
        );
        socket.to(result.room).emit("message", result);
        ack(result);
      } catch (error) {
        console.log(`Users ${socket.data.sub} message failed`, error);
        ack(null, "Cannot send message");
      }
    });

    socket.on("disconnect", async (reason) => {
      console.log(`Client ${socket.data.sub} disconnected: ${reason}`);
      socket.broadcast.emit("userDisconnected", socket.data.sub);
    });
  });
};

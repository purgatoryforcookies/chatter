import { CustomSocketServer } from "../types";
import { ChatService } from "./service/chat";

export const registerWsRoutes = (
  io: CustomSocketServer,
  service: ChatService
) => {
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
        const result = await service.sendMessage(
          socket.data.sub,
          room,
          message
        );
        socket.to(result.room).emit("message", result);
        ack(result);
      } catch (error) {
        ack(null, "Cannot send message");
      }
    });

    socket.on("disconnect", async (reason) => {
      console.log(`Client ${socket.data.sub} disconnected: ${reason}`);
      socket.broadcast.emit("userDisconnected", socket.data.sub);
    });
  });
};

import type { RoomSocketsPort } from "../restapi/ports.js";
import type { CustomSocketServer } from "./ports.js";

export const createRoomSockets = ({
  io,
}: {
  io: CustomSocketServer;
}): RoomSocketsPort => ({
  notifyInvite: async ({ room, userIds }) => {
    const sockets = await io.fetchSockets();
    for (const socket of sockets) {
      if (userIds.includes(socket.data.sub)) {
        socket.join(room.id);
      }
    }
    io.to(room.id).emit("invite", room);
  },
  notifyRoomDeleted: ({ roomId }) => {
    io.to(roomId).emit("leaveRoom", roomId);
    io.in(roomId).socketsLeave(roomId);
  },
});

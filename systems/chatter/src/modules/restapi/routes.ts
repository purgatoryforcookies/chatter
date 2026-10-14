import { Router } from "express";
import z from "zod";
import { validateRequest } from "./middlewares/validate.js";
import type { ChatServicePort, RoomSocketsPort } from "./ports.js";

const getChatRequestSchema = {
  params: z.object({
    id: z.uuid(),
  }),
};

const deleteRoomRequestSchema = {
  params: z.object({
    id: z.string().min(1),
  }),
};

const createRoomBodySchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  participants: z.array(z.string()),
});

const createRoomRequestSchema = {
  body: createRoomBodySchema,
};

export const createRestRoutes = ({
  chatService,
  roomSockets,
}: {
  chatService: ChatServicePort;
  roomSockets: RoomSocketsPort;
}): Router => {
  const router = Router();

  router.get(
    "/chat/:id",
    validateRequest(getChatRequestSchema),
    async (req, res) => {
      const messages = await chatService.getMessages({
        userId: req.sub,
        roomId: getChatRequestSchema.params.parse(req.params).id,
      });
      res.status(200).json(messages);
    }
  );

  router.get("/user", async (_req, res) => {
    const users = await chatService.getAllUsers();
    res.status(200).json(users);
  });

  router.get("/room", async (req, res) => {
    const rooms = await chatService.getAllRooms({ userId: req.sub });
    res.status(200).json(rooms);
  });

  router.delete(
    "/room/:id",
    validateRequest(deleteRoomRequestSchema),
    async (req, res) => {
      const roomId = deleteRoomRequestSchema.params.parse(req.params).id;
      await chatService.deleteRoom({ userId: req.sub, roomId });
      roomSockets.notifyRoomDeleted({ roomId });
      res.status(200).end();
    }
  );

  router.post(
    "/room",
    validateRequest(createRoomRequestSchema),
    async (req, res) => {
      const { name, description, participants } = createRoomBodySchema.parse(
        req.body
      );
      const userId = req.sub;

      const room = await chatService.createRoom({
        userId,
        name,
        description: description ?? null,
        participants,
      });
      await roomSockets.notifyInvite({
        room,
        userIds: [userId, ...participants],
      });

      res.status(200).json(room);
    }
  );

  return router;
};

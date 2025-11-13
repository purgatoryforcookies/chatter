import { Router } from "express";
import z from "zod";
import { chatService, io } from "../../main";
import { restAuth } from "../middleware/auth";
import { validateRequest } from "../middleware/validate";

const router = Router();

router.use(restAuth);

const getChatRequestSchema = {
  params: z.object({
    id: z.string(),
  }),
};
router.get(
  "/chat/:id",
  validateRequest(getChatRequestSchema),
  async (req, res) => {
    const messages = await chatService.getMessages(req.sub, req.params.id);
    res.status(200).json(messages);
  }
);

router.get("/user", async (req, res) => {
  const messages = await chatService.getAllUsers();
  res.status(200).json(messages);
});

router.get("/room", async (req, res) => {
  const messages = await chatService.getAllRooms(req.sub);
  res.status(200).json(messages);
});

const deleteRoom = {
  params: z.object({
    id: z.string(),
  }),
};

router.delete("/room/:id", validateRequest(deleteRoom), async (req, res) => {
  const messages = await chatService.deleteRoom(req.sub, req.params.id);

  //@ts-ignore
  io.to(req.params.id).emit("leaveRoom", req.params.id);
  io.to("/").socketsLeave(req.params.id);

  res.status(200).json(messages);
});

const createRoomRequst = {
  body: z.object({
    name: z.string(),
    description: z.string().optional(),
    participants: z.array(z.string()),
  }),
};

router.post("/room", validateRequest(createRoomRequst), async (req, res) => {
  const user = req.sub;
  const { name, participants } = req.body;
  const description = req.body.description || null;

  const newRoom = await chatService.createRoom(
    user,
    name,
    description,
    participants
  );

  const allSocket = await io.fetchSockets();
  for (const socket of allSocket) {
    if ([user, ...participants].includes(socket.data.sub)) {
      socket.join(newRoom.id);
    }
  }
  //@ts-ignore
  io.to(newRoom.id).emit("invite", newRoom);

  res.status(200).json(newRoom);
});

export default router;

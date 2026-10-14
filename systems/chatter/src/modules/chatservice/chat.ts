import { readdir } from "node:fs/promises";
import { join } from "node:path";
import pino from "pino";
import type { Dao, UserType } from "../dao/dao.js";
import { ForbiddenError } from "../restapi/errors.js";

const logger = pino({ name: "chat-service" });

export const createChatService = ({ dao }: { dao: Dao }) => {
  const hasPermission = async ({
    userId,
    roomId,
  }: {
    userId: string;
    roomId: string;
  }): Promise<boolean> =>
    (await dao.isPublicRoom({ id: roomId })) ||
    dao.existsInPermissions({ userId, roomId });

  const assertAccess = async ({
    userId,
    roomId,
  }: {
    userId: string;
    roomId: string;
  }) => {
    if (!(await hasPermission({ userId, roomId }))) {
      throw new ForbiddenError();
    }
  };

  return {
    hasPermission,

    getMessages: async ({
      userId,
      roomId,
    }: {
      userId: string;
      roomId: string;
    }) => {
      await assertAccess({ userId, roomId });
      return dao.getMessages({ roomId });
    },

    getAllRooms: ({ userId }: { userId?: string }) =>
      dao.getAllRooms({ userId }),

    getRoom: async ({ userId, roomId }: { userId: string; roomId: string }) => {
      await assertAccess({ userId, roomId });
      return dao.getRoom({ id: roomId });
    },

    deleteRoom: async ({
      userId,
      roomId,
    }: {
      userId: string;
      roomId: string;
    }): Promise<void> => {
      if (!(await dao.existsInPermissions({ userId, roomId }))) {
        throw new ForbiddenError();
      }
      await dao.deleteRoom({ id: roomId });
    },

    sendMessage: async ({
      userId,
      roomId,
      content,
    }: {
      userId: string;
      roomId: string;
      content: string;
    }) => {
      await assertAccess({ userId, roomId });
      return dao.addMessage({ userId, roomId, content });
    },

    createRoom: ({
      userId,
      name,
      description,
      participants,
    }: {
      userId: string;
      name: string;
      description: string | null;
      participants: string[];
    }) => dao.createRoom({ name, description, owner: userId, participants }),

    getUser: ({ id }: { id: string }) => dao.getUser({ id }),

    getAllUsers: () => dao.getAllUsers(),

    createUser: async ({
      id,
      username,
      type = "normal",
    }: {
      id: string;
      username: string;
      type?: UserType;
    }): Promise<void> => {
      await dao.createUser({ id, username, type });
    },

    hasPendingMigrations: async (): Promise<boolean> => {
      try {
        const files = await readdir(join(process.cwd(), "migrations"));
        const inDb = await dao.getLatestMigration();
        if (!inDb) {
          throw new Error("Migration error, no rows in database");
        }
        const applied = new Set(inDb.map((row) => row.name));
        const missing = files
          .map((file) => file.replace(/\.[^.]+$/, ""))
          .filter((name) => !applied.has(name));
        if (missing.length === 0) {
          return false;
        }
        logger.info(`** ${missing.length} migrations pending:`);
        missing.forEach((name) => logger.info(`** ${name}`));
        return true;
      } catch (error) {
        logger.error(error);
        return false;
      }
    },
  };
};

export type ChatService = ReturnType<typeof createChatService>;

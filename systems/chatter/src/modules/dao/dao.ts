import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";
import pino from "pino";
import { config } from "../../config/config.js";
import type { ChatMessage, DbRoom, DbUser } from "../restapi/ports.js";

const logger = pino({ name: "dao" });

const migrationsTableName = "pgmigrations";

export type UserType = "anonymous" | "normal" | "system";

export type MigrationRow = {
  id: number;
  name: string;
  run_on: Date;
};

const readCaBundle = (): string =>
  config.daoDbTlsCert ??
  readFileSync(
    resolve(process.cwd(), "src/modules/dao/crt/eu-west-1-bundle.pem"),
    "utf8"
  );

const createPool = (): pg.Pool =>
  new pg.Pool({
    user: config.postgresUser,
    password: config.postgresDbPassword ?? config.postgresPassword,
    database: config.postgresDb,
    host: config.postgresHost,
    port: config.postgresPort,
    min: 1,
    max: 10,
    query_timeout: 4000,
    ssl: config.awsExecutionEnv ? { ca: readCaBundle() } : undefined,
  });

const messageColumns = `m.id, m.room, m.user_id, m.content, m.created,
  u.username, u.type, u.banned`;

export const createDao = ({ pool = createPool() }: { pool?: pg.Pool } = {}) => {
  const transaction = async <T>({
    cb,
  }: {
    cb: (client: pg.PoolClient) => Promise<T>;
  }): Promise<T> => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN;");
      const data = await cb(client);
      await client.query("COMMIT;");
      return data;
    } catch (error) {
      await client.query("ROLLBACK;");
      throw error;
    } finally {
      client.release();
    }
  };

  const getUser = async ({ id }: { id: string }): Promise<DbUser | null> => {
    const res = await pool.query<DbUser>(
      `SELECT id, username, type, created, banned FROM users WHERE id = $1;`,
      [id]
    );
    return res.rows[0] ?? null;
  };

  return {
    transaction,
    getUser,

    getAllUsers: async (): Promise<DbUser[]> => {
      const res = await pool.query<DbUser>(
        `SELECT id, username, type, created, banned FROM users;`
      );
      return res.rows;
    },

    createUser: async ({
      id,
      username,
      type,
    }: {
      id: string;
      username: string;
      type: UserType;
    }): Promise<DbUser> => {
      const existing = await getUser({ id });
      if (existing) {
        return existing;
      }
      const res = await pool.query<DbUser>(
        `INSERT INTO users (id, username, type)
         VALUES ($1, $2, $3)
         ON CONFLICT (id) DO UPDATE SET id = excluded.id
         RETURNING id, username, type, created, banned;`,
        [id, username, type]
      );
      const user = res.rows[0];
      if (!user) {
        throw new Error("Database did not return");
      }
      return user;
    },

    getAllRooms: async ({ userId }: { userId?: string }): Promise<DbRoom[]> => {
      const res = await pool.query<DbRoom>(
        userId
          ? `SELECT id, name, description, private, created, modified, owner
             FROM room
             WHERE private = false
             OR id IN (SELECT room FROM permission WHERE user_id = $1);`
          : `SELECT id, name, description, private, created, modified, owner
             FROM room
             WHERE private = false;`,
        userId ? [userId] : []
      );
      return res.rows;
    },

    getRoom: async ({ id }: { id: string }): Promise<DbRoom | null> => {
      const res = await pool.query<DbRoom>(
        `SELECT id, name, description, private, created, modified, owner
         FROM room WHERE id = $1;`,
        [id]
      );
      return res.rows[0] ?? null;
    },

    isPublicRoom: async ({ id }: { id: string }): Promise<boolean> => {
      const res = await pool.query<{ exists: boolean }>(
        `SELECT EXISTS (SELECT 1 FROM room WHERE id = $1 AND private = false);`,
        [id]
      );
      return res.rows[0]?.exists ?? false;
    },

    deleteRoom: async ({ id }: { id: string }): Promise<void> => {
      await pool.query(`DELETE FROM room WHERE id = $1;`, [id]);
    },

    existsInPermissions: async ({
      userId,
      roomId,
    }: {
      userId: string;
      roomId: string;
    }): Promise<boolean> => {
      const res = await pool.query<{ exists: boolean }>(
        `SELECT EXISTS (
           SELECT 1 FROM permission WHERE user_id = $1 AND room = $2
         );`,
        [userId, roomId]
      );
      return res.rows[0]?.exists ?? false;
    },

    createRoom: ({
      name,
      description,
      owner,
      participants,
    }: {
      name: string;
      description: string | null;
      owner: string;
      participants: string[];
    }): Promise<DbRoom> =>
      transaction({
        cb: async (client) => {
          const res = await client.query<DbRoom>(
            `INSERT INTO room (id, name, description, private, owner)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, name, description, private, created, modified, owner;`,
            [randomUUID(), name, description, participants.length !== 0, owner]
          );
          const room = res.rows[0];
          if (!room) {
            throw new Error("Database did not return");
          }
          for (const userId of new Set([owner, ...participants])) {
            await client.query(
              `INSERT INTO permission (room, user_id) VALUES ($1, $2);`,
              [room.id, userId]
            );
          }
          return room;
        },
      }),

    getMessages: async ({
      roomId,
    }: {
      roomId: string;
    }): Promise<ChatMessage[]> => {
      const res = await pool.query<ChatMessage>(
        `SELECT ${messageColumns}
         FROM message m
         LEFT JOIN users u ON m.user_id = u.id
         WHERE m.room = $1
         ORDER BY m.id;`,
        [roomId]
      );
      return res.rows;
    },

    addMessage: async ({
      userId,
      roomId,
      content,
    }: {
      userId: string;
      roomId: string;
      content: string;
    }): Promise<ChatMessage> => {
      const res = await pool.query<ChatMessage>(
        `WITH new_message AS (
           INSERT INTO message (user_id, room, content)
           VALUES ($1, $2, $3)
           RETURNING *
         )
         SELECT ${messageColumns}
         FROM new_message m
         LEFT JOIN users u ON m.user_id = u.id;`,
        [userId, roomId, content]
      );
      const message = res.rows[0];
      if (!message) {
        throw new Error("Database did not return");
      }
      return message;
    },

    getLatestMigration: async (): Promise<MigrationRow[] | undefined> => {
      try {
        const res = await pool.query<MigrationRow>(
          `SELECT id, name, run_on FROM ${migrationsTableName} ORDER BY run_on DESC;`
        );
        return res.rows;
      } catch (error) {
        logger.error(error);
        return undefined;
      }
    },

    close: async (): Promise<void> => {
      await pool.end();
    },
  };
};

export type Dao = ReturnType<typeof createDao>;

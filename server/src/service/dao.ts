import { randomUUID } from "crypto";
import { PoolClient } from "pg";
import { ChatMessage, DbRoom, DbUser, UserType } from "../../../types";
import { pool } from "../config";

export class Dao {
  private pool = pool;
  private migrationsTableName = "pgmigrations";

  constructor() {}

  async transaction<T>(cb: (client: PoolClient) => Promise<T>) {
    const client = await this.pool.connect();

    let data: T | undefined;

    try {
      await client.query("BEGIN;");
      data = await cb(client);
      await client.query("COMMIT;");
    } catch (error) {
      await client.query("ROLLBACK;");
      throw error;
    } finally {
      client.release();
    }

    return data;
  }

  async getAllRooms(user?: string) {
    const res = await this.pool.query<DbRoom>(
      `
      SELECT id, name, description, private, created, modified, owner
      FROM room
      WHERE private = false 
      ${
        user ? "OR id IN (SELECT room from permission WHERE user_id = $1)" : ""
      };
      `,
      user ? [user] : []
    );
    return res.rows;
  }
  async getRoom(room: string) {
    const res = await this.pool.query<DbRoom>(
      `
      SELECT id, name, description, private, created, modified, owner
      FROM room
      WHERE id = $1;`,
      [room]
    );
    return res.rows.at(0);
  }
  deleteRoom(room: string) {
    return this.pool.query<DbRoom>(`DELETE FROM room WHERE id = $1`, [room]);
  }

  async isPublicRoom(room: string) {
    const res = await this.pool.query<{ id: number }>(
      `
      SELECT id
      FROM room
      WHERE id = $1
      AND private = false;
      `,
      [room]
    );

    const data = res.rows.at(0);
    if (data) {
      return true;
    }
    return false;
  }

  async existsInPermissions(user: string, room: string) {
    const res = await this.pool.query<{ exists: boolean }>(
      `
      SELECT EXISTS( SELECT 1
      FROM permission
      WHERE user_id = $1
      AND room = $2)
      `,
      [user, room]
    );
    return res.rows.at(0)?.exists;
  }

  async getMessages(roomId: string) {
    const res = await this.pool.query<ChatMessage>(
      `
      SELECT m.id, m.room, m.user_id, m.content, m.created,
	    u.username, u.type, u.banned
      FROM message m
      LEFT JOIN users u ON m.user_id = u.id
      WHERE m.room = $1;
      `,
      [roomId]
    );
    return res.rows;
  }
  async addMessage(sub: string, room: string, message: string) {
    const res = await this.pool.query<ChatMessage>(
      `
      WITH newMessage AS (INSERT INTO message (user_id, room, content)
	      VALUES ($1, $2, $3)
	      RETURNING *)
      SELECT m.id, m.room, m.user_id, m.content, m.created,
        u.username, u.type, u.banned
      FROM newMessage m
      LEFT JOIN users u ON m.user_id = u.id
      `,
      [sub, room, message]
    );

    const data = res.rows.at(0);
    if (!data) {
      throw new Error("Database did not return");
    }
    return data;
  }

  async createRoom(
    name: string,
    description: string | null,
    owner: string,
    participants: string[]
  ) {
    const isPrivateRoom = participants.length !== 0;
    const newRoomId = randomUUID();
    const newRoom = await this.transaction(async (client) => {
      const res = await client.query<DbRoom>(
        `
      INSERT INTO room (id, name, description, private, owner)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
      `,
        [newRoomId, name, description, isPrivateRoom, owner]
      );

      const newRoom = res.rows.at(0);
      if (!newRoom) {
        throw new Error("Database did not return");
      }

      for (const user of new Set([owner, ...participants])) {
        await client.query(
          `
            INSERT INTO permission (room, user_id)
            VALUES ($1, $2);
            `,
          [newRoom.id, user]
        );
      }

      return newRoom;
    });

    return newRoom;
  }

  async getUser(sub: string) {
    const res = await this.pool.query<DbUser>(
      `
      SELECT *
      FROM users
      WHERE id = $1;
      `,
      [sub]
    );

    return res.rows.at(0);
  }
  async getAllUsers() {
    const res = await this.pool.query<DbUser>(
      `
      SELECT *
      FROM users;
      `
    );

    return res.rows;
  }

  async createUser(id: string, username: string, type: UserType) {
    const existing = await this.getUser(id);
    if (existing) {
      return existing;
    }

    const res = await this.pool.query<DbUser>(
      `
      INSERT INTO users (id, username, type)
      VALUES ($1, $2, $3)
      RETURNING *;
      `,
      [id, username, type]
    );

    const newUser = res.rows.at(0);
    if (!newUser) {
      throw new Error("Database did not return");
    }
    return newUser;
  }

  edit() {
    throw new Error("not implemented");
  }
  delete() {
    throw new Error("not implemented");
  }

  async getLatestMigration() {
    try {
      const res = await this.pool.query<{
        id: number;
        name: string;
        run_on: Date;
      }>(
        `
      SELECT id, name, run_on
      FROM ${this.migrationsTableName}
      ORDER BY run_on DESC;
      `
      );

      return res.rows;
    } catch (error) {
      console.log(error);
      return;
    }
  }
  async close() {
    await this.pool.end();
  }
}

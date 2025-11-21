import { randomUUID } from "crypto";
import { DbMessage, DbPermission, DbRoom, DbUser } from "../../../types";
import { pool } from "../../src/config";

export class TestDao {
  private pool = pool;
  constructor() {}

  async clear() {
    await this.pool.query(`
            DELETE FROM permission;
            DELETE FROM users WHERE id != 'system';
            DELETE FROM room;
            DELETE FROM message;`);
  }

  async getUsers(excludeSystem = false) {
    const query = excludeSystem
      ? "SELECT * FROM users WHERE id != 'system'"
      : "SELECT * FROM users";

    const res = await this.pool.query<DbUser>(query);
    return res.rows;
  }
  async getMessages() {
    const query = "SELECT * FROM message";

    const res = await this.pool.query<DbMessage>(query);
    return res.rows;
  }
  async getPermissions() {
    const query = "SELECT * FROM permission";

    const res = await this.pool.query<DbPermission>(query);
    return res.rows;
  }
  async getRooms() {
    const query = "SELECT * FROM room";

    const res = await this.pool.query<DbRoom>(query);
    return res.rows;
  }

  async createUser(id: string, username: string) {
    const res = await this.pool.query<DbUser>(
      `
      INSERT INTO users (id, username)
      VALUES ($1, $2)
      RETURNING *
      `,
      [id, username]
    );

    return res.rows.at(0);
  }

  async createRoom(
    name: string,
    description: string,
    _private: boolean,
    owner: string
  ) {
    const id = randomUUID();

    const res = await this.pool.query<DbRoom>(
      `
      INSERT INTO room (id, name, description, private, owner)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
      `,
      [id, name, description, _private, owner]
    );

    return res.rows.at(0);
  }
  async addPermission(room: string, user: string) {
    const res = await this.pool.query<DbPermission>(
      `
      INSERT INTO permission (room, user_id)
      VALUES ($1, $2)
      RETURNING *;
      `,
      [room, user]
    );

    return res.rows.at(0);
  }
}

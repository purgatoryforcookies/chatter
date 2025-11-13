import { pool } from "../../src/config";

export class TestDao {
  private pool = pool;
  constructor() {}

  async clear() {
    await this.pool.query(`
            DELETE FROM permission;
            DELETER FROM users;
            DELETE FROM message;`);
  }
}

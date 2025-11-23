import { readdir } from "fs/promises";
import { join } from "path";
import pino from "pino";
import { UserType } from "../../../types";
import { ForbiddenError } from "../errors";
import { Dao } from "./dao";

const logger = pino({ name: "chat-service" });

export class ChatService {
  private dao = new Dao();

  constructor() {}

  async getMessages(user: string, room: string) {
    if (await this.hasPermission(user, room)) {
      return this.dao.getMessages(room);
    }
    throw new ForbiddenError();
  }

  /**
   * Return all rooms that are either public
   * or if user is given, also private rooms user
   * has permission to.
   */
  getAllRooms(user?: string) {
    return this.dao.getAllRooms(user);
  }
  async getRoom(user: string, room: string) {
    if (await this.hasPermission(user, room)) {
      return this.dao.getRoom(room);
    }
    throw new ForbiddenError();
  }
  async deleteRoom(user: string, room: string) {
    if (await this.dao.existsInPermissions(user, room)) {
      return this.dao.deleteRoom(room);
    }
    throw new ForbiddenError();
  }

  async hasPermission(user: string, room: string) {
    if (await this.dao.isPublicRoom(room)) {
      return true;
    }
    if (await this.dao.existsInPermissions(user, room)) {
      return true;
    }
    return false;
  }

  async sendMessage(sub: string, room: string, message: string) {
    if (await this.hasPermission(sub, room)) {
      return this.dao.addMessage(sub, room, message);
    }
    throw new ForbiddenError();
  }

  createRoom(
    user: string,
    name: string,
    description: string | null,
    participants: string[]
  ) {
    return this.dao.createRoom(name, description, user, participants);
  }

  getUser(sub: string) {
    return this.dao.getUser(sub);
  }
  getAllUsers() {
    return this.dao.getAllUsers();
  }

  /**
   * Creates a new user, if the user exists then returns it without creating new one.
   */
  createUser(sub: string, username: string, type: UserType = "normal") {
    return this.dao.createUser(sub, username, type);
  }

  async hasPendingMigrations() {
    try {
      const migrations = await readdir(
        join(__dirname, "..", "..", "migrations")
      );

      const latestInDb = await this.dao.getLatestMigration();
      if (!latestInDb) {
        throw new Error("Migration error, no files in database");
      }

      if (migrations.length === latestInDb.length) {
        return false;
      }

      const withoutExtensions = migrations.map((i) => i.replace(".sql", ""));

      const missing = withoutExtensions.filter((item) =>
        latestInDb.find((i) => i.name !== item)
      );

      logger.info(`** ${missing.length} migrations pending:`);
      missing.forEach((item) => logger.info(`** ${item}.sql`));

      return true;
    } catch (error) {
      logger.error(error);
      return false;
    }
  }

  async close() {
    await this.dao.close();
  }
}

import { UserType } from "../../../types";
import { ForbiddenError } from "../errors";
import { Dao } from "./dao";

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
    if (await this.dao.hasPermission(user, room)) {
      return this.dao.deleteRoom(room);
    }
    throw new ForbiddenError();
  }

  async hasPermission(user: string, room: string) {
    if (await this.dao.isPublicRoom(room)) {
      return true;
    }
    if (await this.dao.hasPermission(user, room)) {
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
}

import assert from "node:assert";
import { UserType } from "../../types";
import { ForbiddenError } from "../src/errors";
import { ChatService } from "../src/service/chat";
import { TestDao } from "./data/dao";

describe("Chat service", () => {
  const dao = new TestDao();
  const chat = new ChatService();

  afterAll(async () => {
    await chat.close();
  });

  afterEach(async () => {
    await dao.clear();
  });

  it("Returns all public rooms", async () => {
    const newPrivateRoom = await dao.createRoom("test", "test", true, "system");
    if (!newPrivateRoom) throw new Error("Room is undefined");
    const newPublicRoom = await dao.createRoom("test", "test", false, "system");
    if (!newPublicRoom) throw new Error("Room is undefined");

    const allPublicRooms = await chat.getAllRooms();
    const allRoomsFromDao = await dao.getRooms();

    expect(allRoomsFromDao.length).toBe(2);
    expect(allPublicRooms.length).toBe(1);
  });
  it("Returns all rooms for a given user, including private ones if they have permission", async () => {
    const newPrivateRoom = await dao.createRoom("test", "test", true, "system");
    if (!newPrivateRoom) throw new Error("Room is undefined");

    await dao.addPermission(newPrivateRoom.id, "system");

    const newPublicRoom = await dao.createRoom("test", "test", false, "system");
    if (!newPublicRoom) throw new Error("Room is undefined");

    const allPublicRooms = await chat.getAllRooms("system");
    const allRoomsFromDao = await dao.getRooms();

    expect(allRoomsFromDao.length).toBe(2);
    expect(allPublicRooms.length).toBe(2);
  });
  it("Returns a single room with permission", async () => {
    const newPrivateRoom = await dao.createRoom("test", "test", true, "system");
    if (!newPrivateRoom) throw new Error("Room is undefined");

    await dao.addPermission(newPrivateRoom.id, "system");

    const newPublicRoom = await dao.createRoom("test", "test", false, "system");
    if (!newPublicRoom) throw new Error("Room is undefined");

    const room = await chat.getRoom("system", newPrivateRoom.id);
    if (!room) throw new Error("No room returned");
  });
  it("Does not return a room for user that has no permission", async () => {
    const newPrivateRoom = await dao.createRoom("test", "test", true, "system");
    if (!newPrivateRoom) throw new Error("Room is undefined");

    await dao.addPermission(newPrivateRoom.id, "system");

    const newPublicRoom = await dao.createRoom("test", "test", false, "system");
    if (!newPublicRoom) throw new Error("Room is undefined");

    try {
      await chat.getRoom("user1", newPrivateRoom.id);
      expect(true).toBe(false);
    } catch (error) {
      assert(error instanceof ForbiddenError);
    }
  });
  it("Answers correctly to has permission to public room", async () => {
    const newroom = await dao.createRoom("test", "test", false, "system");
    if (!newroom) throw new Error("Room is undefined");

    const is = await chat.hasPermission("system", newroom.id);

    expect(is).toBe(true);
  });

  it("Answers correctly to has permission to private room", async () => {
    const newroom = await dao.createRoom("test", "test", true, "system");
    if (!newroom) throw new Error("Room is undefined");

    /**
     * No permission yet
     */
    const is = await chat.hasPermission("system", newroom.id);

    expect(is).toBe(false);

    /**
     * With permission to specific room
     */
    await dao.addPermission(newroom.id, "system");
    const isToPrivate = await chat.hasPermission("system", newroom.id);

    expect(isToPrivate).toBe(true);
  });

  it("Fails to send message to private room without permission", async () => {
    const newroom = await dao.createRoom("test", "test", true, "system");
    if (!newroom) throw new Error("Room is undefined");

    try {
      await chat.sendMessage("system", newroom?.id, "hello");
      expect(true).toBe(false);
    } catch (error) {
      assert(error instanceof ForbiddenError);
    }
  });
  it("Succeeds to send a message to a private room", async () => {
    const newroom = await dao.createRoom("test", "test", true, "system");
    if (!newroom) throw new Error("Room is undefined");
    await dao.addPermission(newroom.id, "system");

    await chat.sendMessage("system", newroom.id, "hello");

    const allMessages = await dao.getMessages();

    expect(allMessages[0].user_id).toBe("system");
    expect(allMessages[0].content).toBe("hello");
    expect(allMessages[0].room).toBe(newroom.id);
  });
  it("Sends message to a public room", async () => {
    const newroom = await dao.createRoom("test", "test", false, "system");
    if (!newroom) throw new Error("Room is undefined");

    await chat.sendMessage("system", newroom.id, "hello");

    const allMessages = await dao.getMessages();

    expect(allMessages[0].user_id).toBe("system");
    expect(allMessages[0].content).toBe("hello");
    expect(allMessages[0].room).toBe(newroom.id);
  });
  it("Return messages in a public room", async () => {
    await dao.createUser("user1", "username1");
    const newRoom = await dao.createRoom("public", "desc", false, "system");
    if (!newRoom) throw new Error("New room is undefined");

    await chat.sendMessage("system", newRoom.id, "hello");

    const messages = await chat.getMessages("user1", newRoom?.id);
    expect(messages.length).toBe(1);
  });
  it("Returns messages in private froom", async () => {
    await dao.createUser("user1", "username1");
    const newRoom = await dao.createRoom("public", "desc", true, "system");
    if (!newRoom) throw new Error("New room is undefined");
    await dao.addPermission(newRoom.id, "user1");

    await chat.sendMessage("user1", newRoom.id, "hello");

    const messages = await chat.getMessages("user1", newRoom?.id);
    expect(messages.length).toBe(1);
  });
  it("Does not return messages in a private room without permissions", async () => {
    await dao.createUser("user1", "username1");
    const newRoom = await dao.createRoom("public", "desc", true, "system");
    if (!newRoom) throw new Error("New room is undefined");

    try {
      await chat.getMessages("user1", newRoom?.id);
      expect(true).toBe(false);
    } catch (error) {
      assert(error instanceof ForbiddenError);
    }
  });
  it("Creates a private room and permissions for 2 participants", async () => {
    await dao.createUser("user1", "username1");
    const newRoom = await chat.createRoom("system", "test", "description", [
      "system",
      "user1",
    ]);

    const allrooms = await dao.getRooms();
    const permissions = await dao.getPermissions();

    expect(allrooms[0].owner).toBe("system");
    expect(allrooms[0].description).toBe("description");
    expect(allrooms[0].private).toBe(true);
    expect(allrooms[0].name).toBe("test");

    expect(permissions.length).toBe(2);

    expect(permissions.map((i) => i.room)).toContain(newRoom.id);

    const usersInPermissions = permissions.map((i) => i.user_id);
    expect(usersInPermissions).toContain("user1");
    expect(usersInPermissions).toContain("system");
  });
  it("Creates a room and permissions for all participants ", async () => {
    await dao.createUser("user1", "username1");
    await dao.createUser("user2", "username2");
    await dao.createUser("user3", "username3");
    const newRoom = await chat.createRoom("system", "test", "description", [
      "system",
      "user1",
      "user2",
      "user3",
    ]);

    const allrooms = await dao.getRooms();
    const permissions = await dao.getPermissions();

    expect(allrooms[0].owner).toBe("system");
    expect(allrooms[0].description).toBe("description");
    expect(allrooms[0].private).toBe(true);
    expect(allrooms[0].name).toBe("test");

    expect(permissions.length).toBe(4);

    expect(permissions.map((i) => i.room)).toContain(newRoom.id);

    const usersInPermissions = permissions.map((i) => i.user_id);
    expect(usersInPermissions).toContain("system");
    expect(usersInPermissions).toContain("user1");
    expect(usersInPermissions).toContain("user2");
    expect(usersInPermissions).toContain("user3");
  });
  it("Returns a single user", async () => {
    await chat.createUser("test-sub1", "test1", "normal");

    const user = await chat.getUser("test-sub1");
    if (!user) throw new Error("User is undefined");
    expect(user.id).toEqual("test-sub1");
  });
  it("Returns all users", async () => {
    const users = await chat.getAllUsers();

    const usersFromTest = await dao.getUsers();

    expect(users.length).toBe(usersFromTest.length);

    users.forEach((u) => {
      expect(usersFromTest.map((i) => i.id)).toContain(u.id);
    });
  });
  it("Creates users", async () => {
    const userTypes: UserType[] = ["normal", "anonymous"];

    for (const type of userTypes) {
      await chat.createUser("test-sub1", "test1", type);

      const users = await dao.getUsers(true);

      expect(users.length).toBe(1);

      expect(users[0].banned).toBe(null);
      expect(users[0].id).toBe("test-sub1");
      expect(users[0].username).toBe("test1");
      expect(users[0].type).toBe(type);

      await dao.clear();
    }
  });
  it("Does not allow to delete a room if no permission for it exist", async () => {
    await dao.createUser("user1", "username1");
    const newRoom = await chat.createRoom("system", "test", "description", []);

    try {
      await chat.deleteRoom("user1", newRoom.id);
      expect(true).toBe(false);
    } catch (error) {
      assert(error instanceof ForbiddenError);
    }
  });
  it("Allows to delete a room with permissions", async () => {
    await dao.createUser("user1", "username1");
    const newRoom = await chat.createRoom("system", "test", "description", []);

    await dao.addPermission(newRoom.id, "user1");

    await chat.deleteRoom("user1", newRoom.id);

    const allrooms = await dao.getRooms();
    expect(allrooms.length).toBe(0);
  });
});

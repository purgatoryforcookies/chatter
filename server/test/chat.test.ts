import { TestDao } from "./data/dao";

describe("Chat service", () => {
  const USER_WITH_PERMISSIONS = "";
  const USER_WITHOUT_PERMISSION = "";
  const dao = new TestDao();

  beforeEach(async () => {});

  afterEach(async () => {
    await dao.clear();
  });

  it("Returns all public rooms", async () => {});
  it("Returns all rooms for a given user, including private ones", async () => {});
  it("Answers correctly for a public room", async () => {});
  it("Answers correctly for a private room for user that has permission", async () => {});
  it("Sends message to a private room", async () => {});
  it("Sends message to a public room", async () => {});
  it("Creates a room and permissions for all participants ", async () => {});
  it("Creates a room and permissions for all participants ", async () => {});
  it("Returns an user", async () => {});
  it("Returns all users", async () => {});
  it("Creates an user", async () => {});
});

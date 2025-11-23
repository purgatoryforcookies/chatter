import { Server } from "http";
import z from "zod";
import { DbRoom, DbUser } from "../../types";
import { authService, chatService, main } from "../main";
import { config } from "../src/config";
import { io } from "../src/server";
import { TestDao } from "./data/dao";

describe("Routes", () => {
  let server: Server | undefined;
  const chat = chatService;
  const auth = authService;
  const dao = new TestDao();
  const toSocketSpy = jest.spyOn(io, "to");

  beforeAll(async () => {
    server = await main();
    server.listen(1234);
  });

  afterAll(() => {
    if (server) {
      server.close();
    }
  });

  it("Has created a server and is listening", async () => {
    expect(server).toBeDefined();

    expect(server?.listening).toBe(true);
  });

  describe("/health", () => {
    it("Responds to health endpoint based on migration status", async () => {
      const res = await fetch("http://localhost:1234/hello");
      expect(res.status).toBe(200);

      jest
        .spyOn(chat, "hasPendingMigrations")
        .mockImplementationOnce(() => Promise.resolve(true));

      const resUnhealthy = await fetch("http://localhost:1234/hello");
      expect(resUnhealthy.status).toBe(503);
    });

    it("Returns global headers from middleware", async () => {
      const res = await fetch("http://localhost:1234/hello");
      expect(res.status).toBe(200);

      const header = res.headers.get("access-control-allow-origin");

      expect(header).not.toBe("*");
    });
  });

  describe("Token endpoints", () => {
    afterEach(async () => {
      await dao.clear();
    });
    it("Anonymous access is granted when username is omitted, a random username is given", async () => {
      const res = await fetch("http://localhost:1234/api/token", {
        method: "POST",
      });
      expect(res.status).toBe(201);
      const body = await res.json();
      const parsed = z
        .object({ token: z.string(), refreshToken: z.string() })
        .parse(body);

      const decoded = await auth.verifyFirstPartyToken(parsed.token);
      await auth.verifyFirstPartyRefreshToken(parsed.refreshToken);

      const usersInDb = await dao.getUsers();
      const createdInDb = usersInDb.find((i) => i.id === decoded.sub);
      expect(createdInDb?.id).toBe(decoded.sub);
      expect(decoded.aud).toBe(config.auth.audience);
      expect(decoded.iss).toBe(config.jwt.issuer);
      expect(decoded.preferred_username).toBeDefined();
      expect(decoded.realm_access.roles).toContain("visitor");
    });
    it("Anonymous access is granted when username is given", async () => {
      const res = await fetch("http://localhost:1234/api/token", {
        method: "POST",
        body: JSON.stringify({ username: "hello" }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      expect(res.status).toBe(201);
      const body = await res.json();
      const parsed = z
        .object({ token: z.string(), refreshToken: z.string() })
        .parse(body);

      const decoded = await auth.verifyFirstPartyToken(parsed.token);

      const usersInDb = await dao.getUsers();
      const createdInDb = usersInDb.find((i) => i.id === decoded.sub);
      expect(createdInDb?.id).toBe(decoded.sub);
      expect(createdInDb?.username).toBe("hello");
      expect(decoded.aud).toBe(config.auth.audience);
      expect(decoded.iss).toBe(config.jwt.issuer);
      expect(decoded.preferred_username).toBe("hello");
      expect(decoded.realm_access.roles).toContain("visitor");
    });
    it("Has validations in place", async () => {
      const res1 = await fetch("http://localhost:1234/api/token", {
        method: "POST",
        body: JSON.stringify({ username: 1 }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      expect(res1.status).toBe(400);
    });

    it("Refreshes a token", async () => {
      const res = await fetch("http://localhost:1234/api/token", {
        method: "POST",
      });
      expect(res.status).toBe(201);
      const body = await res.json();
      const parsed = z
        .object({ token: z.string(), refreshToken: z.string() })
        .parse(body);

      const refresh = await fetch("http://localhost:1234/api/token/refresh", {
        headers: {
          authorization: `Bearer ${parsed.refreshToken}`,
        },
      });
      expect(refresh.status).toBe(201);
      const body2 = await refresh.json();
      const parsed2 = z
        .object({ token: z.string(), refreshToken: z.string() })
        .parse(body2);

      await auth.verifyFirstPartyToken(parsed2.token);
      await auth.verifyFirstPartyRefreshToken(parsed2.refreshToken);
    });
    it("Returns me info from access token and verifies user was created, first party", async () => {
      const res = await fetch("http://localhost:1234/api/token", {
        method: "POST",
      });
      expect(res.status).toBe(201);
      const body = await res.json();
      const parsed = z
        .object({ token: z.string(), refreshToken: z.string() })
        .parse(body);

      /**
       * Needs to use access token, not refresh token
       */
      const faulty = await fetch("http://localhost:1234/api/token/me", {
        headers: {
          authorization: `Bearer ${parsed.refreshToken}`,
        },
      });
      expect(faulty.status).toBe(403);

      const me = await fetch("http://localhost:1234/api/token/me", {
        headers: {
          authorization: `Bearer ${parsed.token}`,
        },
      });
      expect(me.status).toBe(200);

      const meBody = (await me.json()) as DbUser;

      const allUsers = await dao.getUsers();
      const newlyCreated = allUsers.find((i) => i.id === meBody.id);
      expect(newlyCreated).toBeDefined();
    });
  });

  describe("Private endpoints", () => {
    let token: string | undefined;
    let publicRoom: string | undefined;

    beforeEach(async () => {
      const res = await fetch("http://localhost:1234/api/token", {
        method: "POST",
      });
      expect(res.status).toBe(201);
      const body = await res.json();
      const parsed = z
        .object({ token: z.string(), refreshToken: z.string() })
        .parse(body);
      token = parsed.token;

      const newRoom = await dao.createRoom("hello", "desc", false, "system");
      publicRoom = newRoom?.id;
    });
    afterEach(async () => {
      await dao.clear();
    });

    it("/api/chat", async () => {
      const faulty1 = await fetch(
        "http://localhost:1234/api/chat/" + publicRoom,
        {
          headers: {
            authorization: `Bearer ${token}+1`,
          },
        }
      );
      expect(faulty1.status).toBe(403);
      const faulty2 = await fetch(
        "http://localhost:1234/api/chat/" + publicRoom
      );
      expect(faulty2.status).toBe(403);
      const good = await fetch("http://localhost:1234/api/chat/" + publicRoom, {
        headers: {
          authorization: `Bearer ${token}`,
        },
      });
      expect(good.status).toBe(200);
    });

    it("/api/user", async () => {
      const faulty1 = await fetch("http://localhost:1234/api/user", {
        headers: {
          authorization: `Bearer ${token}+1`,
        },
      });
      expect(faulty1.status).toBe(403);
      const faulty2 = await fetch("http://localhost:1234/api/user");
      expect(faulty2.status).toBe(403);
      const good = await fetch("http://localhost:1234/api/user", {
        headers: {
          authorization: `Bearer ${token}`,
        },
      });
      expect(good.status).toBe(200);
    });

    it("GET /api/room", async () => {
      const faulty1 = await fetch("http://localhost:1234/api/room", {
        headers: {
          authorization: `Bearer ${token}+1`,
        },
      });
      expect(faulty1.status).toBe(403);
      const faulty2 = await fetch("http://localhost:1234/api/room");
      expect(faulty2.status).toBe(403);
      const good = await fetch("http://localhost:1234/api/room", {
        headers: {
          authorization: `Bearer ${token}`,
        },
      });
      expect(good.status).toBe(200);
    });
    it("DELETE /api/room", async () => {
      if (!token || !publicRoom) throw new Error("token/room is undefined");
      const decoded = await auth.verifyFirstPartyToken(token);
      await dao.addPermission(publicRoom, decoded.sub);

      const faulty1 = await fetch("http://localhost:1234/api/room", {
        method: "DELETE",
        headers: {
          authorization: `Bearer ${token}+1`,
        },
      });
      expect(faulty1.status).toBe(403);
      const faulty2 = await fetch("http://localhost:1234/api/room", {
        method: "DELETE",
      });
      expect(faulty2.status).toBe(403);
      const good = await fetch("http://localhost:1234/api/room/" + publicRoom, {
        method: "DELETE",
        headers: {
          authorization: `Bearer ${token}`,
        },
      });
      expect(good.status).toBe(200);
    });

    it("POST api/room", async () => {
      const faulty1 = await fetch("http://localhost:1234/api/room", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}+1`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "test",
          description: "tsst",
          participants: [],
        }),
      });
      expect(faulty1.status).toBe(403);
      const faulty2 = await fetch("http://localhost:1234/api/room", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "test",
          description: "tsst",
          participants: [],
        }),
      });
      expect(faulty2.status).toBe(403);
      const good = await fetch("http://localhost:1234/api/room/", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "test",
          description: "tsst",
          participants: [],
        }),
      });
      expect(good.status).toBe(200);
    });

    it("Invites users into room after POST /api/room", async () => {
      const good = await fetch("http://localhost:1234/api/room/", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "test",
          description: "tsst",
          participants: [],
        }),
      });
      expect(good.status).toBe(200);
      const body = (await good.json()) as DbRoom;

      expect(toSocketSpy).toHaveBeenCalledWith(body.id);
    });
  });
});

import type { createAdapter } from "@socket.io/redis-streams-adapter";
import type { Server } from "socket.io";
import type {
  AuthServicePort,
  ChatMessage,
  DbRoom,
  DbUser,
} from "../restapi/ports.js";

export type ServerToClientEvents = {
  userConnected: (user: DbUser) => void;
  userDisconnected: (userId: string) => void;
  message: (message: ChatMessage) => void;
  hello: (userIds: string[]) => void;
  invite: (room: DbRoom) => void;
  leaveRoom: (roomId: string) => void;
};

export type ClientToServerEvents = {
  message: (
    room: string,
    message: string,
    ack: (message: ChatMessage | null, error?: string) => void
  ) => void;
};

export type SocketData = {
  sub: string;
  username: string;
  roles: string[];
};

export type CustomSocketServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

export type WsChatServicePort = {
  getUser(params: { id: string }): Promise<DbUser | null>;
  getAllRooms(params: { userId: string }): Promise<DbRoom[]>;
  sendMessage(params: {
    userId: string;
    roomId: string;
    content: string;
  }): Promise<ChatMessage>;
};

export type WsAuthServicePort = AuthServicePort;

export type RedisStreamsClientPort = Parameters<typeof createAdapter>[0];

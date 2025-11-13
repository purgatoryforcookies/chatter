import { Server } from "socket.io";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
  UserRole,
} from "../types";

export interface InterServerEvents {}

export type CustomSocketServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

declare global {
  namespace Express {
    interface Request {
      username: string;
      sub: string;
      roles: UserRole[];
    }
  }
}

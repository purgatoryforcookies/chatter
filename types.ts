export interface ServerToClientEvents {
  userConnected: (user: DbUser) => void;
  userDisconnected: (userId: string) => void;
  message: (message: ChatMessage) => void;
  hello: (connectedUsers: string[]) => void;
  invite: (room: DbRoom) => void;
  leaveRoom: (id: string) => void;
}

export interface ClientToServerEvents {
  hello: () => void;
  message: (
    room: string,
    message: string,
    cb: (message: ChatMessage | null, error?: string) => void
  ) => void;
}

export interface SocketData {
  username: string;
  sub: string;
  roles: UserRole[];
}

export type UserType = "normal" | "anonymous" | "system";
export type UserRole = "user" | "visitor" | "admin" | "default-roles-chat";

export type DbRoom = {
  id: string;
  name: string;
  description: string | null;
  private: boolean;
  created: Date;
  modified: Date;
  owner: string;
};

export type DbMessage = {
  id: number;
  room: string;
  user_id: string;
  content: string;
  created: Date;
};

export type ChatMessage = DbMessage &
  Pick<DbUser, "banned" | "type" | "username">;

export type DbUser = {
  id: string;
  username: string;
  type: string;
  created: Date;
  banned: Date | null;
};

export type DbPermission = {
  id: number;
  room: string;
  user_id: string;
  created: Date;
};

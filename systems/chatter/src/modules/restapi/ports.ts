export type DbUser = {
  id: string;
  username: string;
  type: string;
  created: string | Date;
  banned: boolean;
};

export type DbRoom = {
  id: string;
  name: string;
  description: string | null;
  private: boolean;
  created: string | Date;
  modified: string | Date;
  owner: string;
};

export type ChatMessage = {
  id: string;
  room: string;
  user_id: string;
  content: string;
  created: string | Date;
  username: string;
  type: string;
  banned: boolean;
};

export type TokenClaims = {
  sub: string;
  preferred_username: string;
  realm_access: { roles: string[] };
};

export type ChatServicePort = {
  getMessages(params: { userId: string; roomId: string }): Promise<ChatMessage[]>;
  getAllUsers(): Promise<DbUser[]>;
  getAllRooms(params: { userId: string }): Promise<DbRoom[]>;
  createRoom(params: {
    userId: string;
    name: string;
    description: string | null;
    participants: string[];
  }): Promise<DbRoom>;
  deleteRoom(params: { userId: string; roomId: string }): Promise<void>;
};

export type AuthServicePort = {
  isFirstPartyToken(params: { token: string }): boolean;
  verify(params: { token: string }): Promise<TokenClaims>;
  verifyFirstPartyToken(params: { token: string }): Promise<TokenClaims>;
};

export type RoomSocketsPort = {
  notifyInvite(params: { room: DbRoom; userIds: string[] }): Promise<void>;
  notifyRoomDeleted(params: { roomId: string }): void;
};

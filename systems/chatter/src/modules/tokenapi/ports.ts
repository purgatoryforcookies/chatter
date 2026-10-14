import type { DbUser, TokenClaims } from "../restapi/ports.js";

export type TokenUser = {
  sub: string;
  preferred_username: string;
};

export type TokenChatServicePort = {
  createUser(params: {
    id: string;
    username: string;
    type: "anonymous" | "normal";
  }): Promise<void>;
  getUser(params: { id: string }): Promise<DbUser | null>;
};

export type TokenAuthServicePort = {
  isFirstPartyToken(params: { token: string }): boolean;
  verify(params: { token: string }): Promise<TokenClaims>;
  verifyFirstPartyToken(params: { token: string }): Promise<TokenClaims>;
  verifyFirstPartyRefreshToken(params: { token: string }): Promise<TokenUser>;
  createFirstPartyToken(params: {
    user: TokenUser;
    roles: string[];
  }): Promise<string>;
  createFirstPartyRefreshToken(params: {
    user: TokenUser;
    roles: string[];
  }): Promise<string>;
};

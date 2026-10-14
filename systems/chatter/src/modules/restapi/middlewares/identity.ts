import { ForbiddenError } from "../errors.js";
import type { AuthServicePort } from "../ports.js";

export type Identity = {
  sub: string;
  username: string;
  roles: string[];
};

export const readToken = ({
  header,
}: {
  header: string | undefined;
}): string => {
  const token = header?.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    throw new ForbiddenError("Authorization header is missing");
  }
  return token;
};

export const resolveIdentity = async ({
  authService,
  token,
}: {
  authService: AuthServicePort;
  token: string;
}): Promise<Identity> => {
  const claims = authService.isFirstPartyToken({ token })
    ? await authService.verifyFirstPartyToken({ token })
    : await authService.verify({ token });
  return {
    sub: claims.sub,
    username: claims.preferred_username,
    roles: claims.realm_access.roles,
  };
};

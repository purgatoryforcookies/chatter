import * as jose from "jose";
import pino from "pino";
import z from "zod";
import { config } from "../../config/config.js";
import type { OidcProvider } from "../oidcprovider/oidcprovider.js";
import { ForbiddenError } from "../restapi/errors.js";
import type { TokenClaims } from "../restapi/ports.js";
import type { TokenUser } from "../tokenapi/ports.js";

const logger = pino({ name: "auth-service" });

const allowedRoles = ["user", "visitor", "admin"];

const userSchema = z.object({
  preferred_username: z.string(),
  email: z.string().optional(),
  sub: z.string(),
  iss: z.string(),
  aud: z.union([z.string(), z.array(z.string())]),
  realm_access: z.object({
    roles: z
      .array(z.string())
      .transform((roles) => roles.filter((r) => allowedRoles.includes(r))),
  }),
});

export const createAuthService = ({
  oidcProvider,
}: {
  oidcProvider: OidcProvider;
}) => {
  let jwks: ReturnType<typeof jose.createRemoteJWKSet> | null = null;

  const init = async () => {
    logger.info("Initializing auth service");
    const uri = await oidcProvider.getJwksUri();
    jwks = jose.createRemoteJWKSet(new URL(uri), {
      cooldownDuration: 1200000,
      timeoutDuration: oidcProvider.timeout,
    });
    return jwks;
  };

  const verifyBase = async ({
    token,
    secret,
  }: {
    token: string;
    secret: string;
  }) => {
    const { payload } = await jose.jwtVerify(
      token,
      new TextEncoder().encode(secret),
      { audience: config.authAudience, issuer: config.jwtIssuer }
    );
    return userSchema.parse(payload);
  };

  const createBase = ({
    user,
    roles,
    secret,
    expiry,
  }: {
    user: TokenUser;
    roles: string[];
    secret: string;
    expiry: string;
  }): Promise<string> =>
    new jose.SignJWT({
      sub: user.sub,
      preferred_username: user.preferred_username,
      realm_access: { roles },
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime(expiry)
      .setIssuer(config.jwtIssuer)
      .setAudience(config.authAudience)
      .sign(new TextEncoder().encode(secret));

  const createFirstPartyToken = ({
    user,
    roles,
  }: {
    user: TokenUser;
    roles: string[];
  }) => createBase({ user, roles, secret: config.jwtSecret, expiry: config.jwtExp });

  const createFirstPartyRefreshToken = ({
    user,
    roles,
  }: {
    user: TokenUser;
    roles: string[];
  }) =>
    createBase({
      user,
      roles,
      secret: config.jwtSecretRefresh,
      expiry: config.jwtExpRefresh,
    });

  return {
    verify: async ({ token }: { token: string }): Promise<TokenClaims> => {
      const keys = jwks ?? (await init());
      const { payload } = await jose.jwtVerify(token, keys, {
        issuer: config.authIssuerUri,
        audience: config.authAudience,
      });
      return userSchema.parse(payload);
    },

    isFirstPartyToken: ({ token }: { token: string }): boolean => {
      const { iss } = jose.decodeJwt(token);
      if (!iss) {
        throw new ForbiddenError("Token is missing issuer");
      }
      return iss === config.jwtIssuer;
    },

    verifyFirstPartyToken: ({
      token,
    }: {
      token: string;
    }): Promise<TokenClaims> =>
      verifyBase({ token, secret: config.jwtSecret }),

    verifyFirstPartyRefreshToken: ({
      token,
    }: {
      token: string;
    }): Promise<TokenUser> =>
      verifyBase({ token, secret: config.jwtSecretRefresh }),

    createFirstPartyToken,
    createFirstPartyRefreshToken,

    mintAnonymousTokens: async ({
      user,
    }: {
      user: TokenUser;
    }): Promise<{ token: string; refreshToken: string }> => {
      const roles = ["visitor"];
      return {
        token: await createFirstPartyToken({ user, roles }),
        refreshToken: await createFirstPartyRefreshToken({ user, roles }),
      };
    },
  };
};

export type AuthService = ReturnType<typeof createAuthService>;

import * as jose from "jose";
import pino from "pino";
import z from "zod";
import { UserRole } from "../../../types";
import { ForbiddenError } from "../errors";
import { User } from "../schema";

const logger = pino({ name: "auth-service" });

export type AuthConfig<T> = {
  issuer: string;
  audience: string;
  decodedTokenSchema: z.ZodType<T>;
  minting: {
    issuer: string;
    secret: string;
    refreshSecret: string;
    expiry: string;
    refreshExpiry: string;
  };
};

type UserForMinting = Pick<User, "sub" | "preferred_username">;

export class AuthService<T extends User> {
  private config: AuthConfig<T>;
  private jwksUri: string | null = null;
  private jwks: ReturnType<typeof jose.createRemoteJWKSet> | null = null;

  constructor(config: AuthConfig<T>) {
    this.config = config;
  }

  /**
   * Initializes the service by fetching public key
   * information from 3rd party auth provider.
   */
  async init() {
    logger.info("Initializing auth service");
    const { issuer } = this.config;

    const configEndpoint: string[] = [issuer];
    if (!issuer.endsWith("/")) {
      configEndpoint.push("/");
    }
    configEndpoint.push(".well-known/openid-configuration");

    try {
      const response = await fetch(configEndpoint.join(""));
      const config = await response.json();

      const parsed = z.object({ jwks_uri: z.string() }).parse(config);

      this.jwksUri = parsed.jwks_uri;

      this.jwks = jose.createRemoteJWKSet(new URL(this.jwksUri), {
        cooldownDuration: 1200000,
      });
    } catch (error) {
      logger.error(error);
    }
  }
  /**
   * Verifies a token and decodes it.
   * Inteded to use with 3rd party issued tokens.
   */
  async verify(headerToken: string) {
    if (!this.jwks) {
      logger.info("Auth service not initialized for verify");
      await this.init();
    }
    if (!this.jwks) {
      throw new Error("Server is misconfigured");
    }

    const plainToken = headerToken.replace(/^Bearer /, "");

    const { payload } = await jose.jwtVerify(plainToken, this.jwks, {
      issuer: this.config.issuer,
      audience: this.config.audience,
    });

    const parsed = this.config.decodedTokenSchema.parse(payload);

    return parsed;
  }
  /**
   * Decodes any token **without** verifying
   * its legitimacy.
   *
   * Useful for when you need to make decisions
   * based on tokens attributes before actually
   * verifying it.
   */
  private decodeWithoutVerify(headerToken: string) {
    const plainToken = headerToken.replace(/^Bearer /, "");
    const payload = jose.decodeJwt(plainToken);
    return payload;
  }

  private verifyAudience(aud: string | string[]) {
    const aud_array = typeof aud === "string" ? [aud] : aud;
    if (!aud_array.includes(this.config.audience)) {
      throw new ForbiddenError("Token audience is incorrect");
    }
  }

  isFirstPartyToken(headerToken: string) {
    const token = this.decodeWithoutVerify(headerToken);

    if (!token.iss) {
      throw new ForbiddenError("Token is missing issuer");
    }
    return token.iss === this.config.minting.issuer;
  }

  async verifyFirstPartyToken(headerToken: string) {
    const plainToken = headerToken.replace(/^Bearer /, "");
    return this.verifyFirstpartyTokenbase(
      plainToken,
      this.config.minting.secret
    );
  }
  async verifyFirstPartyRefreshToken(headerToken: string) {
    const plainToken = headerToken.replace(/^Bearer /, "");
    return this.verifyFirstpartyTokenbase(
      plainToken,
      this.config.minting.refreshSecret
    );
  }

  private async verifyFirstpartyTokenbase(token: string, secret: string) {
    const secretEncoded = new TextEncoder().encode(secret);
    const { payload } = await jose.jwtVerify(token, secretEncoded, {
      audience: this.config.audience,
      issuer: this.config.minting.issuer,
    });
    const parsed = this.config.decodedTokenSchema.parse(payload);
    return parsed;
  }

  createFirstPartyToken(user: UserForMinting, roles: UserRole[]) {
    return this.createFirstpartyTokenbase(
      user,
      roles,
      this.config.minting.secret,
      this.config.minting.expiry
    );
  }
  createFirstPartyRefreshToken(user: UserForMinting, roles: UserRole[]) {
    return this.createFirstpartyTokenbase(
      user,
      roles,
      this.config.minting.refreshSecret,
      this.config.minting.refreshExpiry
    );
  }

  private createFirstpartyTokenbase(
    user: UserForMinting,
    roles: UserRole[],
    secret: string,
    expiry: string
  ) {
    const secretEncoded = new TextEncoder().encode(secret);

    return new jose.SignJWT({
      sub: user.sub,
      preferred_username: user.preferred_username,
      realm_access: {
        roles: roles,
      },
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime(expiry)
      .setIssuer(this.config.minting.issuer)
      .setAudience(this.config.audience)
      .sign(secretEncoded);
  }
}

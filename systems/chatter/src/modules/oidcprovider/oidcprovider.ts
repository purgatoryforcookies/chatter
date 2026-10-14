import z from "zod";
import { config } from "../../config/config.js";

const discoverySchema = z.object({ jwks_uri: z.string() });

export const createOidcProvider = ({
  issuer = config.authIssuerUri,
  timeout = Number(config.oidcproviderHttpTimeout ?? 5000),
}: { issuer?: string; timeout?: number } = {}) => ({
  timeout,

  getJwksUri: async (): Promise<string> => {
    const base = issuer.endsWith("/") ? issuer : `${issuer}/`;
    const response = await fetch(`${base}.well-known/openid-configuration`, {
      signal: AbortSignal.timeout(timeout),
    });
    if (!response.ok) {
      throw new Error(`OIDC discovery failed with status ${response.status}`);
    }
    return discoverySchema.parse(await response.json()).jwks_uri;
  },
});

export type OidcProvider = ReturnType<typeof createOidcProvider>;

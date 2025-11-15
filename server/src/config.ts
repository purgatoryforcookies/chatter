import { readFileSync } from "fs";
import { join } from "path";
import { Pool } from "pg";

function getenv(key: string, fallthrough?: false): string;
function getenv(key: string, fallthrough: true): string | null;
function getenv(key: string, fallthrough?: boolean): string | null {
  const env = process.env[key];

  if (env) {
    return env;
  }
  if (fallthrough) {
    console.log(
      `Environment key ${key} is not set. This was specifically allowed.`
    );
    return null;
  }
  throw new Error(`Variable ${key} is undefined`);
}

const config = {
  isDev: getenv("DEVELOPMENT") !== "false",
  isInEcs: getenv("AWS_EXECUTION_ENV", true),
  server: {
    port: parseInt(getenv("SERVER_PORT")),
    clientProxy: getenv("CLIENT_PROXY", true),
  },
  db: {
    host: getenv("POSTGRES_HOST"),
    port: parseInt(getenv("POSTGRES_PORT")),
    user: getenv("POSTGRES_USER"),
    password: getenv("POSTGRES_PASSWORD"),
    database: getenv("POSTGRES_DB"),
  },
  auth: {
    issuer: getenv("AUTH_ISSUER_URI"),
    audience: getenv("AUTH_AUDIENCE"),
  },
  redis: {
    url: getenv("REDIS_URL"),
  },
  jwt: {
    secret: getenv("JWT_SECRET"),
    expiration: getenv("JWT_EXP"),
    refreshSecret: getenv("JWT_SECRET_REFRESH"),
    refreshExp: getenv("JWT_EXP_REFRESH"),
    issuer: getenv("JWT_ISSUER"),
  },
};

const pool = new Pool({
  ...config.db,
  min: 1,
  max: 10,
  ssl: config.isInEcs
    ? {
        ca: readFileSync(
          join(__dirname, "service", "crt", "eu-west-1-bundle.pem")
        ),
      }
    : false,
});

export { config, pool };

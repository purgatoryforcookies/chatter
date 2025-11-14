import { readFileSync } from "fs";
import { join } from "path";
import { Pool } from "pg";

const getenv = (key: string, value?: string) => {
  const env = process.env[key];

  if (env) {
    return env;
  }

  if (!value) {
    throw new Error(`Variable ${key} is undefined`);
  }
  return value;
};

const config = {
  isDev: getenv("DEVELOPMENT") !== "false",
  server: {
    port: parseInt(getenv("SERVER_PORT", "3000")),
  },
  db: {
    host: getenv("POSTGRES_HOST", "localhost"),
    port: parseInt(getenv("POSTGRES_PORT", "5432")),
    user: getenv("POSTGRES_USER", "postgres"),
    password: getenv("POSTGRES_PASSWORD", "postgres"),
    database: getenv("POSTGRES_DB", "postgres"),
  },
  auth: {
    issuer: getenv("AUTH_ISSUER_URI"),
    audience: getenv("AUTH_AUDIENCE"),
  },
  redis: {
    url: getenv("REDIS_URL", "localhost"),
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
  ssl: {
    ca: readFileSync(join(__dirname, "service", "crt", "eu-west-1-bundle.pem")),
  },
});

export { config, pool };

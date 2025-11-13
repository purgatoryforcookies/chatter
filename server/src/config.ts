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
    host: getenv("DB_HOST", "localhost"),
    port: parseInt(getenv("DB_PORT", "5432")),
    user: getenv("DB_USER", "postgres"),
    password: getenv("DB_PASSWORD", "postgres"),
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
});

export { config, pool };

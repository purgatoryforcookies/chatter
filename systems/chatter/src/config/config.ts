function getenv(key: string, fallthrough?: false): string;
function getenv(key: string, fallthrough: true): string | null;
function getenv(key: string, fallthrough?: boolean): string | null {
  const env = process.env[key];

  if (env) {
    return env;
  }
  if (fallthrough) {
    console.log(`Key ${key} is not set. This was specifically allowed.`);
    return null;
  }
  throw new Error(`Variable ${key} is undefined`);
}

export const config = {
  development: getenv("DEVELOPMENT") === "true",
  serverPort: Number(getenv("SERVER_PORT")),
  postgresUser: getenv("POSTGRES_USER"),
  postgresPassword: getenv("POSTGRES_PASSWORD"),
  postgresDb: getenv("POSTGRES_DB"),
  postgresHost: getenv("POSTGRES_HOST"),
  postgresPort: Number(getenv("POSTGRES_PORT")),
  redisUrl: getenv("REDIS_URL"),
  jwtSecret: getenv("JWT_SECRET"),
  jwtExp: getenv("JWT_EXP"),
  jwtSecretRefresh: getenv("JWT_SECRET_REFRESH"),
  jwtExpRefresh: getenv("JWT_EXP_REFRESH"),
  jwtIssuer: getenv("JWT_ISSUER"),
  authIssuerUri: getenv("AUTH_ISSUER_URI"),
  authAudience: getenv("AUTH_AUDIENCE"),
  clientProxy: getenv("CLIENT_PROXY", true),
  awsExecutionEnv: getenv("AWS_EXECUTION_ENV", true),
  daoDbTlsCert: getenv("DAO_DB_TLS_CERT", true),
  redisclientDbTlsCert: getenv("REDISCLIENT_DB_TLS_CERT", true),
  postgresDbPassword: getenv("POSTGRES_DB_PASSWORD", true),
  oidcproviderHttpTimeout: getenv("OIDCPROVIDER_HTTP_TIMEOUT", true),
};

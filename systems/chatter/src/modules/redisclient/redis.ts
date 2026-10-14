import { Redis } from "ioredis";
import pino from "pino";
import { config } from "../../config/config.js";

const logger = pino({ name: "redis" });

export const createRedisClient = (): Redis => {
  const client = new Redis({
    host: config.redisUrl,
    tls: config.awsExecutionEnv
      ? config.redisclientDbTlsCert
        ? { ca: config.redisclientDbTlsCert }
        : {}
      : undefined,
  });
  client.on("ready", () => {
    logger.info(`Connection ${client.status}`);
  });
  client.on("connecting", () => {
    logger.info("Connecting...");
  });
  client.on("reconnecting", () => {
    logger.info("Reconnecting...");
  });
  client.on("close", () => {
    logger.info("Closed.");
  });
  client.on("error", (error) => {
    logger.error(`Connection status: ${client.status}, error: ${error.message}`);
  });
  return client;
};

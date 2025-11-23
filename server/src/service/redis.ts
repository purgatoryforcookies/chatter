import Redis from "ioredis";
import pino from "pino";
import { config } from "../config";

const logger = pino({ name: "redis" });

export const redisClient = new Redis({
  host: config.redis.url,
  tls: !config.isInEcs ? undefined : {},
});
redisClient.on("ready", () => {
  logger.info(`Connection ${redisClient.status}`);
});

redisClient.on("connecting", () => {
  logger.info(`Connecting...`);
});
redisClient.on("reconnecting", () => {
  logger.info(`Reconnecting...`);
});
redisClient.on("close", () => {
  logger.info(`Closed.`);
});
redisClient.on("error", (error) => {
  logger.error(
    `Connection status: ${redisClient.status}, error: ${error.message}`
  );
});

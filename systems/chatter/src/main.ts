import pino from "pino";
import { createApp } from "./app/app.js";
import { config } from "./config/config.js";

const logger = pino({ name: "main" });

const { httpServer, close } = createApp();

httpServer.listen(config.serverPort, () => {
  logger.info(`Server listening on ${config.serverPort}`);
});

const shutdown = async (): Promise<void> => {
  logger.info("Shutting down");
  try {
    await close();
    process.exit(0);
  } catch (error) {
    logger.error(error);
    process.exit(1);
  }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

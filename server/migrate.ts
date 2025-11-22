import { runner } from "node-pg-migrate";
import { join } from "path";
import pino from "pino";
import { exit } from "process";
import { pool } from "./src/config";

const logger = pino({ name: "migrations" });

export const runMigrations = async () => {
  logger.info("Running migrations");
  const connection = await pool.connect();
  try {
    await runner({
      dbClient: connection,
      migrationsTable: "pgmigrations",
      dir: join(__dirname, "migrations"),
      direction: "up",
      logger: logger,
    });
  } finally {
    connection.release();
  }
};

if (require.main === module) {
  try {
    runMigrations();
  } catch (error) {
    logger.error(error);
    exit(1);
  }
  exit();
}

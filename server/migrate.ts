import { runner } from "node-pg-migrate";
import { join } from "path";
import { exit } from "process";
import { pool } from "./src/config";

export const runMigrations = async () => {
  console.log("Running migrations");
  const connection = await pool.connect();
  try {
    await runner({
      dbClient: connection,
      migrationsTable: "pgmigrations",
      dir: join(__dirname, "migrations"),
      direction: "up",
    });
  } catch (error) {
    console.log(error);
    exit(1);
  } finally {
    connection.release();
  }
  exit();
};
runMigrations();

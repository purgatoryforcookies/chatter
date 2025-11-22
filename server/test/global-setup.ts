import { config } from "dotenv";
import { join } from "path";
console.log(config({ path: join(__dirname, "..", "test.env") }));
import { runMigrations } from "../migrate";

export default async () => {
  await runMigrations();
};

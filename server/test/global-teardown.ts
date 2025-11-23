import { config } from "dotenv";
import { join } from "path";
import { TestDao } from "./data/dao";
console.log(config({ path: join(__dirname, "..", "test.env") }));

export default async () => {
  const dao = new TestDao();
  await dao.resetMigrations();
};

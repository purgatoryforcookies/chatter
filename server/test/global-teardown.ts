import { config } from "dotenv";
import { join } from "path";
console.log(config({ path: join(__dirname, "..", "test.env") }));
import { TestDao } from "./data/dao";

export default async () => {
  const dao = new TestDao();
  await dao.resetMigrations();
};

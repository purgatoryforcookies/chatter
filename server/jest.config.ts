import type { Config } from "jest";

const config: Config = {
  transform: {
    "^.+\\.ts?$": "ts-jest",
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.json", useESM: true }],
  },
  testRegex: "((\\.|/)(test))\\.(ts)?$",
  testEnvironment: "node",
  setupFiles: ["<rootDir>/test/setup-tests.ts"],
  coveragePathIgnorePatterns: ["<rootDir>/test", "<rootDir>/src/errors.ts"],
};

export default config;

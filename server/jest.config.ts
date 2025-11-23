import type { Config } from "jest";

const config: Config = {
  transform: {
    "^.+\\.(js|ts)?$": ["ts-jest", { tsconfig: "tsconfig.json" }],
  },
  testRegex: "((\\.|/)(test))\\.(ts)?$",
  testEnvironment: "node",
  setupFiles: ["<rootDir>/test/setup-tests.ts"],
  globalSetup: "<rootDir>/test/global-setup.ts",
  // extensionsToTreatAsEsm: [".ts"],
  coveragePathIgnorePatterns: ["<rootDir>/test", "<rootDir>/src/errors.ts"],
  watchPathIgnorePatterns: ["<rootDir>/coverage", "<rootDir>/node_modules"],
  transformIgnorePatterns: ["node_modules/(?!(jose)/)"],
};

export default config;

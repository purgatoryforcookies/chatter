import { config as dotenv } from "dotenv";

console.log(dotenv());

const getenv = (key: string, value?: string) => {
  const env = process.env[key];

  if (env) {
    return env;
  }

  if (!value) {
    throw new Error(`Variable ${key} is undefined`);
  }
  return value;
};

export const config = {
  ecr: {
    repo: getenv("AWS_ECR_TARGET_REPOSITORY"),
    tag: getenv("IMAGE_TAG"),
  },
  auth: {
    issuerUri: getenv("AUTH_ISSUER_URI"),
    audience: getenv("AUTH_AUDIENCE"),
    minting: {
      issuer: getenv("JWT_ISSUER"),
    },
  },
  rds: {
    databaseName: "chat",
  },
};

import * as cdk from "aws-cdk-lib";
import { ChatStack } from "../lib/chat";
import { EcrStack } from "../lib/ecr";
import { RdsStack } from "../lib/rds";
import { RedisStack } from "../lib/redis";
import { VpcStack } from "../lib/vpc";

export type StackOptions = {
  env: "dev" | "prod";
};

const options: StackOptions = {
  env: "dev",
};

const app = new cdk.App();

const ecr = new EcrStack(app, "EcrStack", options);
const vpcStack = new VpcStack(app, "VpcStack", options);

const cache = new RedisStack(app, "RedisStack", options, {
  vpc: vpcStack.vpc,
});

const rds = new RdsStack(app, "RdsStack", options, {
  vpc: vpcStack.vpc,
});

const chatstack = new ChatStack(app, "Chatstack", options, {
  vpc: vpcStack.vpc,
  ecr,
  rds: {
    host: rds.db.dbInstanceEndpointAddress,
    port: rds.db.dbInstanceEndpointPort,
    sg: rds.dbSG,
    secret: rds.dbSecret,
  },
  cacheEndpoint: cache.cache.attrReaderEndpointAddress,
  cacheSG: cache.cacheSecurityGroup,
});

chatstack.addDependency(rds);
chatstack.addDependency(cache);

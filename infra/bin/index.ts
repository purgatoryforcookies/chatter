import * as cdk from "aws-cdk-lib";
import { BastionStack } from "../lib/bastion";
import { ChatStack } from "../lib/chat";
import { EcrStack } from "../lib/ecr";
import { RdsStack } from "../lib/rds";
import { RedisStack } from "../lib/redis";
import { Route53Stack } from "../lib/route53";
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

const bastion = new BastionStack(app, "BastionStack", options, {
  rdsSg: rds.dbSG,
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

const route53 = new Route53Stack(app, "Route53Stack", options, {
  ecs: chatstack.ecs,
});

chatstack.addDependency(rds);
chatstack.addDependency(cache);
route53.addDependency(chatstack);
bastion.addDependency(rds);

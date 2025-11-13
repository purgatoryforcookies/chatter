import * as cdk from "aws-cdk-lib";
import { ChatStack } from "../lib/chat";
import { EcrStack } from "../lib/ecr";
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

const chatstack = new ChatStack(app, "Chatstack", options, {
  vpc: vpcStack.vpc,
  ecr,
});

chatstack.addDependency(ecr);
chatstack.addDependency(vpcStack);

import { App, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { SecurityGroup, Vpc } from "aws-cdk-lib/aws-ec2";
import { CfnServerlessCache } from "aws-cdk-lib/aws-elasticache";
import { StackOptions } from "../bin";

export class RedisStack extends Stack {
  cache: CfnServerlessCache;
  cacheSecurityGroup: SecurityGroup;
  constructor(
    scope: App,
    id: string,
    options: StackOptions,
    stacks: {
      vpc: Vpc;
    },
    props?: StackProps
  ) {
    super(scope, id, props);

    this.cacheSecurityGroup = new SecurityGroup(
      this,
      "ElastiCacheSecurityGroup",
      {
        vpc: stacks.vpc,
        allowAllOutbound: true,
        description: "ElastiCache Security Group",
        securityGroupName: "ElastiCacheSecurityGroup",
      }
    );
    this.cacheSecurityGroup.applyRemovalPolicy(RemovalPolicy.DESTROY);

    this.cache = new CfnServerlessCache(this, "ServerlessCache", {
      engine: "valkey",
      serverlessCacheName: "ChatAppCache",
      securityGroupIds: [this.cacheSecurityGroup.securityGroupId],
      subnetIds: stacks.vpc.privateSubnets.map((i) => i.subnetId),
    });
    this.cache.applyRemovalPolicy(RemovalPolicy.DESTROY);
  }
}

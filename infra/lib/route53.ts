import { App, Stack, StackProps } from "aws-cdk-lib";
import { SecurityGroup } from "aws-cdk-lib/aws-ec2";
import { ApplicationLoadBalancedFargateService } from "aws-cdk-lib/aws-ecs-patterns";
import { CfnServerlessCache } from "aws-cdk-lib/aws-elasticache";
import { ARecord, HostedZone, RecordTarget } from "aws-cdk-lib/aws-route53";
import { LoadBalancerTarget } from "aws-cdk-lib/aws-route53-targets";
import { StackOptions } from "../bin";
import { config } from "../src/config";

export class Route53Stack extends Stack {
  cache: CfnServerlessCache;
  cacheSecurityGroup: SecurityGroup;
  constructor(
    scope: App,
    id: string,
    options: StackOptions,
    stacks: {
      ecs: ApplicationLoadBalancedFargateService;
    },
    props?: StackProps
  ) {
    super(scope, id, props);

    const hostedZone = HostedZone.fromHostedZoneAttributes(
      this,
      "hosted-zone",
      {
        hostedZoneId: config.route53.hostedZoneId,
        zoneName: config.route53.zoneName,
      }
    );

    new ARecord(this, "EcsAlbAliasRecord", {
      zone: hostedZone,
      target: RecordTarget.fromAlias(
        new LoadBalancerTarget(stacks.ecs.loadBalancer)
      ),
    });
  }
}

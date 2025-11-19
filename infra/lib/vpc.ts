import { App, Stack, StackProps } from "aws-cdk-lib";
import {
  GatewayVpcEndpoint,
  GatewayVpcEndpointAwsService,
  InterfaceVpcEndpoint,
  InterfaceVpcEndpointAwsService,
  IpAddresses,
  SubnetType,
  Vpc,
} from "aws-cdk-lib/aws-ec2";
import { StackOptions } from "../bin";

export class VpcStack extends Stack {
  vpc: Vpc;

  constructor(
    scope: App,
    id: string,
    options: StackOptions,
    props?: StackProps
  ) {
    super(scope, id, props);

    this.vpc = new Vpc(this, "main-vpc", {
      ipAddresses: IpAddresses.cidr("10.0.0.0/16"),
      natGateways: 0,
      vpcName: `${options.env}-vpc-main`,
      restrictDefaultSecurityGroup: true,
      maxAzs: 2,
      subnetConfiguration: [
        {
          name: "subnet-1-pub",
          subnetType: SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: "subnet-1-private",
          subnetType: SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
        {
          name: "subnet-1-private-closed",
          subnetType: SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],
    });

    new InterfaceVpcEndpoint(this, "ECRVpcEndpoint", {
      vpc: this.vpc,
      service: InterfaceVpcEndpointAwsService.ECR,
      privateDnsEnabled: true,
    });
    new InterfaceVpcEndpoint(this, "ECRDockerVpcEndpoint", {
      vpc: this.vpc,
      service: InterfaceVpcEndpointAwsService.ECR_DOCKER,
      privateDnsEnabled: true,
    });
    new GatewayVpcEndpoint(this, "S3GatewayEndpoint", {
      service: GatewayVpcEndpointAwsService.S3,
      vpc: this.vpc,
      subnets: [{ subnetType: SubnetType.PRIVATE_WITH_EGRESS }],
    });

    new InterfaceVpcEndpoint(this, "CloudWatchLogsVpcEndpoint", {
      vpc: this.vpc,
      service: InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
      privateDnsEnabled: true,
    });

    new InterfaceVpcEndpoint(this, "SecretsManagerEndpoint", {
      vpc: this.vpc,
      service: InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
      subnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
      privateDnsEnabled: true,
    });
  }
}

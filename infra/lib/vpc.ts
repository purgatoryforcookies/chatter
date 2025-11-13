import { App, Stack, StackProps } from "aws-cdk-lib";
import { IpAddresses, SubnetType, Vpc } from "aws-cdk-lib/aws-ec2";
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
      natGateways: 1,
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
  }
}

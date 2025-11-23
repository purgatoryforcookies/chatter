import { App, Stack, StackProps } from "aws-cdk-lib";
import {
  BastionHostLinux,
  BlockDeviceVolume,
  InstanceClass,
  InstanceSize,
  InstanceType,
  MachineImage,
  Peer,
  Port,
  SecurityGroup,
  SubnetType,
  Vpc,
} from "aws-cdk-lib/aws-ec2";
import { StackOptions } from "../bin";

export class BastionStack extends Stack {
  constructor(
    scope: App,
    id: string,
    options: StackOptions,
    stacks: {
      vpc: Vpc;
      rdsSg: SecurityGroup;
    },
    props?: StackProps
  ) {
    super(scope, id, props);

    const bastiongSecGroup = new SecurityGroup(this, "bastion-sg", {
      vpc: stacks.vpc,
      securityGroupName: "bastion-sg",
      allowAllOutbound: false,
    });
    bastiongSecGroup.addEgressRule(Peer.anyIpv4(), Port.allTcp());

    const rdsSg = SecurityGroup.fromSecurityGroupId(
      this,
      "RdsSg",
      stacks.rdsSg.securityGroupId
    );

    rdsSg.addIngressRule(bastiongSecGroup, Port.tcp(5432));

    new BastionHostLinux(this, "Ec2BastionInstance", {
      vpc: stacks.vpc,
      securityGroup: bastiongSecGroup,
      instanceName: "rds-bastion-ec2",
      instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MICRO),
      machineImage: MachineImage.latestAmazonLinux2(),
      subnetSelection: {
        subnetType: SubnetType.PRIVATE_WITH_EGRESS,
      },
      blockDevices: [
        {
          deviceName: "/dev/sdh",
          volume: BlockDeviceVolume.ebs(10, {
            encrypted: true,
          }),
        },
      ],
    });
  }
}

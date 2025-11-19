import { App, Duration, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import {
  InstanceClass,
  InstanceSize,
  InstanceType,
  SecurityGroup,
  SubnetType,
  Vpc,
} from "aws-cdk-lib/aws-ec2";
import {
  DatabaseInstance,
  DatabaseInstanceEngine,
  PostgresEngineVersion,
} from "aws-cdk-lib/aws-rds";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import { StackOptions } from "../bin";
import { config } from "../src/config";

export class RdsStack extends Stack {
  db: DatabaseInstance;
  dbSecret: Secret;
  dbSG: SecurityGroup;
  databaseName = config.rds.databaseName;

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

    this.dbSecret = new Secret(this, `DatabaseSecret`, {
      secretName: `${options.env}-db-access`,
      removalPolicy: RemovalPolicy.DESTROY,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: "postgres" }),
        generateStringKey: "password",
        excludeCharacters: '/@"',
      },
    });

    this.dbSG = new SecurityGroup(this, "RdsSg", {
      vpc: stacks.vpc,
    });

    this.db = new DatabaseInstance(this, "DbInstance", {
      vpc: stacks.vpc,
      securityGroups: [this.dbSG],
      instanceIdentifier: `${options.env}-chat-db`,
      vpcSubnets: {
        subnetType: SubnetType.PRIVATE_ISOLATED,
      },
      engine: DatabaseInstanceEngine.postgres({
        version: PostgresEngineVersion.VER_17_6,
      }),
      instanceType: InstanceType.of(
        InstanceClass.BURSTABLE3,
        InstanceSize.SMALL
      ),
      credentials: {
        username: this.dbSecret.secretValueFromJson("username").toString(),
        password: this.dbSecret.secretValueFromJson("password"),
      },
      multiAz: false,
      allocatedStorage: 100,
      maxAllocatedStorage: 120,
      allowMajorVersionUpgrade: false,
      autoMinorVersionUpgrade: true,
      backupRetention: Duration.days(0),
      deleteAutomatedBackups: true,
      removalPolicy: RemovalPolicy.DESTROY,
      deletionProtection: false,
      databaseName: this.databaseName,
      publiclyAccessible: false,
    });
  }
}

import {
  App,
  Duration,
  RemovalPolicy,
  Stack,
  StackProps,
  aws_elasticache,
} from "aws-cdk-lib";
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
import {
  Cluster,
  ContainerImage,
  Secret as EcsSecret,
} from "aws-cdk-lib/aws-ecs";
import { ApplicationLoadBalancedFargateService } from "aws-cdk-lib/aws-ecs-patterns";
import {
  Effect,
  ManagedPolicy,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";
import {
  DatabaseInstance,
  DatabaseInstanceEngine,
  PostgresEngineVersion,
} from "aws-cdk-lib/aws-rds";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import { StackOptions } from "../bin";
import { config } from "../src/config";
import { EcrStack } from "./ecr";

export class ChatStack extends Stack {
  ecs: ApplicationLoadBalancedFargateService;
  db: DatabaseInstance;
  private databaseName = "chat";

  constructor(
    scope: App,
    id: string,
    options: StackOptions,
    stacks: {
      vpc: Vpc;
      ecr: EcrStack;
    },
    props?: StackProps
  ) {
    super(scope, id, props);

    const elasticacheSecurityGroup = new SecurityGroup(
      this,
      "ElastiCacheSecurityGroup",
      {
        vpc: stacks.vpc,
        allowAllOutbound: true,
        description: "ElastiCache Security Group",
        securityGroupName: "ElastiCacheSecurityGroup",
      }
    );

    const cache = new aws_elasticache.CfnServerlessCache(
      this,
      "ServerlessCache",
      {
        engine: "redis",
        serverlessCacheName: "ChatAppCache",
        securityGroupIds: [elasticacheSecurityGroup.securityGroupId],
        subnetIds: stacks.vpc.privateSubnets.map((i) => i.subnetId),
      }
    );
    cache.applyRemovalPolicy(RemovalPolicy.DESTROY);
    elasticacheSecurityGroup.applyRemovalPolicy(RemovalPolicy.DESTROY);

    const dbSecret = new Secret(this, `DatabaseSecret`, {
      secretName: `${options.env}-db-access`,
      removalPolicy: RemovalPolicy.DESTROY,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: "postgres" }),
        generateStringKey: "password",
        excludeCharacters: '/@"',
      },
    });

    const tokenSecret = new Secret(this, `JwtMintingSecret`, {
      secretName: `${options.env}-token-secret`,
      removalPolicy: RemovalPolicy.DESTROY,
      generateSecretString: {
        passwordLength: 64,
      },
    });
    const refreshSecret = new Secret(this, `JwtMintingRefreshSecret`, {
      secretName: `${options.env}-token-refresh-secret`,
      removalPolicy: RemovalPolicy.DESTROY,
      generateSecretString: {
        passwordLength: 64,
      },
    });

    this.db = new DatabaseInstance(this, "DbInstance", {
      vpc: stacks.vpc,
      instanceIdentifier: `${options.env}-chat-db`,
      vpcSubnets: {
        subnetType: SubnetType.PRIVATE_ISOLATED,
      },
      engine: DatabaseInstanceEngine.postgres({
        version: PostgresEngineVersion.VER_17_6,
      }),
      instanceType: InstanceType.of(
        InstanceClass.BURSTABLE3,
        InstanceSize.MEDIUM
      ),
      credentials: {
        username: dbSecret.secretValueFromJson("username").toString(),
        password: dbSecret.secretValueFromJson("password"),
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

    const taskRole = new Role(this, "ChatBackendTaskRole", {
      roleName: "ChatBackendTaskRole",
      assumedBy: new ServicePrincipal("ecs-tasks.amazonaws.com"),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AmazonECSTaskExecutionRolePolicy"
        ),
      ],
    });
    taskRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        resources: ["*"],
        actions: [
          "ecr:BatchGetImage",
          "ecr:GetDownloadUrlForLayer",
          "ecr:GetAuthorizationToken",
        ],
      })
    );

    dbSecret.grantRead(taskRole);
    tokenSecret.grantRead(taskRole);
    refreshSecret.grantRead(taskRole);

    const cluster = new Cluster(this, "ChatCluster", {
      clusterName: `${options.env}-chat-cluster`,
      vpc: stacks.vpc,
    });

    const ecsSG = new SecurityGroup(this, "EcsSG", { vpc: stacks.vpc });
    ecsSG.applyRemovalPolicy(RemovalPolicy.DESTROY);

    this.ecs = new ApplicationLoadBalancedFargateService(this, "ChatService", {
      cluster,
      serviceName: `${options.env}-chat-service`,
      loadBalancerName: `${options.env}-chat-alb`,
      securityGroups: [ecsSG],
      taskSubnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
      taskImageOptions: {
        taskRole: taskRole,
        image: ContainerImage.fromEcrRepository(
          stacks.ecr.repo,
          config.ecr.tag
        ),
        containerPort: 3000,
        containerName: `${options.env}-chat-container`,
        secrets: {
          POSTGRES_PASSWORD: EcsSecret.fromSecretsManager(dbSecret, "password"),
          POSTGRES_USER: EcsSecret.fromSecretsManager(dbSecret, "username"),
          JWT_SECRET: EcsSecret.fromSecretsManager(tokenSecret),
          JWT_SECRET_REFRESH: EcsSecret.fromSecretsManager(refreshSecret),
        },
        environment: {
          POSTGRES_PORT: this.db.dbInstanceEndpointPort,
          POSTGRES_HOST: this.db.dbInstanceEndpointAddress,
          POSTGRES_DB: this.databaseName,
          SERVER_PORT: "3000",
          DEVELOPMENT: "false",
          JWT_EXP: "1h",
          JWT_EXP_REFRESH: "7d",
          AUTH_ISSUER_URI: config.auth.issuerUri,
          AUTH_AUDIENCE: config.auth.audience,
          JWT_ISSUER: config.auth.minting.issuer,
          REDIS_URL: cache.attrReaderEndpointAddress,
        },
      },
      cpu: 256,
      memoryLimitMiB: 512,
      desiredCount: 2,
      publicLoadBalancer: true,
    });

    this.ecs.targetGroup.configureHealthCheck({
      path: "/hello",
      interval: Duration.seconds(60),
    });
    this.ecs.targetGroup.enableCookieStickiness(Duration.hours(1), "x-chat");
    this.ecs.targetGroup.setAttribute(
      "deregistration_delay.timeout_seconds",
      "10"
    );

    elasticacheSecurityGroup.addIngressRule(ecsSG, Port.tcp(6379));

    this.db.connections.allowDefaultPortFrom(this.ecs.service);

    const securityGroup = new SecurityGroup(this, "bastion-sg", {
      vpc: stacks.vpc,
      securityGroupName: "bastion-sg",
      allowAllOutbound: false,
    });
    securityGroup.addEgressRule(Peer.anyIpv4(), Port.allTcp());
    // securityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(22));

    this.db.connections.allowDefaultPortFrom(securityGroup);

    new BastionHostLinux(this, "Ec2BastionInstance", {
      vpc: stacks.vpc,
      securityGroup: securityGroup,
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

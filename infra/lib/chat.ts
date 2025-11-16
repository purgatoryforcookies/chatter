import { App, Duration, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { Port, SecurityGroup, SubnetType, Vpc } from "aws-cdk-lib/aws-ec2";
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
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import { StackOptions } from "../bin";
import { config } from "../src/config";
import { EcrStack } from "./ecr";

export class ChatStack extends Stack {
  ecs: ApplicationLoadBalancedFargateService;

  constructor(
    scope: App,
    id: string,
    options: StackOptions,
    stacks: {
      vpc: Vpc;
      ecr: EcrStack;
      rds: {
        host: string;
        port: string;
        sg: SecurityGroup;
        secret: Secret;
      };
      cacheEndpoint: string;
      cacheSG: SecurityGroup;
    },
    props?: StackProps
  ) {
    super(scope, id, props);

    const rdsSecret = Secret.fromSecretAttributes(this, "rdsSecret", {
      secretCompleteArn: stacks.rds.secret.secretArn,
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

    rdsSecret.grantRead(taskRole);
    tokenSecret.grantRead(taskRole);
    refreshSecret.grantRead(taskRole);

    const cluster = new Cluster(this, "ChatCluster", {
      clusterName: `${options.env}-chat-cluster`,
      vpc: stacks.vpc,
    });

    const ecsSG = new SecurityGroup(this, "EcsSG", { vpc: stacks.vpc });
    ecsSG.applyRemovalPolicy(RemovalPolicy.DESTROY);

    const cacheSg = SecurityGroup.fromSecurityGroupId(
      this,
      "cacheSg",
      stacks.cacheSG.securityGroupId
    );

    cacheSg.addIngressRule(ecsSG, Port.tcp(6379));

    const rdsSg = SecurityGroup.fromSecurityGroupId(
      this,
      "RdsSg",
      stacks.rds.sg.securityGroupId
    );

    rdsSg.addIngressRule(ecsSG, Port.tcp(5432));

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
          POSTGRES_PASSWORD: EcsSecret.fromSecretsManager(
            rdsSecret,
            "password"
          ),
          POSTGRES_USER: EcsSecret.fromSecretsManager(rdsSecret, "username"),
          JWT_SECRET: EcsSecret.fromSecretsManager(tokenSecret),
          JWT_SECRET_REFRESH: EcsSecret.fromSecretsManager(refreshSecret),
        },
        environment: {
          POSTGRES_PORT: stacks.rds.port,
          POSTGRES_HOST: stacks.rds.host,
          POSTGRES_DB: config.rds.databaseName,
          SERVER_PORT: "3000",
          DEVELOPMENT: "false",
          JWT_EXP: "1h",
          JWT_EXP_REFRESH: "7d",
          AUTH_ISSUER_URI: config.auth.issuerUri,
          AUTH_AUDIENCE: config.auth.audience,
          JWT_ISSUER: config.auth.minting.issuer,
          REDIS_URL: stacks.cacheEndpoint,
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
  }
}

import { App, Duration, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { Repository } from "aws-cdk-lib/aws-ecr";
import { StackOptions } from "../bin";

export class EcrStack extends Stack {
  repo: Repository;
  constructor(
    scope: App,
    id: string,
    options: StackOptions,
    props?: StackProps
  ) {
    super(scope, id, props);

    this.repo = new Repository(this, "ChatAppRepository", {
      repositoryName: "chat-app-server",
      removalPolicy: RemovalPolicy.DESTROY,
      lifecycleRules: [{ maxImageAge: Duration.days(200) }],
    });
  }
}

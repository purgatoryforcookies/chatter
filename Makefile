include server/.env
include infra/.env
include client/.env
include ./.env

d-build:
	docker build -t chatter --build-arg VITE_AUTH_DOMAIN=${VITE_AUTH_DOMAIN} --build-arg VITE_AUTH_CLIENT_ID=${VITE_AUTH_CLIENT_ID} .

pushecr:
	aws ecr get-login-password --region eu-west-1 | docker login --username AWS --password-stdin ${AWS_ACCOUNT}.dkr.ecr.eu-west-1.amazonaws.com
	docker tag chatter:latest ${AWS_ACCOUNT}.dkr.ecr.eu-west-1.amazonaws.com/${AWS_ECR_TARGET_REPOSITORY}:${IMAGE_TAG}
	docker push ${AWS_ACCOUNT}.dkr.ecr.eu-west-1.amazonaws.com/${AWS_ECR_TARGET_REPOSITORY}:${IMAGE_TAG}

buildaws: d-build pushecr

deployinfra:
	cd infra && npx cdk deploy --all --require-approval never
destroyinfra:
	cd infra && npx cdk destroy --all --force


bastion:
	aws ec2 describe-instances --filters "Name=tag:Name,Values=rds-bastion-ec2" --query 'Reservations[*].Instances[*].{Instance:InstanceId}' --output text
endpoints:
	aws dms describe-endpoints


dev:
	docker compose -f docker-compose.dev.yaml up --build
migrate:
	docker compose -f docker-compose.dev.yaml run server npm run migrate:local
migrate-aws:
	aws ecs run-task \
		--cluster dev-chat-cluster \
		--task-definition ChatstackChatServiceTaskDef2583B72A:24 \
		--launch-type FARGATE \
		--overrides '{"containerOverrides":[{"name":"dev-chat-container","command":["npm","run","migrate:cloud"]}]}' \
		--network-configuration "awsvpcConfiguration={subnets=[subnet-0c772a14a0d8ef77b],securityGroups=[sg-04f045da17af97e36],assignPublicIp=DISABLED}"

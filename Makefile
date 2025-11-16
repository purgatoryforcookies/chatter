include server/.env
include infra/.env
include client/.env
include ./.env

build:
	docker build -t chatter --build-arg VITE_AUTH_DOMAIN=${VITE_AUTH_DOMAIN} --build-arg VITE_AUTH_CLIENT_ID=${VITE_AUTH_CLIENT_ID} .

pushecr:
	aws ecr get-login-password --region eu-west-1 | docker login --username AWS --password-stdin ${AWS_ACCOUNT}.dkr.ecr.eu-west-1.amazonaws.com
	docker tag chatter:latest ${AWS_ACCOUNT}.dkr.ecr.eu-west-1.amazonaws.com/${AWS_ECR_TARGET_REPOSITORY}:latest
	docker push ${AWS_ACCOUNT}.dkr.ecr.eu-west-1.amazonaws.com/${AWS_ECR_TARGET_REPOSITORY}:latest

buildaws: build pushecr

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

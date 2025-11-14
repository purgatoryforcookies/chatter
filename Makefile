include server/.env
include client/.env

build:
	docker build -t chatter --build-arg VITE_AUTH_DOMAIN=${VITE_AUTH_DOMAIN} --build-arg VITE_AUTH_CLIENT_ID=${VITE_AUTH_CLIENT_ID} .

pushecr:
	aws ecr get-login-password --region eu-west-1 | docker login --username AWS --password-stdin 201121240372.dkr.ecr.eu-west-1.amazonaws.com
	docker tag chatter:latest 201121240372.dkr.ecr.eu-west-1.amazonaws.com/chat-app-server:latest
	docker push 201121240372.dkr.ecr.eu-west-1.amazonaws.com/chat-app-server:latest

buildaws: build pushecr

deployinfra:
	cd infra && npx cdk deploy --all --require-approval never
destroyinfra:
	cd infra && npx cdk destroy --all --require-approval never

# Chatter

Self hosted chat room for real-time speak easy!
Supports both anonymous and registered users.

## Features

- Real time messaging
- Scaleable across multiple servers
- Anonymous access via jwt tokens
- Support for IAM provider
- Private rooms for DM's

## Tech Stack

**Client:** Vue, TailwindCSS

**Server:** Node, Express, Redis

**Database** Postgres

**Cloud** AWS (optional)

## Development

### Getting started

0. Fork the repository
1. Create 2x .env files following the examples provided

- client/.env
- server/.env

These two variables are meant to be set when running in development mode

- [ ] DEVELOPMENT=true
- [ ] CLIENT_PROXY=http://+client service name in docker-copose file+:5173

2. run `make dev` or grab the command from the Makefile
3. Chatter is available on `localhost:${SERVER_PORT}`

Note: The client is not exposed to host on purpose, it is proxied through the server in development.

Locally exposed ports
| port | service |
| ---- | -------- |
| 6379 | redis |
| 5432 | postgres |
| 3000 | chatter |

### Migrations

1. `cd server && npm run migrate create {migration name}`
2. `cd server && npm run migrate up` || `make migrate` || `docker compose -f docker-compose.dev.yaml run server npm run migrate up`

## Deployment

### Local

`docker-compose.yaml` can be used for deployments on for e.g. coolify.

### AWS

#### Via pipeline

0. Fork the repository
1. Create an iam provider [Oidc in aws](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws)
2. Create new iam role and permission for the provider [Ecr login](https://github.com/aws-actions/amazon-ecr-login?tab=readme-ov-file#ecr-private)
3. Create repository variables

- [ ] AWS_GITHUB_ROLE_ARN \*from aws
- [ ] AWS_REGION \*from aws
- [ ] AWS_ECR_TARGET_REPOSITORY \*you decide
- [ ] AUTH_ISSUER_URI \*from auth provider
- [ ] AUTH_AUDIENCE \*what you configured
- [ ] AUTH_CLIENT \*from auth provider
- [ ] JWT_ISSUER \*you decide

4. Uncomment trigger on master in `release_aws.yaml` file if you want to deploy automatically
5. Make a pull request and merge it into master, or run `release_aws.yaml` workflow manually from github actions
6. Once deployed, chatter is available on dns name aws provides you. Note: Without TLS you will not be able to use oidc authentication within the app.

#### Via local machine

Note: It is expected that you use an aws credential manager of some sort. I recommend [granted](https://granted.dev) for its ease of use.

0. Fork the repositoy
1. Fill in 3x .env files per examples

- [ ] /.env
- [ ] server/.env
- [ ] client/.env

2. Run `make deployinfra`
3. After ECR stack has been created, run `make buildaws`
4. After deployment finishes, you can access chatter in the dns aws provides to you. This dns can be found from [console](https://eu-west-1.console.aws.amazon.com/ec2/home?region=eu-west-1#LoadBalancers)

## Snippets

```
assume -t
```

```
npx cdk deploy --all
```

```PS
aws ssm start-session --target {instand_id} --document-name AWS-StartPortForwardingSessionToRemoteHost --parameters portNumber="5432",localPortNumber="5432",host="{dbhost}"
```

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

## Deployment

### Local

`docker-compose.yaml` can be used for deployments on for e.g. coolify.

### AWS

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

4. Make a pull request and merge it into master, or run `release_aws.yaml` workflow manually from github actions
5. Once deployed, chatter is available on dns name aws provides you. Note: Without TLS you will not be able to use oidc authentication within the app.

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

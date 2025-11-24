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
1. run `task dev`
2. run `task migrate` on a separate shell
3. Chatter is available on `localhost:${SERVER_PORT}`

These two variables under /server are meant to be set for dev (task handles this for you)

- [ ] DEVELOPMENT=true
- [ ] CLIENT_PROXY=http://+client service name in docker-copose file+:5173

Note: The client is not exposed to host on purpose, it is proxied through the server in development.

Locally exposed ports
| port | service |
| ---- | -------- |
| 6379 | redis |
| 5432 | postgres |
| 3000 | chatter |

### Migrations

1. `cd server && npm run migrate create {migration name}`
2. `task migrate` to run migrations

## Deployment

### Local

`docker-compose.yaml` can be used for deployments on for e.g. coolify.

### AWS

#### Via pipeline

0. Clone the repository
1. Create an iam provider [Oidc in aws](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws)
2. Create AWS route53 hosted zone for your domain
3. Request a certificate for your domain or import one into aws certificate manager
4. Create new iam role and permission for the provider [Ecr login](https://github.com/aws-actions/amazon-ecr-login?tab=readme-ov-file#ecr-private)
5. Create repository variables

- [ ] AWS_GITHUB_ROLE_ARN \*from aws
- [ ] AWS_REGION \*from aws
- [ ] AWS_ECR_TARGET_REPOSITORY \*you decide
- [ ] AUTH_ISSUER_URI \*from auth provider
- [ ] AUTH_AUDIENCE \*what you configured
- [ ] AUTH_CLIENT \*from auth provider
- [ ] JWT_ISSUER \*you decide
- [ ] TLS_CERT_ARN \*from certificate you requested from aws cert manager
- [ ] AWS_HOSTED_ZONE_ID \*from hosted zone you created in route 53
- [ ] AWS_HOSTED_ZONE_NAME \*from hosted zone you created in route 53

6. Uncomment trigger on master in `release_aws.yaml` file if you want to deploy automatically
7. Make a pull request and merge it into master, or run `release_aws.yaml` workflow manually from github actions
8. Once deployed, chatter is available on dns name you configured.

#### Via local machine

Note: It is expected that you use an aws credential manager of some sort. I recommend [granted](https://granted.dev) for its ease of use.

0. Fork the repositoy
1. Fill in 3x .env files per examples

- [ ] /.env
- [ ] server/.env
- [ ] client/.env

2. Run `task deployinfra`
3. After ECR stack has been created, run `task buildaws`
4. After deployment finishes, you can access chatter from your domain name. [Route53](https://us-east-1.console.aws.amazon.com/route53/v2/home?region=eu-west-1#Dashboard)

## Snippets

```
assume -t
```

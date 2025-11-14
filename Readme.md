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

## Deployment

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

4. Have fun?

# Chat app

## Deployment

`assume -t`
`npx cdk deploy --all`

## Connecting

### Bastion for RDS

Windows
`aws ssm start-session --target {instand_id} --document-name AWS-StartPortForwardingSessionToRemoteHost --parameters portNumber="5432",localPortNumber="5432",host="{dbhost}"`

# Assumptions

Where the spec left a choice open, this is what was built.

## chatter:foundation

- **Which variables are required** Required: DEVELOPMENT, SERVER_PORT, the POSTGRES_* variables except POSTGRES_DB_PASSWORD, REDIS_URL, the JWT_* variables and AUTH_*. Optional: CLIENT_PROXY, AWS_EXECUTION_ENV, DAO_DB_TLS_CERT, REDISCLIENT_DB_TLS_CERT, POSTGRES_DB_PASSWORD and OIDCPROVIDER_HTTP_TIMEOUT.
- **Test-only variables (POSTGRES_PASSWORD, JWT_SECRET, JWT_SECRET_REFRESH)** Kept required, since the spec says all are required and the app can't run without them.

# Getting started

Every system and its databases run in Docker. With Docker installed, from this folder:

```sh
docker compose up --build
```

Stop with Ctrl+C. `docker compose down -v` also deletes the databases' data, so their init scripts run again on the next start.

Ports, credentials and settings for every system are set in one place, `.env` in this folder.

## Systems

- **chatter** in `systems/chatter`

Where the spec left a choice open, a system's `ASSUMPTIONS.md` says what was built.

# Development PostgreSQL Configuration

This guide documents the local SDKWork Claw Router PostgreSQL development
profile for explicit product server commands. `pnpm dev`, `pnpm dev:browser`,
`pnpm dev:server`, and `pnpm dev:server:postgres` use PostgreSQL by default for
the integrated Claw Router product server runtime. Gateway-backed desktop
client commands (`pnpm dev:desktop` and `pnpm dev:desktop:sqlite`) start
`sdkwork-api-cloud-gateway` plus the portal shell only; they do not start the product
server database profile.

Workspace desktop commands are gateway-backed client commands. They start the
desktop shell plus `sdkwork-api-cloud-gateway`, not a product backend service. Use
`pnpm dev:server` for PostgreSQL-backed product server debugging and
`pnpm dev:desktop:sqlite` for the client-local SQLite profile.
Desktop packages and desktop user data still use SQLite by default.

Desktop SQLite defaults are unchanged by this profile:

```text
Windows: %USERPROFILE%/.sdkwork/router/data/clawrouter.sqlite
Linux: ~/.sdkwork/router/data/clawrouter.sqlite
macOS: ~/.sdkwork/router/data/clawrouter.sqlite
```

## 1. Create The Local Database

Create a database and user for local development:

```sql
CREATE USER sdkwork_ai_dev WITH PASSWORD 'sdkworkdev123';
CREATE DATABASE sdkwork_ai_dev OWNER sdkwork_ai_dev;
GRANT ALL PRIVILEGES ON DATABASE sdkwork_ai_dev TO sdkwork_ai_dev;
```

For an existing database, make sure the host, port, database name, username, and password match the default local profile or your local `.env.postgres` file.

## 2. Optional .env.postgres Override

`pnpm dev:server` reads `.env.postgres` for the local PostgreSQL profile. If
the file is missing or you need to customize the PostgreSQL fields, copy the
checked-in template:

```powershell
Copy-Item .env.postgres.example .env.postgres
```

On Linux or macOS:

```bash
cp .env.postgres.example .env.postgres
```

Edit `.env.postgres`:

```env
SDKWORK_DATABASE_ENGINE=postgresql
SDKWORK_DATABASE_HOST=127.0.0.1
SDKWORK_DATABASE_PORT=5432
SDKWORK_DATABASE_NAME=sdkwork_ai_dev
SDKWORK_DATABASE_SCHEMA=sdkwork_ai_dev
SDKWORK_DATABASE_USERNAME=sdkwork_ai_dev
SDKWORK_DATABASE_PASSWORD=sdkworkdev123
SDKWORK_DATABASE_SSL_MODE=disable
SDKWORK_DATABASE_MAX_CONNECTIONS=10
```

Do not commit `.env.postgres`. The repository only tracks `.env.postgres.example`.

## 3. Start Local Redis

The server development profile requires Redis for durable gateway accounting
retries. Start a local Redis 7 instance on `127.0.0.1:6379`. A persistent Docker
development instance can be created with:

```powershell
docker run -d --name sdkwork-dev-redis -p 6379:6379 -v sdkwork-dev-redis-data:/data redis:7-alpine redis-server --appendonly yes
```

For an existing stopped container, run `docker start sdkwork-dev-redis`. Verify
the dependency with `docker exec sdkwork-dev-redis redis-cli ping`; the expected
response is `PONG`.

Redis remains disabled for the client-local desktop profile. Do not bypass the
server requirement with an in-memory retry queue.

## 4. Start With PostgreSQL

Start the explicit product server workspace with PostgreSQL:

```powershell
pnpm dev:server
```

Equivalent explicit PostgreSQL server entrypoint:

```powershell
pnpm dev:server:postgres
```

Integrated product server (PostgreSQL by default):

```powershell
pnpm dev
pnpm dev:browser
pnpm dev:server
```

Gateway-backed desktop client (no product server):

```powershell
pnpm dev:desktop
pnpm dev:desktop:sqlite
```

Preview the resolved plan without starting services:

```powershell
pnpm topology:plan:server
pnpm dev:server --dry-run
```

The default dev profile assembles:

```text
SDKWORK_DATABASE_URL=postgresql://sdkwork_ai_dev:sdkworkdev123@127.0.0.1:5432/sdkwork_ai_dev?sslmode=disable
```

and passes the URL plus `SDKWORK_DATABASE_MAX_CONNECTIONS` to the explicit
product server installer, catalog refresh, gateway, and edge runtime steps.

`pnpm dev:server` loads `.env.postgres`. These PostgreSQL scripts resolve to
the same product server profile:

```powershell
pnpm dev:server:postgres
pnpm topology:plan:server:postgres
```

Use SQLite only through the client-local desktop entrypoint:

```powershell
pnpm dev:desktop:sqlite
```

Use that SQLite entrypoint, or a desktop package, when validating local data
behavior. The PostgreSQL dev profile is not the desktop persistence default.

## 5. Configuration Precedence

Development startup resolves the database in this order:

1. `SDKWORK_DATABASE_URL`
2. `SDKWORK_DATABASE_ENGINE/HOST/PORT/NAME/USERNAME/PASSWORD/SSL_MODE`
3. Default local PostgreSQL dev database
4. The client-local desktop SQLite profile

Normal local PostgreSQL development should use the default profile or split fields. Set `SDKWORK_DATABASE_URL` only for a temporary explicit override.

Unsupported engines fail startup. A PostgreSQL split-field profile must define `SDKWORK_DATABASE_HOST`, `SDKWORK_DATABASE_NAME`, `SDKWORK_DATABASE_USERNAME`, and `SDKWORK_DATABASE_PASSWORD`.

## 6. Troubleshooting

If product server startup shows SQLite in the dry-run output, remove the
SQLite database override; product server development is PostgreSQL-only.

If startup fails with a missing password error, add `SDKWORK_DATABASE_PASSWORD` to `.env.postgres`. Empty passwords are not accepted for the split-field PostgreSQL profile.

If PostgreSQL rejects the connection, verify it manually:

```powershell
$env:PGPASSWORD = "sdkworkdev123"
psql -h 127.0.0.1 -p 5432 -U sdkwork_ai_dev -d sdkwork_ai_dev -c "select 1;"
```

Use `SDKWORK_DATABASE_SSL_MODE=disable` for local unencrypted PostgreSQL. Use `require` only when the local PostgreSQL server supports TLS.

If startup reports that Redis is required, verify that the local instance is
running and that `SDKWORK_CLAW_REDIS_ENABLED`, `SDKWORK_CLAW_REDIS_HOST`,
`SDKWORK_CLAW_REDIS_PORT`, and `SDKWORK_CLAW_REDIS_DATABASE` match it.

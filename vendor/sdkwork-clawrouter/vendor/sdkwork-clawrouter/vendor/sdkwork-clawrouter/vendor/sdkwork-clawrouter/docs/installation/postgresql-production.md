# Production PostgreSQL Configuration

This guide documents the production PostgreSQL configuration for SDKWork Claw Router. Production deployments should use the runtime TOML configuration file and protected secret files. Do not reuse the development `.env.postgres` file in production.

## 1. Standard Linux Service Layout

The native Linux service package creates the standard paths:

```text
/etc/sdkwork/router/clawrouter.toml
/etc/sdkwork/router/clawrouter.env
/etc/sdkwork/router/database.secret
/var/lib/sdkwork/router
/var/log/sdkwork/router
```

The service reads `/etc/sdkwork/router/clawrouter.toml` and `/etc/sdkwork/router/clawrouter.env`. PostgreSQL credentials should be kept in `/etc/sdkwork/router/database.secret` with restricted permissions.

## 2. PostgreSQL Database And User

Create a database and user owned by the Claw Router deployment:

```sql
CREATE USER sdkwork_ai_prod WITH PASSWORD 'replace-with-real-password';
CREATE DATABASE sdkwork_ai_prod OWNER sdkwork_ai_prod;
GRANT ALL PRIVILEGES ON DATABASE sdkwork_ai_prod TO sdkwork_ai_prod;
```

For managed PostgreSQL, create the equivalent user, database, and network allowlist through the provider console.

## 3. Password File

Write the real password to `/etc/sdkwork/router/database.secret`:

```bash
sudo install -o root -g sdkwork -m 0640 /dev/null /etc/sdkwork/router/database.secret
sudo editor /etc/sdkwork/router/database.secret
```

The file must contain only the database password. Replace the package placeholder value `change-me` before starting the service.

## 4. Runtime TOML

Configure `/etc/sdkwork/router/clawrouter.toml` with split PostgreSQL fields:

```toml
[database]
engine = "postgresql"
host = "db.example.com"
port = 5432
database = "sdkwork_ai_prod"
username = "sdkwork_ai_prod"
password_file = "/etc/sdkwork/router/database.secret"
ssl_mode = "require"
max_connections = 16
```

Use `password_file` for normal production deployments. Direct `password = "..."` is only acceptable when the whole TOML file is protected as a secret-bearing file by the deployment platform.

## 5. Service Environment Overrides

`/etc/sdkwork/router/clawrouter.env` is for process-level overrides and operational toggles. Normal database configuration should stay in TOML plus `database.secret`.

`SDKWORK_CLAW_DATABASE_URL` remains supported as an emergency or orchestration override:

```bash
SDKWORK_CLAW_DATABASE_URL="postgresql://sdkwork_ai_prod:<password>@db.example.com:5432/sdkwork_ai_prod?sslmode=require"
SDKWORK_CLAW_DATABASE_MAX_CONNECTIONS="16"
```

Do not store long-lived production passwords in shell history or ad hoc startup commands. Prefer `password_file` in `/etc/sdkwork/router/clawrouter.toml`.

## 6. Start And Verify

After PostgreSQL and the config files are ready:

```bash
sudo systemctl start clawrouter
sudo systemctl status clawrouter
curl http://127.0.0.1:3900/healthz
curl http://127.0.0.1:3900/readyz
```

Manually verify database connectivity when needed:

```bash
PGPASSWORD="$(sudo cat /etc/sdkwork/router/database.secret)" \
  psql -h db.example.com -p 5432 -U sdkwork_ai_prod -d sdkwork_ai_prod -c "select 1;"
```

## 7. Environment Separation

Development, production, and desktop runtime data must stay separate:

| Concern | Development integration | Production service/container | Desktop local runtime |
| --- | --- | --- | --- |
| Database default | PostgreSQL through `.env.postgres.example` or `.env.postgres` | PostgreSQL through protected TOML and secret files | SQLite |
| Config entrypoint | default dev profile or `.env.postgres` override | `/etc/sdkwork/router/clawrouter.toml` | `~/.sdkwork/router/config/clawrouter.toml` |
| Password storage | local untracked `.env.postgres` | `/etc/sdkwork/router/database.secret` | no PostgreSQL password by default |
| Startup command | `pnpm dev:server` | native service, container, or packaged runtime | desktop package or explicit SQLite dev command |
| Data file | external local PostgreSQL | external managed PostgreSQL | `~/.sdkwork/router/data/clawrouter.sqlite` |
| SSL mode | usually `disable` | usually `require` | not applicable by default |

Do not copy `.env.postgres` to a production host as the service configuration. It is only a local developer convenience profile.
Do not use this production PostgreSQL guide as the desktop default. Desktop
packages preserve local data in SQLite unless the user explicitly configures an
external PostgreSQL database.

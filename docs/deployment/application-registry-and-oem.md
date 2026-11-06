# Application Registry And OEM Deployment

The deployment ships one **IAM application registry** and initializes the
database from it. A fresh installation, an upgrade, or an OEM build therefore
registers every application identity automatically; no per-application manual
step is required.

Authority: `../sdkwork-specs/IAM_APPLICATION_BOOTSTRAP_SPEC.md` §1/§4/§5.4.5,
`../sdkwork-specs/APP_ACCESS_TOKEN_SPEC.md` §1–§4.

## What ships

`etc/iam/` is part of the install package and the container image:

```
etc/iam/
  application-registry.json                      # identities, surfaces, OEM metadata, tokens
  apps/<app-id>/agent.app.config.json            # one registration-ready manifest per identity
```

`scripts/materialize-application-registry.mjs` generates it from every
`agent.app.config.json` in the workspace, grouped by **IAM identity**
(`tenant_id` + runtime `app_id`). PC/H5/Flutter/mini/Harmony surfaces of the
same product share one identity and therefore one tenant application.

## Startup initialization

The container image sets `SDKWORK_APP_ROOT=<install root>/etc/iam`; the systemd
unit sets the same value. Before the API is served the gateway runs:

1. IAM database migrations (`bootstrap_iam_database_from_env`).
2. `ensure_tenant_application_from_app_root` over `etc/iam/apps/*`:
   register the application template → provision the tenant application →
   enable it, idempotently.

The result is normal IAM data (`iam_application_template`,
`iam_tenant_application`, runtime configuration) in the target database, so the
committed public application tokens resolve through the claim-based resolver.
Re-running install/upgrade/restart converges instead of duplicating rows.

The tenant and organization referenced by a registry entry must exist before
registration: the installer seeds the configured bootstrap tenant/admin
(`ensure`), so an OEM deployment sets the same tenant in the bootstrap config
and in the OEM overlay (`tenantId`).

## Fresh database initialization (fast deploy)

A brand-new database becomes an operable deployment in this order:

| Step | Data initialized | Source |
| --- | --- | --- |
| 1 | IAM schema + tenant `100001`, root organization, standard roles (`database/seeds/common/*`) | `cloudrouterctl ensure` → IAM database host (`autoMigrate`/`seedOnBoot` forced for the explicit lifecycle command) |
| 2 | 119 application templates + enabled tenant applications (unique primary domain per identity) | same IAM bootstrap step, from `etc/iam/apps/*` |
| 3 | Bootstrap admin/manager/operator users (password seeded from `SDKWORK_IAM_SUPER_ADMIN_PASSWORD`) | same IAM bootstrap step |
| 4 | Federated commerce seed data (plans, payment methods, partner/promotion bootstrap rows) | `cloudrouterctl ensure` → `bootstrap_federated_commerce_modules` |
| 5 | Cloud Router schema, model catalog, pricing projection, AI routing seed, service node, vendor upstream accounts + encrypted credentials | `cloudrouterctl ensure` |
| 6 | Gateway serving traffic (startup re-runs the idempotent data bootstrap) | container entrypoint |

`bin/docker-deploy.sh` generates the three first-boot secrets into the
per-environment env file when they are unset (and never rewrites configured
values):

- `CLOUDROUTER_UPSTREAM_CREDENTIAL_KEY_RING` — without it `ensure` cannot seed
  vendor credentials and cannot reach the installed state;
- `SDKWORK_IAM_SIGNING_MASTER_SECRET` — required by the production IAM
  assembly;
- `SDKWORK_IAM_SUPER_ADMIN_PASSWORD` — the seeded administrator must be able to
  log in.

A production deployment should set these explicitly (secret store) before the
first install; the generated values are stored in the environment env file and
are never printed.

OEM note: if the overlay changes `tenantId`, the bootstrap tenant seed must use
the same tenant (`SDKWORK_TENANT_ID` / deployment bootstrap config), otherwise
registration cannot attach the applications.

## Generate / verify

```sh
node scripts/materialize-application-registry.mjs \
  --workspace .. --environment production --out dist/application-registry

# drift gate (CI / release preflight)
node scripts/materialize-application-registry.mjs \
  --workspace .. --environment production --out dist/application-registry --check

# packaging checks include `etc/iam`
pnpm install:package:check
pnpm build:container:check
```

`--environment` selects the token claims recorded in `tokens.json`; the
registered manifests themselves carry tenant/organization/domain identity and
the deployment environment comes from `SDKWORK_ENVIRONMENT` at startup.

## OEM deployment

Copy `deployments/oem/oem.profile.example.json` per OEM customer and set the
branding and domain fields:

```json
{
  "applications": {
    "sdkwork-cloudrouter": {
      "name": "Acme Router",
      "displayName": "Acme Router Console",
      "primaryDomain": "router.oem.example.com"
    }
  }
}
```

The fast path keeps the application identities unchanged, so the committed
public application tokens stay valid and only names/domains change.

`tenantId`, `organizationId`, `domainSuffix`, `appIdPrefix`, and per-app
`appId`/`permissions` overrides are supported as well, but they change the
application identity: regenerate the client env profiles for the new identity
with `sdkwork-specs/tools/materialize-client-env.mjs` before building the
frontends, otherwise the browser keeps sending tokens for the previous
identity. `dist/application-registry/application-registry.json` carries the
matching `tokens` map for that environment.

Build and deploy the OEM bundle:

```sh
SDKWORK_OEM_PROFILE_FILE=deployments/oem/acme.profile.json \
  bin/docker-image.sh build --image-tag <version>

bin/docker-deploy.sh install --environment production --yes
bin/docker-deploy.sh status --environment production
bin/doctor.sh --environment production
```

The build materializes a branded registry (tenant/domain/name/app-id) and the
matching public application tokens; registration initializes the OEM database on
first start. Applications that keep their `app_id` keep the committed tokens;
applications whose `app_id` is rewritten receive tokens in
`dist/application-registry/application-registry.json` (`tokens` map) for that
environment.

## Notes

- Registration is per identity. Two repositories that declare the same
  `tenant_id` + `backend.appId` (for example a product and its rebrand) register
  one tenant application; give them distinct `backend.appId` values when they
  must be separate identities.
- The gateway tolerates images without `etc/iam` (older packages): startup
  registration is skipped when the registry root contains neither
  `agent.app.config.json` nor `apps/`.

## New-cluster regression

```sh
# Static: registry identity/domain/name uniqueness, etc/iam packaging,
# entrypoint ordering, first-boot secret generation.
pnpm check:fresh-cluster-init

# Real empty database: migrate -> seed -> 119 applications enabled ->
# bootstrap administrator -> public token resolution -> idempotent rerun.
SDKWORK_CLUSTER_REGRESSION_PG_URL='postgres://sdkwork_ai_test:...@127.0.0.1:5432/sdkwork_ai_test_<run_id>?sslmode=disable' \
  pnpm test:fresh-cluster-init:db
```

The database must be an **empty** canonical workspace database
(`sdkwork_ai_test_<run_id>` with matching schema and `sdkwork_ai_test` role);
the regression refuses a non-empty database so a broken migration cannot hide
behind existing state.

Two fresh-database defects were found and fixed by this gate:

- `iam_organization` upserts in `database/seeds/common/002_default_iam_subject.sql`
  and the IAM bootstrap subject seed used `ON CONFLICT (id)` against a
  `(tenant_id, id)` primary key — a fresh database failed before registration.
- Manifest `app.name` values are not unique and collided with
  `iam_application_template`'s unique name constraint; the registry generator
  now disambiguates template names while keeping `displayName` as the branded
  label.

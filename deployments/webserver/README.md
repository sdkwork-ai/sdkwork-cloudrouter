# Web Server Configuration (layout v3)

Module `sdkwork-cloudrouter` · runtime code `router` · enabled

Authority: `SDKWORK_WEBSERVER_SPEC.md` · hosts: `APP_RUNTIME_TOPOLOGY_NAMING.md` §9.

## Layout

```text
deployments/webserver/
  server.common.toml           # identity, nginx/main/http globals, platform certs, TLS defaults, upstream skeleton
  server.development.toml      # environment = "development" — hosts + include only
  server.test.toml             # environment = "test"
  server.staging.toml          # environment = "staging"
  server.production.toml       # environment = "production"
  server.standalone.toml       # profile = "standalone" (upstream targets)
  server.cloud.toml            # profile = "cloud" (platform gateway upstream)
  snippets/gateway-locations.production.conf   # full gateway proxy (api-only edge products)
  snippets/gateway-api-locations.production.conf  # /api/ + health only (Adaptive Web modules)
  snippets/gateway-locations.nonproduction.conf   # dev/test/staging full proxy to gateway
  snippets/adaptive-web.maps.conf            # PC/H5 UA maps (web / web+api modules only)
  snippets/adaptive-web.dispatch.conf      # location / dispatch
  snippets/adaptive-web.named-locations.conf  # @pc / @h5 static roots + hashed-asset 404/retained fallback
  retain-adaptive-web-assets.sh             # keeps previous-release hashed chunks resolvable
  app-roots.example.toml                     # process Adaptive Web dist catalog (PC/H5)
```

Merge at runtime:

```text
effective(<profile>.<environment>) =
  merge(server.common.toml, server.<environment>.toml, server.<profile>.toml)
```

## Lifecycle environments

| Environment | File | Hosts | Example | Listeners |
| --- | --- | ---: | --- | --- |
| development | `server.development.toml` | 49 | `router-dev.sdkwork.com` | 80 |
| test | `server.test.toml` | 49 | `router-test.sdkwork.com` | 80 |
| staging | `server.staging.toml` | 49 | `router-staging.sdkwork.com` | 80 |
| demo | `server.demo.toml` | 49 | `router-demo.sdkwork.com` | 80 |
| production | `server.production.toml` | 49 | `router.sdkwork.com` | 443 ssl + 80 |

Surfaces: application.public-ingress, application.backend-http, application.open-http.

## Refresh and validate

```bash
node sdkwork-specs/tools/webserver/align-webserver-workspace.mjs <sdkwork-space-root>
node sdkwork-specs/tools/webserver/audit-modules.mjs <sdkwork-space-root>
```

Sidecars (required when `nginx.enabled = true`): `nginx.<profile>.<environment>.conf` must match `effective(<profile>.<environment>)` when `nginx.strict = true`. Regenerate with `align-webserver-workspace.mjs` or `render-nginx-sidecars.mjs`.

## Deploy-time asset invariant

`/assets/` resolves from the live surface root, then from
`<web-root>/<surface>.legacy/assets`, then 404 — never from `index.html`. A release
replaces the whole content-hashed chunk set and moves the outgoing build under
`/opt/deploy/sdkwork-cloudrouter/rollback/`, so browsers that still hold the previous
SPA document keep requesting chunk names from that build. The historical SPA
fallback answered those requests with `index.html` (HTTP 200, `text/html`), which
tripped the strict module MIME check
(`Expected a JavaScript-or-Wasm module script ... MIME type of "text/html"`).

`retain-adaptive-web-assets.sh` hard-links the outgoing build's hashed chunks into
`<web-root>/<surface>.legacy/assets` (14-day retention, pruned by build mtime), so
those tabs keep working across deploys. Install it on the edge host:

```bash
sudo install -m 0755 deployments/webserver/retain-adaptive-web-assets.sh \
  /usr/local/sbin/sdkwork-cloudrouter-retain-web-assets
sudo install -m 0644 \
  deployments/systemd/sdkwork-cloudrouter-retain-web-assets.service \
  deployments/systemd/sdkwork-cloudrouter-retain-web-assets.path \
  deployments/systemd/sdkwork-cloudrouter-retain-web-assets.timer \
  /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now \
  sdkwork-cloudrouter-retain-web-assets.path \
  sdkwork-cloudrouter-retain-web-assets.timer
```

Without the mirror, a missed hashed chunk still answers 404 instead of a misleading
`text/html` 200, and the loader reports a missing module rather than a MIME type
mismatch.

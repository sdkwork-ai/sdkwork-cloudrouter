# Source Configuration

`sdkwork.deployment.config.json` is the source-controlled deployment index for Claw Router.
It selects one profile under `topology/` for the `standalone|cloud` and
`development|test|staging|production` matrix. Gateway TOML files and safe database/nginx examples
also live here. Environment variables and CLI flags are runtime overrides, not the checked-in
configuration authority.

Committed files must not contain passwords, tokens, API keys, private keys, or developer-local
absolute paths. Local overrides use ignored `*.local.*` files; production secrets come from mounted
secret files or the platform secret manager.

Verify with:

```bash
node ../sdkwork-specs/tools/check-source-config-standard.mjs --root .
node ../sdkwork-app-topology/scripts/sdkwork-topology.mjs validate --root . --spec specs/topology.spec.json
```

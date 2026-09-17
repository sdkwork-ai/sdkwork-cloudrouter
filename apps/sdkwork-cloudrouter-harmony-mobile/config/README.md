# config/

Non-secret runtime configuration.

- `app/` holds `runtime-env.<deploymentProfile>.<environment>.json` payloads
  conforming to `CONFIG_SPEC.md` and `ENVIRONMENT_SPEC.md`. Each payload
  declares matching `environment`, `deploymentProfile`, `profileId`, and
  `runtimeTarget=harmony-native`.
- `host/` holds HarmonyOS platform descriptor templates (device types,
  requested permissions, signing profile references, deep-link `wants`).
  Host descriptors must stay secret-free.

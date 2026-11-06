# Flutter Host Configuration

Platform packaging metadata, permission references, bundle/package ids, and signing reference names for the Flutter mobile root.

- Files here are safe, non-secret templates only.
- Bundle id and Android package name come from `agent.app.config.json#app.identifiers`; a template must not override them silently.
- Signing material, keystores, provisioning profiles, and API keys never live here.
- Business runtime configuration belongs in `../app/`, not here.

Profiles: `flutter.<environment>.example.json` for `development`, `test`, `staging`, and `production`.

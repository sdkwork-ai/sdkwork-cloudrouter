# Mini Program Host Configuration

Platform packaging metadata and permission references for the mini program root.

- Files here are safe, non-secret templates only.
- `project.private.config.json` (WeChat DevTools host-local overrides) stays out of version control; commit `project.private.config.json.example` instead.
- App ids in templates are placeholders; the real app id is supplied by the release profile and never committed.
- Business runtime configuration belongs in `../mini-program/`, not here.

Profiles: `mp-weixin.<environment>.example.json` for `development`, `test`, `staging`, and `production`.

# External Source Dependencies

These directories are read-only Git submodules. Do not patch, commit, or generate source changes
inside them from the Claw Router repository. Claw Router-owned integrations and adaptations must
live outside `external/`.

- `sub2api/`: `https://github.com/Wei-Shaw/sub2api.git`, branch `main` — reference for API-key /
  account import APIs, channel pricing, and billing design (see
  `docs/architecture/tech/TECH-15-new-api-sub2api-clawrouter-design.md`).
- `cc-switch/`: `https://github.com/farion1231/cc-switch.git`, branch `main` — reference for
  Claude Code / Codex provider configuration formats used by the console API-key quick import
  feature.

Clone all external submodules with the repository:

```shell
git clone --recurse-submodules <sdkwork-clawrouter-repository-url>
```

Initialize them in an existing checkout:

```shell
git submodule sync --recursive
git submodule update --init --recursive
```

Update all external dependencies to the latest commit on their configured branches:

```shell
git submodule sync --recursive
git submodule update --init --recursive
git submodule update --remote --checkout --recursive
git add .gitmodules external/sub2api external/cc-switch
```

Normal clone and update operations use the exact commits pinned by the parent repository gitlinks.
The branch entries in `.gitmodules` are the authority only when an explicit remote update is run.

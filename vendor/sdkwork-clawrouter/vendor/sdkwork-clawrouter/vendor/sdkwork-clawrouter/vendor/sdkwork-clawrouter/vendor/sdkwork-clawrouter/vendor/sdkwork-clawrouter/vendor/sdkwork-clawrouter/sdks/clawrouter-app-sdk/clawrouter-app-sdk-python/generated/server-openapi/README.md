# clawrouter-app-sdk (Python)

SDKWork Claw Router app API SDK python generated transport SDK

## Installation

```bash
pip install sdkwork-clawrouter-app-sdk
```

## Quick Start

```python
from sdkwork_clawrouter_app_sdk import SdkworkAppClient, SdkConfig

config = SdkConfig(
    base_url="http://localhost:18082",
)

client = SdkworkAppClient(config)
client.set_auth_token("your-auth-token")
client.set_access_token("your-access-token")

# Use the SDK
result = client.ai.channel_groups.list()
```

## Authentication

```text
Authorization: Bearer <authToken>
Access-Token: <accessToken>
```


## Configuration (Non-Auth)

```python
from sdkwork_clawrouter_app_sdk import SdkworkAppClient, SdkConfig

config = SdkConfig(
    base_url="http://localhost:18082",
)

client = SdkworkAppClient(config)
client.set_header('X-Custom-Header', 'value')
```

## API Modules

- `client.ai` - ai API
- `client.chat` - chat API
- `client.iam` - iam API
- `client.notification` - notification API
- `client.runtime` - runtime API
- `client.system` - system API

## Usage Examples

### ai

```python
# List groups
result = client.ai.channel_groups.list()
print(result)
```

### chat

```python
# List product chat conversations
params = {
    'page': 'page',
    'page_size': 'page_size',
}
result = client.chat.conversations.list(params)
print(result)
```

### iam

```python
# List keys
result = client.iam.api_keys.list()
print(result)
```

### notification

```python
# List portal notifications
params = {
    'include_archived': True,
    'page': 'page',
    'page_size': 'page_size',
}
result = client.notification.list_notifications(params)
print(result)
```

### runtime

```python
# List runtime invocations
params = {
    'page': 'page',
    'page_size': 'page_size',
    'conversation_id': 'conversation_id',
    'chat_turn_id': 'chat_turn_id',
    'agent_session_id': 'agent_session_id',
    'runtime': 'runtime',
    'status': 'status',
}
result = client.runtime.invocations.list(params)
print(result)
```

### system

```python
# Retrieve public site runtime branding settings
params = {
    'tenant_code': 'tenant_code',
    'organization_code': 'organization_code',
}
result = client.system.site.runtime.retrieve(params)
print(result)
```

## Error Handling

```python
try:
    client.ai.channel_groups.list()
except Exception as error:
    print(f"Error: {error}")
```

## Publishing

This SDK includes cross-platform publish scripts in `bin/`:
- `bin/publish-core.mjs`
- `bin/publish.sh`
- `bin/publish.ps1`

### Check

```bash
./bin/publish.sh --action check
```

### Publish

```bash
./bin/publish.sh --action publish --channel release
```

```powershell
.\bin\publish.ps1 --action publish --channel test --dry-run
```

> Configure Python package registry credentials before release publish.

## License

MIT

## Regeneration Contract

- HTTP/OpenAPI generator-owned files are tracked in `.sdkwork/sdkwork-generator-manifest.json`.
- HTTP/OpenAPI generation also writes `.sdkwork/sdkwork-generator-changes.json` so automation can inspect created, updated, deleted, unchanged, scaffolded, and backed-up files plus the classified impact areas, verification plan, and execution decision for the latest generation.
- HTTP/OpenAPI apply mode also writes `.sdkwork/sdkwork-generator-report.json` with the full execution report, including `schemaVersion`, `generator`, stable artifact paths, and the execution handoff commands that match CLI `--json` output.
- CLI JSON output also includes an execution handoff with concrete next commands, including reviewed apply commands for dry-run flows.
- Put HTTP/OpenAPI hand-written wrappers, adapters, and orchestration in `custom/`.
- Files scaffolded under `custom/` are created once and preserved across HTTP/OpenAPI regenerations.
- If an HTTP/OpenAPI generated-owned file was modified locally, its previous content is copied to `.sdkwork/manual-backups/` before overwrite or removal.
- RPC SDK source workspaces use convention-first evidence by default: RPC SDK family naming, language workspace naming, `rpc/*.manifest.json`, proto source references, generated client source, and native package manifests.
- Use `sdkgen inspect --protocol rpc` to verify RPC convention evidence. Request persisted generator evidence only with `--emit-control-plane` for release, CI, audit, or migration workflows; evidence paths are derived by generator convention.

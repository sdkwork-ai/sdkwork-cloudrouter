# SDKWork SDK Downloader

Reusable TypeScript orchestration layer for:

- loading OpenAPI schemas from files, URLs, raw strings, or in-memory objects
- invoking `sdkwork-sdk-generator` through a programmatic adapter
- caching generated workspaces by stable schema and request fingerprints
- packaging generated workspaces into reusable `zip` download artifacts
- pruning stale, unhealthy, or oversized cache entries

## Primary API

```ts
import { createSdkworkSdkDownloaderService } from "@sdkwork/sdk-downloader";
```

Main service methods:

- `prepareSdkArtifact(request)`
- `resolveCachedArtifact(request)`
- `inspectCacheEntry(identifier)`
- `listCacheEntries()`
- `pruneCache(policy?)`
- `getHealthReport()`

## Supported Schema Inputs

`prepareSdkArtifact()` and `resolveCachedArtifact()` accept:

- local files via `{ kind: "file", value: "<path>" }`
- remote URLs via `{ kind: "url", value: "<https://...>" }`
- raw JSON or YAML strings via `{ kind: "raw", value: "<content>" }`
- in-memory objects via `{ kind: "object", value: {...} }`

Equivalent JSON and YAML payloads are normalized to the same schema fingerprint.

## Remote Schema Security

Remote schema loading supports runtime safety controls:

- `fetchTimeoutMs` to cap remote request latency
- `maxBytes` to cap remote schema payload size
- `maxRedirects` to cap how many remote redirects are followed during schema loading
- `remoteUrlPolicy.allowedHosts` to restrict fetches to trusted hosts
- `remoteUrlPolicy.blockedHosts` to deny specific hosts
- `remoteUrlPolicy.allowPrivateHosts` to opt in to private or local IP targets
- `remoteUrlPolicy.allowUnresolvedHosts` to bypass fail-closed DNS safety checks when hostname resolution cannot complete

By default, downloader remote fetches reject:

- non-`http` or non-`https` URLs
- URLs with embedded credentials
- direct private or local targets such as `127.0.0.1`, `::1`, and `localhost`
- hostnames that resolve to private or local addresses after DNS lookup
- hostnames that cannot be resolved during DNS safety checks unless explicitly allowed

Redirects are followed manually, revalidated against the same protocol, host, and DNS safety rules, and stopped once `maxRedirects` is exceeded. Caller-supplied request headers are preserved only for same-origin redirects and are stripped once a redirect crosses origin boundaries.

Host rules accept exact hostnames and `*.example.com` wildcard entries.

## Cache Behavior

Cache identity is based on:

- schema fingerprint
- language
- sdk type
- SDK name
- package identity options such as package name or namespace
- generation-affecting transport options such as `baseUrl` and `apiPrefix`

Retention policy supports:

- `ttlMs`
- `maxEntriesPerSchema`
- `maxTotalSizeBytes`

## Artifact Output

The first implementation phase emits `zip` artifacts by default and stores them under the downloader-managed cache root.

## SDKWork Documentation Contract

Domain: commerce
Capability: app
Package type: node-package
Status: stable

### Public API

Public exports are declared in `specs/component.spec.json` under `contracts.publicExports`.

### Required SDK Surface

- None declared in `specs/component.spec.json`.

### Configuration

Configuration keys and runtime entrypoints are declared in `specs/component.spec.json`.

### SaaS/Private/Local Behavior

This module follows the canonical standards linked from `specs/component.spec.json`, including deployment and runtime configuration rules where applicable.

### Security

Do not add secrets, live tokens, manual auth headers, or app-local credential handling to this module.

### Extension Points

Extension points are limited to declared public exports, runtime entrypoints, SDK clients, events, and config keys.

### Verification

- `pnpm --filter @sdkwork/sdk-downloader typecheck`

### Owner And Status

Owner and lifecycle status are tracked in `specs/component.spec.json`.

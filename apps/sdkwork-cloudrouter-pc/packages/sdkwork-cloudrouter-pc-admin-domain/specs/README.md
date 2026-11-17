# SDKWork Cloud Router Admin Domain Center Component Specs

This directory is the local standards index for `sdkwork-cloudrouter-pc-admin-domain`.

Root SDKWork standards remain authoritative. Local component specs can narrow or document this component, but they must not contradict [the root standards](../../../../../../sdkwork-specs/README.md).

## Component

| Field | Value |
| --- | --- |
| Name | `sdkwork-cloudrouter-pc-admin-domain` |
| Type | `node-package` |
| Root | `sdkwork-cloudrouter/apps/sdkwork-cloudrouter-pc/packages/sdkwork-cloudrouter-pc-admin-domain` |
| Domain | `platform` |
| Capability | `router` |
| Surface | `backend-admin` |
| Languages | `typescript` |
| Status | `standardizing` |

## Contract Manifest

- [component.spec.json](./component.spec.json) is the machine-readable component contract.
- The module's only public export is the `DomainCenterAdmin` React surface plus its section/type vocabulary.
- Domain data is read and written exclusively through the generated `@sdkwork/deployments-app-sdk` client injected by `@sdkwork/cloudroutes-pc-commons/runtime`.

## Ownership

- **Domain control plane:** `sdkwork-deployments` (DNS zones, hostnames, DNS records, certificates, DNS automation accounts).
- **Admin composition:** this package owns the presentation, navigation, validation, and copy only.
- **Host routing:** `apps/sdkwork-cloudrouter-pc/src/admin/cloudRouterAdminHostMount.tsx`.

## Verification

- `pnpm --filter @sdkwork/cloudrouter-pc-admin-domain test`
- `node ../sdkwork-specs/tools/check-component-port-bindings.mjs --root .`

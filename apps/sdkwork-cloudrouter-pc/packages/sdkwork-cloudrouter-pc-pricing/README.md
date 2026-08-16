# Cloud Router PC Pricing

Public pricing catalog for official vendor rates synchronized from `sdkwork-models` into the shared pricing domain.

The package owns `/pricing`, its category and facet UI, pricing presentation, i18n messages, and the generated App SDK integration. It does not own price calculation, price synchronization, raw HTTP, authentication headers, or billing settlement.

## Verification

```text
pnpm --filter @sdkwork/cloudrouter-pc-pricing typecheck
pnpm --filter @sdkwork/cloudrouter-pc-pricing test
```

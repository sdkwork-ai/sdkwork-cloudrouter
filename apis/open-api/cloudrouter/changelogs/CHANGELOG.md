# Cloud Router Open API Changelog

## 0.4.11

- Added DeepSeek-compatible web tools on the `/v1` ingress:
  - `POST /v1/tools/search` — query the web and return ranked structured results
    (`query`, `count`, `ori_question`, `localization`, `need_content`).
  - `POST /v1/tools/fetch` — fetch one page and return `title` plus Markdown `content`.
- Both operations mirror DeepSeek's published request/response schemas and are
  routed through the relay chain to a `deepseek` upstream account. Their payload
  modules are named `OpenAiDeepSeekWebSearch*` / `OpenAiDeepSeekWebFetch*`, the
  same `OpenAi*` family every other `/v1` payload uses.
- Error sets follow the vendor reference per surface: both operations publish
  400/401/402/408/413/429/500/504, and only Fetch publishes 403 (target-site
  safety policy) and 404 (no extractable content) — Search never reads a
  third-party page, so it must not advertise a 404/403 retry branch.
- `501` (no upstream account configured) and `502` (relay failure) are gateway
  states, not DeepSeek statuses, and are marked `Cloud Router-specific:` in the
  contract.
- Billing is per successful request, and "successful" means *producing a
  result*: a Search that returns `results: []` and a Fetch that returns no
  extractable body answer `200` but are not billed, matching DeepSeek's own
  rule. `count` never changes the price. Any prepaid hold taken before the call
  is released instead of settled.
- Request bodies are relayed verbatim, so fields DeepSeek does not recognize are
  forwarded and ignored upstream rather than rejected at the gateway.
- Rate limits are documented as vendor-enforced: 5 requests per second per
  account for each tool, counted independently, plus per-domain limits imposed
  by the target host when fetching.

## 0.3.0

- Materialized OpenAPI 3.1.2 contracts with SDKWork standard extensions (`x-sdkwork-request-context`, `WebRequestContext`).
- Gateway invocation and provider passthrough routes aligned to generated SDK families.

## 0.2.x

- Legacy gateway surface consolidation under `apis/open-api/cloudrouter/`.

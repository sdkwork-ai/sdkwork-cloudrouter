# Cloud Router Open API Changelog

## 0.4.11

- Added DeepSeek-compatible web tools on the `/v1` ingress:
  - `POST /v1/tools/search` — query the web and return ranked structured results
    (`query`, `count`, `ori_question`, `localization`, `need_content`).
  - `POST /v1/tools/fetch` — fetch one page and return `title` plus Markdown `content`.
- Both operations mirror DeepSeek's published request/response schemas and error
  statuses (400/401/402/403/404/408/413/429/500/504) and are routed through the
  relay chain to a `deepseek` upstream account, billed per successful request as
  `api_request` (DeepSeek's own rule: per call, not per result or token).

## 0.3.0

- Materialized OpenAPI 3.1.2 contracts with SDKWork standard extensions (`x-sdkwork-request-context`, `WebRequestContext`).
- Gateway invocation and provider passthrough routes aligned to generated SDK families.

## 0.2.x

- Legacy gateway surface consolidation under `apis/open-api/cloudrouter/`.

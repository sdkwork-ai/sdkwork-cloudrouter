# Vendor Pricing Alignment Audit — 2026-11-23

Status: aligned

Scope: every vendor × region catalog in `sdkwork-models`, the official reference
rate rows consumed by Cloud Router, and the DeepSeek peak/off-peak schedule
contract. Evidence date: 2026-11-23 (Asia/Shanghai).

## Method

1. Loaded every authored model and pricing document under
   `../sdkwork-models/models/<vendor>/<region>/`.
2. Ran `python tools/audit-pricing-consistency.py` in `sdkwork-models`
   (schema shape, rate-hash consistency, schedule semantics, duplicate/ambiguous
   rows, model↔pricing pairing, and index counts): **0 issues in 0 files**.
3. Ran `node tools/validate-catalog.mjs`: catalog valid (`ok: true`; remaining
   warnings are video-profile tier expressiveness, not pricing gaps).
4. Ran `node tools/check-catalog-pricing-alignment.mjs` in this repository:
   meters 43 ↔ enum 43, 365 price files, 380 catalog models, 257 sellable
   models; passed. The per-vendor table below accounts for every authored price
   row (2,027 across the current catalog).
5. Cross-checked DeepSeek's live official page
   (<https://api-docs.deepseek.com/zh-cn/quick_start/pricing>) for the peak /
   off-peak table, the 50% off-peak rule, and the holiday rule.

## Vendor coverage

| vendor | region | models | priced models | rates | currency | variants | source observed |
| --- | --- | ---: | ---: | ---: | --- | --- | --- |
| alibaba | cn | 16 | 16 | 43 | CNY | standard | 2026-11-23 |
| alibaba | global | 6 | 6 | 30 | USD | standard | 2026-11-23 |
| anthropic | global | 18 | 18 | 145 | USD | standard | 2026-11-23 |
| baidu | cn | 13 | 13 | 44 | CNY | standard, time_window | 2026-11-23 |
| black_forest_labs | global | 15 | 14 | 40 | USD | standard | 2026-11-23 |
| bytedance | cn | 31 | 29 | 111 | CNY | standard | 2026-11-23 |
| bytedance | global | 19 | 19 | 66 | USD | standard | 2026-11-23 |
| deepseek | cn | 8 | 8 | 28 | CNY | standard, time_window | 2026-11-23 |
| deepseek | global | 8 | 8 | 28 | USD | standard, time_window | 2026-11-23 |
| elevenlabs | global | 22 | 21 | 25 | USD | standard | 2026-11-23 |
| google | global | 44 | 44 | 132 | USD | standard | 2026-11-23 |
| kuaishou | cn | 15 | 15 | 49 | CNY | standard | 2026-11-23 |
| kuaishou | global | 15 | 15 | 52 | USD | standard | 2026-11-23 |
| luma_ai | global | 5 | 5 | 26 | USD | standard | 2026-11-23 |
| meituan | cn | 4 | 4 | 12 | CNY | standard | 2026-11-23 |
| minimax | cn | 35 | 31 | 76 | CNY | standard | 2026-11-23 |
| minimax | global | 36 | 33 | 88 | USD | standard | 2026-11-23 |
| moonshot | cn | 8 | 8 | 30 | CNY | standard | 2026-11-23 |
| moonshot | global | 8 | 8 | 30 | USD | standard | 2026-11-23 |
| mureka | global | 8 | 8 | 8 | USD | standard | 2026-11-23 |
| openai | global | 55 | 55 | 311 | USD | standard | 2026-11-23 |
| pixverse | cn | 3 | 2 | 16 | CNY | standard | 2026-11-23 |
| pixverse | global | 6 | 6 | 106 | USD | standard | 2026-11-23 |
| runway | global | 58 | 57 | 176 | USD | standard | 2026-11-23 |
| stability_ai | global | 10 | 9 | 9 | USD | standard | 2026-11-23 |
| stepfun | cn | 23 | 23 | 47 | CNY | standard | 2026-11-23 |
| suno | global | 5 | 2 | 2 | USD | standard | 2026-11-14 |
| tencent | cn | 12 | 12 | 28 | CNY | standard | 2026-11-23 |
| typesafe | global | 3 | 3 | 3 | USD | standard | 2026-11-23 |
| vidu | cn | 11 | 9 | 40 | CNY | standard | 2026-11-23 |
| vidu | global | 13 | 11 | 53 | USD | standard | 2026-11-23 |
| xai | global | 14 | 14 | 62 | USD | standard | 2026-11-23 |
| xiaomi | cn | 12 | 9 | 28 | CNY | standard, batch | 2026-11-23 |
| xiaomi | global | 12 | 9 | 28 | USD | standard, batch | 2026-11-23 |
| zhipu | cn | 21 | 21 | 55 | CNY | standard | 2026-11-23 |

Models without a pricing document are catalog-only entries whose
`routingState`/`shelfState`/`releaseStage` deliberately keep them off the
billable surface. They are listed in the audit's "catalog-only" note and are not
claimable models.

## DeepSeek peak / off-peak alignment

The official rule is: peak hours are Beijing time Monday–Friday (excluding
Chinese statutory holidays) 09:00–12:00 and 14:00–18:00; every other hour,
weekend, and statutory holiday is off-peak; off-peak is exactly half of peak.

| region | model | meter | peak | off-peak |
| --- | --- | --- | ---: | ---: |
| cn | deepseek-flash | input / cache read / output (CNY per 1M) | 2 / 0.04 / 8 | 1 / 0.02 / 4 |
| cn | deepseek-v4-pro | input / cache read / output (CNY per 1M) | 9 / 0.30 / 27 | 4.5 / 0.15 / 13.5 |
| global | deepseek-flash | input / cache read / output (USD per 1M) | 0.30 / 0.006 / 1.20 | 0.15 / 0.003 / 0.60 |
| global | deepseek-v4-pro | input / cache read / output (USD per 1M) | 1.32 / 0.044 / 3.96 | 0.66 / 0.022 / 1.98 |

The retired aliases `deepseek-v4-flash` and
`deepseek-v4-flash-vision-exp` remain priced at the Flash rate because DeepSeek
still routes those names to `DeepSeek-V4.1-Flash-1017`.

The 2026 statutory-holiday calendar is authored once in
`../sdkwork-models/config/pricing/time-window-schedules.json` and materialized
into every DeepSeek schedule (`holidayDates` on off-peak rows; the same dates in
`excludeDates` on peak rows). `tools/materialize-time-window-schedules.mjs
--check` reports 0 drift, and the off-peak price is derived from peak with the
configured `0.5` ratio — never typed twice.

## Batch rates

OpenAI, Anthropic, and Xiaomi publish batch/offline rates at 50% of the
real-time rate. They are stored as `rate_variant=batch` with an explicit
`tier_code=batch` condition and no schedule. The Cloud Router database now
accepts that variant, and the gateway never selects it for an interactive call.

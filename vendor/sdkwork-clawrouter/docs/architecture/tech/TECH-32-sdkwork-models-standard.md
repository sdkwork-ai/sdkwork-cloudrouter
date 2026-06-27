> Migrated from `docs/32-sdkwork-models-standard.md` on 2026-06-24.
> Owner: SDKWork maintainers

> Version: 0.1
> Date: 2026-05-08
> Scope: `data/sdkwork-models`, ClawRouter model catalog import, and language SDKs
> Status: Draft standard for implementation

## 1. Purpose

`sdkwork-models` is the canonical, standalone model catalog project for
Sdkwork products and external application integrations. It stores model facts,
prices, source evidence, and optional ranking snapshots as versioned JSON data.
It also defines language SDK contracts so applications can load model
information directly without depending on ClawRouter runtime APIs.

The same catalog must support two usage modes:

- direct application usage through TypeScript, Python, Java, Rust, and Flutter
  SDKs
- ClawRouter initialization and refresh by importing the catalog into canonical
  `ai_*` model and pricing tables

## 2. Core Principles

1. The JSON catalog is the source of truth for public model facts and reference
   prices.
2. Each model vendor owns an isolated directory under `models/<vendorCode>/`.
3. A vendor is an operating and billing entity for a model publisher, not only a brand name and not an access provider or aggregator.
4. Model facts, prices, rankings, and ClawRouter provider overlays are separate
   contracts.
5. All money and quantity fields are decimal strings, never floats.
6. Every price record must include source URL, observed time, and effective
   time.
7. The catalog must be loadable from a local directory, bundled package data, or
   remote immutable JSON files.
8. SDK APIs must be conceptually identical across all supported languages.
9. ClawRouter imports catalog data into SQL tables; it must not hard-code model
   seed data after this standard is implemented.
10. Updates must be possible per vendor without rebuilding unrelated vendors.

## 3. Project Layout

```text
data/sdkwork-models/
  README.md
  LICENSE
  CHANGELOG.md
  sdkwork-models.json
  package.json
  schemas/
    catalog.schema.json
    index.schema.json
    official-model-snapshot.schema.json
    official-verification-policy.schema.json
    vendor-sources.schema.json
    meter.schema.json
    vendor.schema.json
    family.schema.json
    model.schema.json
    pricing.schema.json
    ranking.schema.json
    provider-overlay.schema.json
  models/
    index.json
    meters.json
    vendors.json
    openai/
      global/
        vendor.json
        families.json
        models/
          gpt-5.2.json
        pricing/
          gpt-5.2.json
        rankings.json
    anthropic/
      global/
        vendor.json
        families.json
        models/
        pricing/
        rankings.json
  overlays/
    clawrouter/
      providers.json
      channels.json
      routes.json
      rankings.json
  sources/
    vendor-sources.json
    official-model-snapshots.json
    official-verification-policy.json
  tools/
    validate-catalog.mjs
    build-index.mjs
    export-clawrouter-seed.mjs
  sdkwork-models-typescript/
  sdkwork-models-python/
  sdkwork-models-java/
  sdkwork-models-rust/
  sdkwork-models-flutter/
```

The `models/` directory is portable and may be copied into any application. The
SDK directories provide language-specific loaders, validators, query APIs, and
package metadata.

### 3.1 Source Manifest

`sources/vendor-sources.json` is required for every release. It defines the
source-of-truth boundaries used by update automation and human review:

- `official.modelsUrl`: vendor official model list or model overview.
- `official.pricingUrl`: vendor official pricing page.
- `official.additionalUrls`: official supporting pages, including cloud
  provider pricing pages when they are the canonical public price source.
- `references`: non-authoritative cross-check sources such as `external/new-api`
  and `external/sub2api`.
- `requiredModels`: current models that must exist as both `models/<id>.json`
  and `pricing/<id>.json`.

The catalog audit must fail when an enabled model or any price row references a
source URL that is not declared for that vendor. `official` price rows should
use official vendor URLs; reference repositories may only back `reference` or
`upstream` price rows unless manually verified against official docs.
The file must satisfy `schemas/vendor-sources.schema.json`, and each
`vendorCode/regionCode` may appear only once.

`sources/official-model-snapshots.json` is the independent official evidence
snapshot for vendor-regions with `verificationStatus: "official_verified"`.
It is not a generated index and it is not a replacement for `vendor-sources`;
it records the set of model IDs observed from approved official pages for the
current catalog version. The file must satisfy
`schemas/official-model-snapshot.schema.json` and must use the same
`schemaVersion` and `catalogVersion` as `sdkwork-models.json`.
Every snapshot vendor entry must include `sourceSnapshotHash`, calculated as
the SHA-256 of that vendor entry after removing `sourceSnapshotHash` and
serializing with the catalog stable JSON order. Release metadata must copy the
per-region hashes into `sourceEvidenceSha256.officialSnapshotHashes` keyed by
`vendorCode/regionCode` so release review can detect whether an individual
official source snapshot changed, even when the covered vendor-region list is
unchanged.

The catalog audit must reject official snapshots when:

- a snapshot vendor-region is not declared in `sources/vendor-sources.json`
- a snapshot vendor-region has no matching `models/<vendorCode>/<regionCode>`
  catalog directory
- a snapshot official URL is outside that vendor-region's declared official
  `modelsUrl`, `pricingUrl`, or `additionalUrls`
- a snapshot repeats the same `modelId`
- a snapshot references a model ID that does not exist in the matching catalog
  vendor-region
- a snapshot `sourceSnapshotHash` does not match the canonical snapshot body
- a vendor-region marked `official_verified` has no snapshot or the snapshot
  omits any required, enabled, or family-default model

Reference repositories such as `external/new-api` and `external/sub2api` may
support comparison, but they are not official snapshot URL boundaries.

`sources/official-verification-policy.json` is the official verification
release gate. It lists `requiredVerifiedVendorRegions` that must remain
`official_verified` for the current catalog release. The file must satisfy
`schemas/official-verification-policy.schema.json`, and its `schemaVersion` and
`catalogVersion` must match `sdkwork-models.json`.

The relationship is bidirectional. Every vendor-region listed in
`requiredVerifiedVendorRegions` must be `official_verified`, and every
vendor-region declared as `official_verified` in `sources/vendor-sources.json`
must appear in `requiredVerifiedVendorRegions`.

The catalog audit must reject the policy when:

- the policy file is missing
- the policy does not use `policy.mode: "release_gate"`
- a required vendor-region appears more than once
- a required vendor-region has no matching catalog directory
- a required vendor-region has no matching source declaration
- a required vendor-region is not marked `official_verified`
- a required vendor-region has no independent official snapshot
- a source declaration is marked `official_verified` but is missing from
  `requiredVerifiedVendorRegions`

## 4. Ownership Boundaries

### 4.1 Model Catalog

`models/` contains only stable model facts:

- model publisher
- model family
- model identifier and display name
- supported input and output modalities
- model capabilities
- context and output limits
- runtime/API compatibility flags
- lifecycle state
- official or curated reference pricing
- source evidence
- optional ranking snapshots

### 4.2 Application Overlay

`overlays/` contains product-specific integration policy:

- access providers such as `openai_direct`, `azure_openai`, `aws_bedrock`, and
  `openrouter`
- provider accounts and channels
- provider model aliases
- route rules and fallback chains
- tenant or commercial ranking overrides

Provider overlays must not rewrite the model vendor. For example, an Anthropic
model accessed through Amazon Bedrock remains under `models/anthropic/`; the
Bedrock channel mapping belongs in an overlay.

### 4.3 ClawRouter Runtime

ClawRouter imports the catalog into canonical database tables:

- `ai_billing_meter`
- `ai_model_vendor`
- `ai_model_family`
- `ai_model`
- `ai_model_capability`
- `ai_model_pricing`
- `ai_model_rank_snapshot`

ClawRouter-specific integration providers, channels, routing rules, secrets,
tenant policies, and access controls remain outside the portable model catalog.


### 4.4 Operating Entity And Regional Billing

`ModelVendor` represents the stable model publisher or upstream model owner. It is
not merely the public brand name, and it is also not a deployment region,
gateway, cloud marketplace, reseller, or route provider. A model such as
`gpt-5.2`, `deepseek-chat`, or an OpenRouter exposed
`anthropic/claude-3-opus` keeps the same `catalogKey = vendorCode/modelId`
even when it has different mainland China, overseas, cloud, or aggregator
deployments.

Regional deployment differences belong to the vendor-region and endpoint
contracts, not to model identity. A vendor region may define different base
URLs, API hosts, billing currencies, billing jurisdictions, price sheets,
discount rules, cache billing rules, availability windows, rate limits,
compliance attributes, and route ranking metadata.

Split `vendorCode` only when the upstream model owner or contract identity is
actually different. Do not create region-coded or product-coded vendors just
because deployment, pricing, or API host differs.

Region/deployment triggers:

- different base URLs or official platform domains, for example mainland China
  and international API hosts
- different billing currencies, for example CNY and USD
- different legal or billing jurisdictions
- separate public price sheets, discount rules, or cache billing rules
- cloud vendors, proxy providers, and aggregators where model access is exposed
  through a different endpoint or supply market

Naming rules:

- `vendorCode` is the unique real vendor identity and must not encode region or product line.
- `regionCode` identifies the vendor operating market, billing currency, legal jurisdiction, and platform scope.
- Mainland China regions use `regionCode: "cn"`.
- International regions use `regionCode: "global"` unless a more specific jurisdiction such as `us`, `eu`, or `apac` is required.
- Product aliases such as Qwen, Kling, Hunyuan, or BigModel must be model families, capabilities, or product metadata, not vendor codes.

Every vendor region must declare `marketScope`, `billingCurrency`,
`billingJurisdiction`, `operatingRegions`, and the base deployment attributes
needed to resolve an endpoint. Every pricing file and price row must use the
same currency as the region `billingCurrency`. Consumers must treat
`catalogKey = vendorCode/modelId` as the stable model identity. When the same
upstream `modelId` is deployed in multiple regions under the same vendor,
`regionCode` remains the explicit supply, deployment endpoint, pricing, and
ranking context rather than becoming part of the model identity.

## 5. Naming Rules

All stable identifiers must be ASCII.

| Field | Rule | Example |
| --- | --- | --- |
| `vendorCode` | lower slug, letters, numbers, hyphen, underscore | `openai` |
| `regionCode` | lower slug for operating/billing region | `global`, `cn` |
| `familyCode` | vendor-local slug | `gpt-5` |
| `modelId` | vendor-native model id; catalog identity is `vendorCode/modelId`; the same model may have multiple regional deployment and pricing rows | `gpt-5.2` |
| `meterCode` | lower slug with domain prefix | `llm_input_token` |
| `priceCode` | globally unique stable slug | `gpt-5.2-input-reference-usd` |
| `snapshotCode` | globally unique stable slug | `openai-commercial-2026-05-08` |

Directory names must match `vendorCode` and `regionCode`. Model and pricing
filenames must match `modelId` with `.json` suffix.

```text
models/openai/global/models/gpt-5.2.json
models/openai/global/pricing/gpt-5.2.json
```

## 6. Manifest Files

### 6.1 Project Manifest

`sdkwork-models.json` describes the standalone project and release.

```json
{
  "name": "sdkwork-models",
  "schemaVersion": "1.0.0",
  "catalogVersion": "2026.05.08.1",
  "generatedAt": "2026-05-08T00:00:00Z",
  "defaultLocale": "en-US",
  "supportedLocales": ["en-US", "zh-CN"],
  "modelsRoot": "models",
  "schemasRoot": "schemas",
  "license": "MIT"
}
```

Required fields:

- `name`
- `schemaVersion`
- `catalogVersion`
- `generatedAt`
- `modelsRoot`
- `schemasRoot`

### 6.2 Catalog Index

`models/index.json` is generated from the vendor directories and must be
reproducible by `tools/build-index.mjs`.

```json
{
  "schemaVersion": "1.0.0",
  "catalogVersion": "2026.05.08.1",
  "generatedAt": "2026-05-08T00:00:00Z",
  "vendors": [
    {
      "vendorCode": "openai",
      "regionCode": "global",
      "path": "openai/global/vendor.json",
      "familiesPath": "openai/global/families.json",
      "modelsPath": "openai/global/models",
      "modelFiles": [
        "openai/global/models/gpt-5.5.json"
      ],
      "pricingPath": "openai/global/pricing",
      "pricingFiles": [
        "openai/global/pricing/gpt-5.5.json"
      ],
      "rankingsPath": "openai/global/rankings.json",
      "modelCount": 12,
      "pricingFileCount": 12,
      "sha256": "..."
    }
  ]
}
```

The `sha256` covers all files in that vendor directory using normalized UTF-8
JSON bytes. A catalog release must not be published when the computed hash does
not match the index.

`modelFiles` and `pricingFiles` are required because remote HTTP/object-storage
catalogs cannot enumerate directories. SDK loaders, the ClawRouter importer,
and release tooling must treat this generated index as the file-level source of
truth for published vendor-region data.

`schemas/index.schema.json` is the static contract for this file-level
manifest. `tools/validate-catalog.mjs` must also perform semantic validation:
each `modelFiles` and `pricingFiles` array must exactly match the generated
vendor-region JSON file list, every declared path must stay inside the matching
`vendorCode/regionCode` directory, and all counts and hashes must match
`tools/build-index.mjs`. A release is invalid when the validator reports any of
`index.model_files.mismatch`, `index.pricing_files.mismatch`,
`index.path.mismatch`, `index.vendor_region.missing`, or
`index.vendor_region.extra`.

### 6.3 Global Meters

`models/meters.json` defines canonical billing meters shared by all vendors.
Vendor pricing files reference these meters by `meterCode`.

```json
{
  "schemaVersion": "1.0.0",
  "meters": [
    {
      "meterCode": "llm_input_token",
      "displayName": "LLM input tokens",
      "modality": "text",
      "billingMode": "token",
      "defaultUnit": "million_tokens",
      "defaultUnitSize": "1000000",
      "quantityPrecision": 0,
      "sortOrder": 10
    }
  ]
}
```

Meter `defaultUnitSize` must be a positive decimal string.

### 6.4 Vendor List

`models/vendors.json` is a lightweight list for applications that need vendor
filters without loading every vendor file.

```json
{
  "schemaVersion": "1.0.0",
  "vendors": [
    {
      "vendorCode": "openai",
      "displayName": "OpenAI",
      "status": "active",
      "path": "openai/vendor.json"
    }
  ]
}
```

## 7. Vendor Contract

Every vendor directory must contain `vendor.json`, `families.json`, `models/`,
and `pricing/`. `rankings.json` is optional but the file should exist with an
empty `snapshots` array when rankings are intentionally absent.

### 7.1 vendor.json

```json
{
  "schemaVersion": "1.0.0",
  "vendorCode": "openai",
  "displayName": "OpenAI",
  "websiteUrl": "https://openai.com/",
  "docsUrl": "https://platform.openai.com/docs/models",
  "pricingUrl": "https://openai.com/api/pricing/",
  "vendorType": "model_vendor",
  "openSource": false,
  "regions": ["global"],
  "status": "active",
  "locales": {
    "zh-CN": {
      "displayName": "OpenAI"
    }
  }
}
```

Allowed `status` values:

- `active`
- `preview`
- `deprecated`
- `retired`

Allowed `vendorType` values:

- `model_vendor`
- `open_source_community`
- `research_lab`

### 7.2 families.json

```json
{
  "schemaVersion": "1.0.0",
  "vendorCode": "openai",
  "families": [
    {
      "familyCode": "gpt-5",
      "displayName": "GPT-5",
      "familyType": "multimodal_llm",
      "primaryModality": "text",
      "status": "active",
      "sortOrder": 10
    }
  ]
}
```

Allowed `familyType` values:

- `llm`
- `multimodal_llm`
- `embedding`
- `rerank`
- `image`
- `video`
- `audio`
- `music`
- `sound_effect`
- `tool`
- `other`

## 8. Model Contract

Each model file must contain one model and must not include pricing rows.

```json
{
  "schemaVersion": "1.0.0",
  "vendorCode": "openai",
  "modelId": "gpt-5.2",
  "displayName": "GPT-5.2",
  "familyCode": "gpt-5",
  "modelType": "multimodal_llm",
  "capabilities": ["responses", "chat", "vision", "tool_calling", "json_schema"],
  "modalities": {
    "input": ["text", "image"],
    "output": ["text"]
  },
  "limits": {
    "contextTokens": 400000,
    "maxInputTokens": 400000,
    "maxOutputTokens": 128000
  },
  "runtime": {
    "apiFormats": ["openai_responses", "openai_chat_completions"],
    "supportsStreaming": true,
    "supportsTools": true,
    "supportsJsonSchema": true,
    "supportsBatch": false
  },
  "lifecycle": {
    "releaseStage": "active",
    "shelfState": "listed",
    "routingState": "enabled",
    "replacementModel": null,
    "releasedAt": null,
    "deprecatedAt": null,
    "retiredAt": null
  },
  "knowledge": {
    "trainingDataCutoff": null
  },
  "descriptions": {
    "en-US": "Flagship reasoning, coding, and agentic model.",
    "zh-CN": "Flagship reasoning, coding, and agentic model."
  },
  "source": {
    "sourceType": "official",
    "sourceUrl": "https://platform.openai.com/docs/models/gpt-5.2",
    "observedAt": "2026-05-08T00:00:00Z"
  },
  "tags": ["reasoning", "coding", "agents", "vision"],
  "sortOrder": 10
}
```

### 8.1 Required Model Fields

- `schemaVersion`
- `vendorCode`
- `modelId`
- `displayName`
- `familyCode`
- `modelType`
- `capabilities`
- `modalities.input`
- `modalities.output`
- `runtime.apiFormats`
- `lifecycle.releaseStage`
- `lifecycle.shelfState`
- `lifecycle.routingState`
- `source.sourceType`
- `source.sourceUrl`
- `source.observedAt`

### 8.2 Capability Values

Allowed capability values:

- `chat`
- `responses`
- `completion`
- `embedding`
- `rerank`
- `vision`
- `image_generation`
- `image_editing`
- `video_generation`
- `audio_input`
- `audio_output`
- `speech_to_text`
- `text_to_speech`
- `music_generation`
- `sound_effect_generation`
- `tool_calling`
- `json_schema`
- `batch`
- `realtime`
- `moderation`
- `computer_use`
- `web_search`
- `file_search`
- `code_interpreter`

### 8.3 Modality Values

Allowed modality values:

- `text`
- `image`
- `audio`
- `video`
- `embedding`
- `music`
- `sound_effect`
- `tool`
- `file`
- `structured_data`

Input and output modality arrays must be non-empty and de-duplicated.

### 8.4 API Format Values

Allowed API format values:

- `openai_chat_completions`
- `openai_responses`
- `openai_embeddings`
- `openai_images`
- `openai_audio`
- `openai_realtime`
- `openai_compatible`
- `vendor_native`

### 8.5 Lifecycle Values

Allowed `releaseStage` values:

- `active`
- `preview`
- `beta`
- `deprecated`
- `retired`
- `catalog_only`

Allowed `shelfState` values:

- `listed`
- `hidden`
- `archived`

Allowed `routingState` values:

- `enabled`
- `disabled`
- `catalog_only`

Commercial availability rule:

- Any model with `routingState: "enabled"`, `shelfState: "listed"`, or
  `releaseStage: "active"` must have a matching pricing file with at least one
  billable price row.
- Models whose official price has not been confirmed must stay
  `routingState: "catalog_only"` and `shelfState: "hidden"` until pricing is
  published and sourced.
- `families[].defaultModel` may point only to a defined model that is enabled,
  listed, and priced. Families may omit `defaultModel` when the catalog tracks a
  product line before a complete commercial model entry exists.

## 9. Pricing Contract

Each pricing file must match exactly one model file.

```json
{
  "schemaVersion": "1.0.0",
  "vendorCode": "openai",
  "modelId": "gpt-5.2",
  "currency": "USD",
  "prices": [
    {
      "priceCode": "gpt-5.2-input-reference-usd",
      "priceType": "reference",
      "meterCode": "llm_input_token",
      "unit": "million_tokens",
      "unitSize": "1000000",
      "unitPrice": "1.750000",
      "minimumQuantity": "0",
      "billingScope": "model",
      "region": "global",
      "effectiveFrom": "2026-05-08T00:00:00Z",
      "effectiveTo": null,
      "source": {
        "sourceType": "official",
        "sourceUrl": "https://openai.com/api/pricing/",
        "observedAt": "2026-05-08T00:00:00Z"
      }
    }
  ]
}
```

### 9.1 Required Price Fields

- `priceCode`
- `priceType`
- `meterCode`
- `unit`
- `unitSize`
- `unitPrice`
- `minimumQuantity`
- `billingScope`
- `region`
- `effectiveFrom`
- `source.sourceType`
- `source.sourceUrl`
- `source.observedAt`

### 9.2 Price Types

Allowed `priceType` values:

- `official`
- `reference`
- `upstream`
- `customer`
- `internal_cost`
- `promotional`

The portable catalog should primarily contain `official` and `reference`
prices. `upstream`, `customer`, and `internal_cost` usually belong in a product
overlay unless they are intentionally published as reusable reference data.

### 9.3 Billing Scope

Allowed `billingScope` values:

- `model`
- `vendor`
- `provider`
- `channel`
- `region`
- `plan`

Portable model pricing should use `model` or `region` unless a catalog entry is
explicitly modeling provider-specific public pricing.

### 9.4 Decimal Rule

These fields must be decimal strings:

- `unitSize`
- `unitPrice`
- `minimumQuantity`
- `maximumQuantity`
- `quantityStep`
- `includedQuantity`
- `minChargeAmount`
- `referenceMultiplier`
- `markupAmount`

Valid examples:

```text
0
1
1000000
0.000001
14.000000
```

Invalid examples:

```text
1e-6
$1.00
1,000
-1
```

## 10. Ranking Contract

Rankings are optional projections and must not be required to load model facts
or prices.

```json
{
  "schemaVersion": "1.0.0",
  "vendorCode": "openai",
  "snapshots": [
    {
      "snapshotCode": "openai-commercial-2026-05-08",
      "snapshotDate": "2026-05-08",
      "period": "daily",
      "scope": "commercial-default",
      "sourceType": "sdkwork-curated",
      "items": [
        {
          "modelId": "gpt-5.2",
          "rank": 1,
          "previousRank": 1,
          "score": "0.995000",
          "dimensions": {
            "quality": "0.990000",
            "cost": "0.780000",
            "latency": "0.820000",
            "routingReadiness": "0.980000"
          }
        }
      ]
    }
  ]
}
```

Scores and dimensions are decimal strings.

## 11. Overlay Contract

Overlays are optional and product-specific. The ClawRouter overlay is stored
under `overlays/clawrouter/`.

```json
{
  "schemaVersion": "1.0.0",
  "overlayCode": "clawrouter",
  "routes": [
    {
      "routeCode": "global-frontier-default",
      "match": {
        "route": "frontier",
        "region": "global"
      },
      "targetModelId": "gpt-5.2",
      "candidateModelIds": ["claude-opus-4-7", "gemini-3.1-pro-preview"],
      "constraints": {
        "requireHealthyChannel": true,
        "selection": "weighted_quality_cost"
      }
    }
  ]
}
```

Overlay files may reference catalog `modelId` values, but they must not define
new model facts. If a model is not in `models/`, the overlay is invalid.

## 12. Validation Rules

The catalog validator must reject:

1. missing `sdkwork-models.json`
2. missing `models/index.json`
3. missing `models/meters.json`
4. missing `models/vendors.json`
5. vendor directory name not matching `vendorCode`
6. duplicate `vendorCode`
7. duplicate `modelId`
8. model referencing a missing vendor
9. model referencing a missing family
10. pricing file without matching model file
11. price referencing a missing meter
12. price amount or quantity represented as number or float
13. price without `sourceUrl`, `observedAt`, or `effectiveFrom`
14. empty input or output modalities
15. unknown capability, modality, API format, lifecycle, or price enum
16. generated `models/index.json` hash drift
17. overlay referencing unknown models
18. ClawRouter hard-coded model seed additions after importer adoption
19. vendor missing from `sources/vendor-sources.json`
20. required current model missing a model or pricing JSON file
21. enabled model or price source URL not declared in the source manifest
22. enabled, listed, or active model without a billable pricing file
23. family default model missing, hidden, non-routable, or unpriced
24. missing or malformed `sources/official-verification-policy.json`
25. duplicate or unenforced `requiredVerifiedVendorRegions` release gate entry
26. required official verification vendor-region without matching source,
    catalog directory, `official_verified` status, or official snapshot
27. `official_verified` source declaration missing from the release gate policy

## 13. Versioning

The catalog has three version concepts:

- `schemaVersion`: JSON contract version
- `catalogVersion`: data release version
- language package version: SDK implementation release version

`schemaVersion` uses semantic versioning. Breaking field or enum changes require
a major version bump. Additive optional fields require a minor version bump.
Documentation-only or validation clarification changes may use a patch bump.

`catalogVersion` uses date-based release numbering:

```text
YYYY.MM.DD.N
```

Examples:

```text
2026.05.08.1
2026.05.07.2
2026.05.08.1
```

Language packages may release more often than data catalog versions, but each
package must expose the bundled `schemaVersion` and `catalogVersion`.

## 14. Release Artifacts

A catalog release must include:

- source JSON files
- generated `models/index.json`
- source evidence checksums for `sources/vendor-sources.json`,
  `sources/official-model-snapshots.json`, and
  `sources/official-verification-policy.json`
- source audit metadata including `requiredVerifiedRegionCount`,
  `requiredVerifiedRegions`, `officialVerifiedSourceRegionCount`, and
  `officialVerifiedSourceRegions`
- validation report
- package archives for supported SDKs
- changelog entry
- Git tag

Recommended tag format:

```text
catalog-v2026.05.08.1
```

Recommended package names:

- TypeScript: `@sdkwork/models`
- Python: `sdkwork-models`
- Java: `com.sdkwork.models:sdkwork-models`
- Rust: `sdkwork-models`
- Flutter/Dart: `sdkwork_models`

## 15. SDK Standard

All SDKs must expose the same domain concepts and comparable method names. A
language may adapt naming style to idiomatic conventions, but behavior must be
equivalent.

### 15.1 Required Domain Types

Every SDK must provide these public types:

- `ModelCatalog`
- `ModelVendor`
- `ModelFamily`
- `ModelInfo`
- `ModelPricing`
- `ModelPrice`
- `BillingMeter`
- `ModelRankingSnapshot`
- `CatalogSource`
- `CatalogValidationResult`
- `CatalogValidationIssue`

### 15.2 Required Loader APIs

Every SDK must support:

```text
loadCatalog(pathOrUrl)
loadBundledCatalog()
loadVendorCatalog(pathOrUrl, vendorCode, regionCode)
validateCatalog(catalog)
```

Behavior:

- local paths load directory-based JSON
- URLs load `sdkwork-models.json`, `models/index.json`, and required vendor
  files
- remote loaders must support immutable cache keys based on `catalogVersion`
  and `sha256`
- bundled loaders must expose the bundled data version
- validation must return all issues, not fail fast, unless JSON parsing itself
  fails

### 15.3 Required Query APIs

Every SDK must support:

```text
listVendors(catalog)
listVendorRegions(catalog)
listModels(catalog, filter)
listAvailableModels(catalog, filter)
findModel(catalog, catalogKey)
findModelByVendorRegion(catalog, vendorCode, regionCode, modelId)
getModelPrices(catalog, catalogKey)
getBestReferencePrice(catalog, catalogKey, meterCode)
listModelsByCapability(catalog, capability)
listModelsByModality(catalog, input, output)
listMeters(catalog)
findMeter(catalog, meterCode)
```

Filters must support:

- `vendorCode`
- `regionCode`
- `familyCode`
- `capability`
- `inputModality`
- `outputModality`
- `releaseStage`
- `shelfState`
- `routingState`
- `apiFormat`

`listAvailableModels` is the safe application default. It applies the same
filter contract as `listModels`, then restricts results to models with
`routingState: "enabled"`, `shelfState: "listed"`, and at least one matching
billable pricing row. Applications that render purchasable models, routing
choices, playground selectors, or cost previews should use this helper unless
they explicitly need catalog-only discovery data.

### 15.4 Error Model

SDKs must distinguish:

- parse errors
- schema validation errors
- reference validation errors
- IO errors
- network errors
- unsupported schema version errors

Application code must be able to inspect structured error codes. Human-readable
messages are not sufficient for integration handling.

### 15.5 Decimal Model

SDKs must not expose prices as binary floating-point values.

Required behavior by language:

| Language | Required representation |
| --- | --- |
| TypeScript | string plus optional Decimal adapter hook |
| Python | `decimal.Decimal` or string-preserving wrapper |
| Java | `BigDecimal` |
| Rust | `rust_decimal::Decimal` or string-preserving newtype |
| Flutter/Dart | string plus optional decimal package adapter |

Serializing and deserializing a price must preserve the original decimal string
unless an explicit normalized decimal formatter is requested.

## 16. TypeScript SDK Standard

Package directory:

```text
sdkwork-models-typescript/
  package.json
  tsconfig.json
  src/
    index.ts
    catalog.ts
    loaders.ts
    query.ts
    validation.ts
    types.ts
```

Public API:

```ts
import {
  loadCatalog,
  loadBundledCatalog,
  loadVendorCatalog,
  validateCatalog,
  findModel,
  getModelPrices,
  getBestReferencePrice,
  listModelsByCapability,
} from "@sdkwork/models";
```

Rules:

- ESM-first package with generated `.d.ts` types.
- No runtime dependency on ClawRouter APIs.
- Browser and Node loaders must be separate entrypoints when filesystem APIs are
  used.
- Price fields stay strings.
- Validation issues use stable `code`, `path`, and `message` fields.

## 17. Python SDK Standard

Package directory:

```text
sdkwork-models-python/
  pyproject.toml
  sdkwork_models/
    __init__.py
    catalog.py
    loaders.py
    query.py
    validation.py
    types.py
```

Public API:

```python
from sdkwork_models import load_catalog, find_model, get_model_prices

catalog = load_catalog("./models")
model = find_model(catalog, "openai/gpt-5.2")
prices = get_model_prices(catalog, "openai/gpt-5.2")
```

Rules:

- Python 3.10+.
- Price helpers return `Decimal` where arithmetic is requested.
- Raw records preserve original JSON string values.
- Network loading is optional but must be explicit.

## 18. Java SDK Standard

Package directory:

```text
sdkwork-models-java/
  pom.xml
  src/main/java/com/sdkwork/models/
    ModelCatalog.java
    SdkworkModels.java
    ModelCatalogLoader.java
    ModelCatalogQuery.java
    ModelCatalogValidator.java
```

Public API:

```java
ModelCatalog catalog = SdkworkModels.loadCatalog(Path.of("./models"));
ModelInfo model = catalog.findModel("openai/gpt-5.2").orElseThrow();
List<ModelPrice> prices = catalog.getModelPrices("openai/gpt-5.2");
```

Rules:

- Java 21 target.
- Prices use `BigDecimal`.
- JSON parsing must preserve unknown optional fields in an extension map.
- Validation errors expose stable machine codes.
- No Spring dependency in the core loader package.

## 19. Rust SDK Standard

Package directory:

```text
sdkwork-models-rust/
  Cargo.toml
  src/
    lib.rs
    catalog.rs
    loader.rs
    query.rs
    validation.rs
    types.rs
```

Public API:

```rust
use sdkwork_models::{load_catalog, CatalogQuery};

let catalog = load_catalog("./models")?;
let model = catalog.find_model("openai/gpt-5.2")?;
let prices = catalog.model_prices("openai/gpt-5.2");
```

Rules:

- Rust 2021 edition or newer.
- `serde` is the JSON contract boundary.
- Decimal values use a string-preserving newtype, with optional
  `rust_decimal` feature.
- ClawRouter importer may depend on this crate, but this crate must not depend
  on ClawRouter.

## 20. Flutter/Dart SDK Standard

Package directory:

```text
sdkwork-models-flutter/
  pubspec.yaml
  lib/
    sdkwork_models.dart
    src/catalog.dart
    src/loaders.dart
    src/query.dart
    src/validation.dart
    src/types.dart
```

Public API:

```dart
final catalog = await SdkworkModels.loadCatalog('assets/models');
final model = catalog.findModel('openai/gpt-5.2');
final prices = catalog.getModelPrices('openai/gpt-5.2');
```

Rules:

- Works with Flutter asset bundles.
- Price fields stay strings by default.
- Network loading must be opt-in.
- No dependency on ClawRouter app/backend SDKs.

## 21. Application Integration Modes

### 21.1 Local Directory

Applications copy or vendor the catalog project root and load it at startup.
This mode is preferred for offline desktop, mobile, private cloud, and embedded
deployments.

### 21.2 Bundled SDK Data

Language packages may embed a catalog snapshot. This mode is preferred for
simple application integrations that do not need independent model updates.

### 21.3 Remote Catalog

Applications may load immutable catalog releases from GitHub raw, CDN, object
storage, or an internal artifact service. Remote loading must:

- verify `catalogVersion`
- verify vendor `sha256`
- read `modelFiles` and `pricingFiles` from `models/index.json`
- cache by immutable version
- reject hash drift
- fail closed when validation fails

## 22. ClawRouter Import Standard

The ClawRouter importer must:

1. load `sdkwork-models.json`
2. load `models/index.json`
3. validate all referenced vendor data
4. import `models/meters.json` into `ai_billing_meter`
5. import `vendor.json` into `ai_model_vendor`
6. import `families.json` into `ai_model_family`
7. import `modelFiles` into `ai_model` and `ai_model_capability`
8. import `pricingFiles` into `ai_model_pricing`
9. import `rankings.json` into `ai_model_rank_snapshot`
10. import `overlays/clawrouter/*` into integration and routing tables
11. record `catalogVersion` in `system_installation_state`
12. support per-vendor refresh when only one vendor changes

The importer must be idempotent. Re-running an import for the same catalog
version must not duplicate rows, change tenant-owned custom rows, or erase local
tenant policy.

## 23. Git and Submodule Standard

`sdkwork-models` is intended to be an independent Git repository:

```text
https://github.com/Sdkwork-Cloud/sdkwork-models.git
```

When embedded in ClawRouter, it should be mounted as:

```text
data/sdkwork-models
```

ClawRouter must treat this path as a data dependency. Product logic must not
modify catalog files at runtime. Updates are made by advancing the submodule
commit or by loading a signed remote catalog release.

## 24. Documentation Requirements

Each catalog release must update:

- `README.md`
- `CHANGELOG.md`
- `sdkwork-models.json`
- `models/index.json`
- package README files when SDK APIs change

Each vendor addition must document:

- vendor source URL
- pricing source URL
- source manifest entry and `requiredModels`
- observed date
- known pricing caveats
- lifecycle status
- whether provider overlay mappings are intentionally omitted

## 25. Implementation Checklist

- Add JSON schemas.
- Add at least one complete vendor directory.
- Add validation tooling.
- Add index generation.
- Add language SDK skeletons.
- Add TypeScript loader first for browser and Node app integration.
- Add Rust loader/importer for ClawRouter.
- Replace hard-coded ClawRouter model seed data with catalog import.
- Add tests that forbid new hard-coded model seed arrays.
- Add release workflow for independent `sdkwork-models` Git tags.


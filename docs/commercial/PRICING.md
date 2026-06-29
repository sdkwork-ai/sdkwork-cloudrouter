# SDKWork Claw Router Commercial Pricing Model

**Document Version:** 1.0
**Last Updated:** 2026-06-27
**Status:** active
**Owner:** SDKWork commercial team
**Application:** sdkwork-clawrouter

## 1. Overview

This document defines the commercial authorization pricing model for SDKWork
Claw Router. Claw Router source is licensed under
`AGPL-3.0-or-later AND LicenseRef-SDKWork-Commercial-Restriction`. Commercial use
requires prior written authorization from SDKWork, granted under one of the
commercial tiers described here.

The pricing model combines a recurring subscription fee with metered token
usage. It is designed to be transparent and predictable, modeled on the
public pricing pages of OpenAI Platform, Anthropic Console, AWS Bedrock, and
Azure AI, while reflecting the additional value of an enterprise multi-tenant
gateway with billing, audit, and SLA controls.

All prices are listed in United States dollars (USD) unless stated otherwise.
Taxes, including VAT, GST, and withholding tax, are added where applicable.

## 2. License Tiers

Claw Router is offered in four tiers. Each tier maps to a specific commercial
authorization scope and a different level of platform capability, support, and
service-level commitment.

### 2.1 Community Edition

- **License:** AGPL-3.0-or-later, open source, free of charge.
- **Use case:** Self-deployment, single tenant, community support only.
- **Capability scope:** Core OpenAI-compatible gateway, basic model catalog,
  local SQLite or external PostgreSQL, single-tenant console, OpenAPI surface.
- **Excludes:** Multi-tenant isolation, full admin console, SSO, audit log
  enhancement, paid support, SLA commitment, commercial production use.
- **Commercial use:** Prohibited without a separate written commercial
  authorization. See [COMMERCIAL-LICENSE.md](../../COMMERCIAL-LICENSE.md) and
  [LICENSE](../../LICENSE).

### 2.2 Pro Edition

- **License:** Commercial subscription (monthly or annual).
- **Use case:** Growing teams and commercial deployments that need
  multi-tenant isolation, full admin console, and an uptime commitment.
- **Capability scope:** Everything in Community Edition, plus multi-tenant
  isolation, full admin console (`/backend/v3/api`), full app console
  (`/app/v3/api`), provider routing, rate limit tiers, per-tenant billing,
  email support, 99.5% monthly uptime SLA.
- **Rate limit tier:** Tier 2 by default; Tier 3 after qualifying usage.
- **Support:** Email, 24-hour first response during business hours.

### 2.3 Enterprise Edition

- **License:** Commercial enterprise subscription (annual recommended).
- **Use case:** Organizations that require SSO, enhanced audit, dedicated
  support, higher SLA, private deployment, and custom integration.
- **Capability scope:** Everything in Pro Edition, plus SSO/SAML and OIDC,
  enhanced immutable audit log with retention controls, dedicated technical
  account manager, 99.9% monthly uptime SLA, private deployment option,
  custom provider and routing integration, priority security disclosures.
- **Rate limit tier:** Tier 4.
- **Support:** Email plus dedicated Slack channel, 1-hour first response for
  P1 incidents, telephone and SMS escalation for critical incidents.

### 2.4 OEM / White-label License

- **License:** One-time license fee plus annual royalty.
- **Use case:** Vendors that embed Claw Router inside a commercial product,
  rebrand it, or redistribute it as part of a managed offering to unlimited
  tenants.
- **Capability scope:** Everything in Enterprise Edition, plus white-label
  branding, unlimited tenants, embedded deployment, redistribution rights,
  custom SLA negotiation.
- **Commercial terms:** One-time license fee and annual royalty are governed
  by a separate OEM agreement. Contact `sales@sdkwork.com` for terms.

## 3. Pricing Matrix

The table below summarizes the published list prices. Volume discounts,
multi-year contracts, and OEM terms are negotiated separately.

| Edition | Base fee | Included tokens | Overage rate | Annual discount | SLA |
| --- | --- | --- | --- | --- | --- |
| Community | Free | N/A (self-supplied) | N/A | N/A | None |
| Pro | $99 / month | 100M tokens / month | $0.50 / 1M tokens | Not applicable | 99.5% monthly uptime |
| Enterprise | $999 / month | 1B tokens / month | $0.40 / 1M tokens | 15% on annual prepay | 99.9% monthly uptime |
| OEM | $49,999 one-time + 5% annual royalty | Negotiated | Negotiated | Negotiated | Custom |

Notes:

- Included tokens are shared across all tenants on the licensed instance and
  cover the sum of input and output tokens metered by Claw Router.
- Overage tokens are billed at the end of each billing cycle based on actual
  metered usage recorded in `ai_usage_fact`.
- Enterprise annual prepay applies the 15% discount to the base subscription
  fee only; overage tokens are billed at the published overage rate.
- OEM royalty is calculated as 5% of gross revenue attributable to the
  embedded Claw Router functionality, reported quarterly and audited annually.

## 4. Token Metering

### 4.1 Token counting basis

- Tokens are counted using the OpenAI `tiktoken` tokenizer for OpenAI-compatible
  models. For models that expose their own tokenizer through the provider relay,
  Claw Router uses the provider-reported token counts when available and falls
  back to `tiktoken` estimation otherwise.
- Billable tokens are the sum of input (prompt) and output (completion) tokens
  for each successful request. The `usage` object returned by the
  OpenAI-compatible `/v1/*` surface is the metering source of truth.
- Streaming responses are billed on the actual accumulated tokens reported in
  the final stream chunk, not on estimated buffer size.

### 4.2 Model multipliers

Different models carry different resource and provider cost. Claw Router
applies a model multiplier to the raw token count before billing so that
pricing reflects actual cost of goods sold. The multiplied value is the
billable token count recorded in `ai_usage_fact`.

| Model family | Multiplier | Rationale |
| --- | --- | --- |
| GPT-4 family | 1.0x | Reference baseline |
| GPT-3.5 family | 0.5x | Lower provider cost |
| Claude family | 1.2x | Higher provider cost |
| Other hosted frontier models | 1.0x | Default |
| Self-deployed / open-weight models | 0.1x | No provider pass-through cost |

Model multipliers are versioned and published in the model catalog. Claw
Router records the multiplier applied to each request in the usage fact row so
billing is auditable.

### 4.3 Non-billable requests

The following requests are not counted toward billable token usage:

- Requests that return an HTTP 5xx error caused by Claw Router or an upstream
  provider fault, when no successful completion is returned.
- Requests rejected by Claw Router rate limiting (HTTP 429) before any
  provider call is made.
- Requests rejected by authentication, authorization, or firewall rules
  before any provider call is made.
- Idempotent replay requests that return a cached response within the
  idempotency window.
- Health checks and OpenAPI metadata requests against `/healthz`, `/readyz`,
  and `/openapi.json`.

Requests that return a successful completion are always billable, including
completions that the application later discards.

## 5. Additional Services Pricing

| Service | Rate | Unit |
| --- | --- | --- |
| Additional token overage (Pro) | $0.50 | per 1M tokens |
| Additional token overage (Enterprise) | $0.40 | per 1M tokens |
| Volume token prepay (>= 100B tokens) | $0.30 | per 1M tokens |
| Dedicated technical support | $499 | per hour |
| On-site implementation engagement | $15,000 | per week |
| Custom development | $2,500 | per person-day |
| Dedicated single-tenant SaaS environment | Custom | per month |
| Private offline deployment package | Custom | per release |

Volume token prepay pricing requires a committed minimum purchase and is
governed by a separate order form.

## 6. Payment Methods

| Method | Region | Notes |
| --- | --- | --- |
| Stripe (credit card, ACH) | International | Default for Pro and Enterprise self-serve subscriptions |
| Alipay | China | For customers invoiced in CNY-equivalent amounts |
| WeChat Pay | China | For customers invoiced in CNY-equivalent amounts |
| Wire transfer | Global | For Enterprise and OEM contracts; invoice-based billing |

Pro Edition is billed monthly in advance. Enterprise Edition is billed
annually in advance by default; monthly billing is available on request. OEM
license fees are due on contract execution; royalties are invoiced quarterly
and payable within 30 days of invoice.

## 7. Refund Policy

- **14-day money-back guarantee:** New Pro and Enterprise subscriptions are
  eligible for a full refund of the base subscription fee within 14 calendar
  days of the first paid billing cycle, provided the customer has not exceeded
  110% of the included monthly token allowance. Token overage charges are
  non-refundable.
- **Service-level shortfall:** When Claw Router fails to meet the committed
  monthly uptime SLA, the customer is eligible for service credits according
  to the policy in [docs/legal/SLA.md](../legal/SLA.md). Service credits are
  applied to the next billing cycle and are not paid out as cash.
- **OEM licenses:** One-time license fees are non-refundable after delivery of
  the licensed build. Royalty refunds are governed by the OEM agreement.
- **Involuntary suspension:** If SDKWork suspends a customer account for
  material breach and the breach is later determined to be unfounded, SDKWork
  will issue a pro-rated service credit for the suspension period.

Refund requests must be submitted to `billing@sdkwork.com` within the
eligible window with the subscription ID and billing date.

## 8. Plan Upgrades And Downgrades

- Upgrades from Pro to Enterprise take effect at the start of the next billing
  cycle. The customer is billed the prorated difference for the remainder of
  the current cycle if upgrading mid-cycle.
- Downgrades from Enterprise to Pro take effect at the start of the next
  billing cycle. Existing SLA commitments remain in effect until the end of
  the current paid cycle.
- Overage token balances do not carry over between billing cycles.
- Included token allowances do not accumulate across unused billing cycles.

## 9. Contact

- Sales: `sales@sdkwork.com`
- Billing: `billing@sdkwork.com`
- Support (Pro): `support@sdkwork.com`
- Support (Enterprise): dedicated Slack channel plus `enterprise-support@sdkwork.com`

## 10. References

- [LICENSE](../../LICENSE)
- [COMMERCIAL-LICENSE.md](../../COMMERCIAL-LICENSE.md)
- [Service Level Agreement](../legal/SLA.md)
- [Edition Tier Matrix](../legal/TIER_MATRIX.md)
- [Product PRD](../product/prd/PRD.md)

## 11. Revision History

| Version | Date | Summary |
| --- | --- | --- |
| 1.0 | 2026-06-27 | Initial commercial pricing model publication |

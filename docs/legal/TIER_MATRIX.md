# SDKWork Claw Router Edition Tier Matrix

**Document Version:** 1.0
**Last Updated:** 2026-06-27
**Status:** active
**Owner:** SDKWork commercial team
**Application:** sdkwork-clawrouter

## 1. Overview

This matrix compares the four SDKWork Claw Router editions: Community, Pro,
Enterprise, and OEM / White-label. Use it to select the edition that matches
your deployment model, capability needs, and commercial expectations.

Pricing details are in [docs/commercial/PRICING.md](../commercial/PRICING.md).
Service-level commitments are in [docs/legal/SLA.md](./SLA.md). License terms
are in [LICENSE](../../LICENSE) and [COMMERCIAL-LICENSE.md](../../COMMERCIAL-LICENSE.md).

Legend:

- "Included" means the capability is part of the edition.
- "Add-on" means the capability is available for an additional fee.
- "Not available" means the capability is not offered in the edition and
  cannot be purchased as an add-on.

## 2. Gateway Capability

| Capability | Community | Pro | Enterprise | OEM |
| --- | --- | --- | --- | --- |
| OpenAI-compatible `/v1/chat/completions` | Included | Included | Included | Included |
| `/v1/embeddings` | Included | Included | Included | Included |
| `/v1/images/generations` | Included | Included | Included | Included |
| `/v1/audio/*` | Included | Included | Included | Included |
| `/v1/models` | Included | Included | Included | Included |
| Provider circuit breaker and failover | Included | Included | Included | Included |
| Idempotency cache | Included | Included | Included | Included |
| Streaming SSE passthrough | Included | Included | Included | Included |
| Custom provider relay integration | Not available | Add-on | Included | Included |

## 3. Management Console

| Capability | Community | Pro | Enterprise | OEM |
| --- | --- | --- | --- | --- |
| Single-tenant console | Included | Included | Included | Included |
| Full admin console `/backend/v3/api` | Not available | Included | Included | Included |
| Full app console `/app/v3/api` | Not available | Included | Included | Included |
| Portal branding customization | Not available | Not available | Add-on | Included |
| White-label product rename | Not available | Not available | Not available | Included |
| Custom portal theme and domain | Not available | Add-on | Included | Included |
| Playground and API reference | Included | Included | Included | Included |

## 4. Multi-Tenancy And Isolation

| Capability | Community | Pro | Enterprise | OEM |
| --- | --- | --- | --- | --- |
| Tenant isolation at IAM layer | Not available | Included | Included | Included |
| Tenant isolation at SQL layer | Not available | Included | Included | Included |
| Per-tenant API keys | Not available | Included | Included | Included |
| Per-tenant rate limits | Not available | Included | Included | Included |
| Per-tenant billing and usage settlement | Not available | Included | Included | Included |
| Maximum tenants | 1 | 25 | Unlimited | Unlimited |
| Tenant hierarchy (group accounts) | Not available | Add-on | Included | Included |

## 5. Security And Compliance

| Capability | Community | Pro | Enterprise | OEM |
| --- | --- | --- | --- | --- |
| Per-tenant signing keys | Not available | Included | Included | Included |
| HSTS default on | Included | Included | Included | Included |
| CSP strict mode | Included | Included | Included | Included |
| Artifact signature required | Included | Included | Included | Included |
| SBOM (SPDX 2.3) per release | Included | Included | Included | Included |
| SSO / SAML | Not available | Not available | Included | Included |
| OIDC single sign-on | Not available | Not available | Included | Included |
| Enhanced immutable audit log | Not available | Not available | Included | Included |
| Audit log retention beyond 90 days | Not available | Not available | Included | Included |
| Private offline deployment package | Not available | Not available | Add-on | Included |
| SOC 2 Type II evidence access | Not available | Not available | Included | Included |
| Priority security disclosure notifications | Not available | Not available | Included | Included |

## 6. Service Level Agreement

| Commitment | Community | Pro | Enterprise | OEM |
| --- | --- | --- | --- | --- |
| Monthly uptime SLA | None | 99.5% | 99.9% | Custom |
| P1 incident response | Best effort | 4 hours | 1 hour | Custom |
| P2 incident response | Best effort | 8 hours | 4 hours | Custom |
| P3 incident response | Best effort | 24 hours | 12 hours | Custom |
| Service credit on SLA miss | Not available | Up to 50% of monthly fee | Up to 50% of monthly fee | Custom |
| Scheduled maintenance window | N/A | Second Sunday 02:00-06:00 UTC | Second Sunday 02:00-06:00 UTC | Custom |
| Maintenance notification lead time | N/A | 72 hours | 72 hours | Custom |

## 7. Rate Limits

| Tier | Community | Pro | Enterprise | OEM |
| --- | --- | --- | --- | --- |
| Tier 1 (60 RPM, 60K TPM) | Default | Available | Available | Available |
| Tier 2 (600 RPM, 600K TPM) | Not available | Default | Available | Available |
| Tier 3 (3,000 RPM, 3M TPM) | Not available | After qualifying usage | Available | Available |
| Tier 4 (10,000 RPM, 10M TPM) | Not available | Not available | Default | Available |
| Custom rate limit above Tier 4 | Not available | Not available | Add-on | Custom |

## 8. Support

| Capability | Community | Pro | Enterprise | OEM |
| --- | --- | --- | --- | --- |
| Community issue tracker | Included | Included | Included | Included |
| Email support | Not available | Included | Included | Included |
| Dedicated Slack channel | Not available | Not available | Included | Included |
| Dedicated technical account manager | Not available | Not available | Included | Included |
| Telephone and SMS escalation for P1 | Not available | Not available | Included | Included |
| On-site implementation engagement | Not available | Add-on | Add-on | Add-on |
| Custom development services | Not available | Add-on | Add-on | Add-on |
| 24x7 coverage for P1 and P2 | Not available | Not available | Included | Custom |

## 9. Deployment And Customization

| Capability | Community | Pro | Enterprise | OEM |
| --- | --- | --- | --- | --- |
| Self-hosted deployment | Included | Included | Included | Included |
| SDKWork-managed SaaS deployment | Not available | Add-on | Add-on | Not available |
| Private cloud deployment | Included | Included | Included | Included |
| Air-gapped / offline deployment | Included | Included | Add-on | Included |
| Custom provider integration | Not available | Add-on | Included | Included |
| Custom routing policy | Not available | Add-on | Included | Included |
| Source code modification rights | AGPL only | Not available | Not available | Under OEM agreement |
| Redistribution rights | AGPL only | Not available | Not available | Included |

## 10. Commercial Terms

| Term | Community | Pro | Enterprise | OEM |
| --- | --- | --- | --- | --- |
| License | AGPL-3.0-or-later | Commercial subscription | Commercial subscription | Commercial OEM agreement |
| Base fee | Free | $99 / month | $999 / month | $49,999 one-time |
| Included tokens | Self-supplied | 100M / month | 1B / month | Negotiated |
| Overage rate | N/A | $0.50 / 1M tokens | $0.40 / 1M tokens | Negotiated |
| Annual discount | N/A | Not applicable | 15% on annual prepay | Negotiated |
| Royalty | N/A | N/A | N/A | 5% of gross revenue |
| Refund window | N/A | 14 days | 14 days | Governed by OEM agreement |
| Payment methods | N/A | Stripe, Alipay, WeChat Pay | Stripe, Alipay, WeChat Pay, wire | Wire |

## 11. Selection Guide

- Choose **Community Edition** for evaluation, single-developer projects, or
  internal non-commercial use where the AGPL obligations are acceptable and
  no SLA is required.
- Choose **Pro Edition** for commercial deployments that need multi-tenant
  isolation, full admin and app consoles, per-tenant billing, and a 99.5%
  uptime commitment.
- Choose **Enterprise Edition** for organizations that need SSO, enhanced
  audit, dedicated support, 99.9% uptime, private deployment, and custom
  integration.
- Choose **OEM / White-label License** for vendors that embed Claw Router
  inside a commercial product, rebrand it, or redistribute it.

Contact `sales@sdkwork.com` for edition selection guidance, custom terms,
and OEM licensing.

## 12. References

- [Commercial Pricing Model](../commercial/PRICING.md)
- [Service Level Agreement](./SLA.md)
- [LICENSE](../../LICENSE)
- [COMMERCIAL-LICENSE.md](../../COMMERCIAL-LICENSE.md)
- [Product PRD](../product/prd/PRD.md)
- [Technical architecture](../architecture/tech/TECH_ARCHITECTURE.md)

## 13. Revision History

| Version | Date | Summary |
| --- | --- | --- |
| 1.0 | 2026-06-27 | Initial edition tier matrix publication |

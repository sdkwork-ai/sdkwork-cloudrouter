# SDKWork Claw Router Service Level Agreement

**Document Version:** 1.0
**Last Updated:** 2026-06-27
**Status:** active
**Owner:** SDKWork operations
**Application:** sdkwork-clawrouter

## 1. Overview

This Service Level Agreement (SLA) governs the commercial service levels for
SDKWork Claw Router Pro Edition and Enterprise Edition customers. It defines
the availability commitments, incident response times, service credit policy,
rate-limit tiers, and support channels for commercial deployments.

The Community Edition is open source and is not covered by this SLA. OEM and
white-label deployments are governed by a separate agreement that may
negotiate custom SLA terms.

## 2. Scope

This SLA applies to:

- Pro Edition subscriptions.
- Enterprise Edition subscriptions.
- The Claw Router managed gateway endpoints (`/v1/*`, `/app/v3/api`,
  `/backend/v3/api`) and the edge server health endpoints (`/healthz`,
  `/readyz`).

This SLA does not apply to:

- Community Edition self-deployments.
- Customer-supplied upstream AI provider latency or outages, except where
  the failure is the direct result of a Claw Router defect.
- Customer-side network issues, DNS misconfiguration, or client
  misconfiguration.
- Preview, beta, or experimental features explicitly marked as not covered
  by SLA.
- Downtime excluded under section 4.3.

## 3. Service Availability Commitment

### 3.1 Monthly uptime targets

| Edition | Monthly uptime commitment |
| --- | --- |
| Pro Edition | 99.5% |
| Enterprise Edition | 99.9% |

### 3.2 Uptime calculation

Monthly uptime percentage is calculated as:

```
monthly_uptime = (total_minutes_in_month - unavailable_minutes) / total_minutes_in_month * 100
```

Where:

- `total_minutes_in_month` is the number of minutes in the calendar month
  (43,200 for a 30-day month, 44,640 for a 31-day month, 40,320 for February).
- `unavailable_minutes` is the number of minutes in which all retry attempts
  against the licensed Claw Router endpoints return an HTTP 5xx error or
  fail to respond within 30 seconds. A minute is counted as unavailable only
  when the downtime is continuous for at least 5 consecutive minutes.

Availability is measured by SDKWork-operated probes that exercise
`/healthz`, `/readyz`, and a representative `/v1/chat/completions` request
every 60 seconds from at least two geographic regions.

### 3.3 Downtime measurement

Downtime begins when the first failed probe in a continuous outage is
recorded and ends when the next successful probe confirms recovery. Single
transient failures shorter than 5 minutes are not counted as downtime but
are tracked as incidents.

## 4. Exclusions

### 4.1 General exclusions

The following are not counted as downtime:

- Scheduled maintenance performed within the published maintenance window
  and notified at least 72 hours in advance under section 8.
- Customer-side network, DNS, certificate, or client configuration issues.
- Failures of upstream AI providers (OpenAI, Anthropic, Google, Alibaba,
  Tencent, ByteDance, and others) when the failure occurs outside Claw
  Router's control and the configured circuit-breaker failover has no
  healthy alternative route available.
- Force majeure events described in section 9.
- Downtime caused by customer abuse, denial-of-service attacks on the
  customer's endpoints, or traffic exceeding the contracted rate limit by
  more than 200%.
- Downtime resulting from customer-initiated configuration changes,
  schema migrations, or custom code deployments on customer-managed
  infrastructure.

### 4.2 Customer-attributed unavailability

When SDKWork can demonstrate that unavailability was caused by the customer's
own configuration, code, or network, the affected minutes are excluded from
the uptime calculation.

### 4.3 Force majeure

SDKWork is not liable for failures caused by acts of God, war, terrorism,
civil unrest, government action, pandemic, natural disaster, internet
backbone failure, or any other event outside SDKWork's reasonable control.
SDKWork will use reasonable efforts to restore service as soon as
practicable.

## 5. Incident Response Times

Incidents are classified by severity. Response time is the time from incident
acknowledgement by SDKWork support to the first substantive human response
sent to the customer.

| Severity | Definition | Pro response | Enterprise response |
| --- | --- | --- | --- |
| P1 (Critical) | Production outage or complete inability to use the service for the customer's primary use case; no workaround available; data loss risk. | 4 hours | 1 hour |
| P2 (High) | Major functionality impaired; severe performance degradation; workaround exists but is not viable for production traffic. | 8 hours | 4 hours |
| P3 (Medium) | Partial functionality impaired; minor performance degradation; reasonable workaround available. | 24 hours | 12 hours |
| P4 (Low) | Cosmetic issues, documentation errors, feature requests, non-urgent questions. | Best effort | 2 business days |

Response times apply during the customer's support coverage window:

- Pro Edition: business hours, 9:00-18:00 in the customer's selected time
  zone, Monday through Friday, excluding SDKWork public holidays.
- Enterprise Edition: 24x7 for P1 and P2 incidents; business hours for P3
  and P4 incidents.

## 6. Service Credits Policy

When Claw Router fails to meet the committed monthly uptime, the customer is
eligible for service credits applied to the next billing cycle. Service
credits are not paid out as cash.

### 6.1 Pro Edition credits

| Monthly uptime | Service credit (% of monthly base fee) |
| --- | --- |
| 99.0% to < 99.5% | 10% |
| 95.0% to < 99.0% | 25% |
| Below 95.0% | 50% |

### 6.2 Enterprise Edition credits

| Monthly uptime | Service credit (% of monthly base fee) |
| --- | --- |
| 99.5% to < 99.9% | 10% |
| 99.0% to < 99.5% | 25% |
| Below 99.0% | 50% |

### 6.3 Credit application

- Service credits are applied to the customer's next billing cycle after the
  claim is validated.
- Credits do not apply to token overage charges, additional services, or
  OEM royalties.
- Cumulative service credits in any single billing cycle are capped at 50%
  of the monthly base subscription fee under section 12.
- Service credits are the customer's sole and exclusive remedy for service
  level breaches under this SLA.

### 6.4 Claim process

To request a service credit, the customer must submit a support ticket to
`billing@sdkwork.com` within 30 calendar days of the end of the affected
billing cycle. The ticket must include:

- Customer account ID and subscription ID.
- Affected billing cycle (month and year).
- Evidence of unavailability: timestamps, endpoint URLs, HTTP status codes,
  error messages, and at least three independent observation points where
  possible.
- A brief impact description.

SDKWork will validate the claim against internal monitoring data and issue
a credit decision within 15 business days. Disputes are escalated to the
customer's account manager or, for Enterprise Edition, the dedicated
technical account manager.

## 7. Rate Limit Tiers

Claw Router enforces per-tenant rate limits. The default tier is determined
by the subscription edition and may be upgraded based on payment history and
historical usage. Rate limits are expressed as requests per minute (RPM) and
tokens per minute (TPM).

| Tier | Applicable edition | RPM | TPM | Upgrade condition |
| --- | --- | --- | --- | --- |
| Tier 1 | Free / Community | 60 | 60,000 | N/A |
| Tier 2 | Pro (default) | 600 | 600,000 | Active paid Pro subscription |
| Tier 3 | Pro+ | 3,000 | 3,000,000 | 3 consecutive months of Pro subscription plus sustained usage above 50% of Tier 2 limit |
| Tier 4 | Enterprise (default) | 10,000 | 10,000,000 | Active paid Enterprise subscription |

Upgrade requests outside the automatic conditions above are reviewed by the
SDKWork commercial team and may require a custom rate-limit addendum.
Downgrades apply immediately when a subscription is cancelled or downgraded.

Per-tenant rate limits are configurable by the operator through the admin
console and may be set below the tier maximum. Exceeding the configured limit
returns HTTP 429 with `Retry-After`, `RateLimit-Limit`,
`RateLimit-Remaining`, and `RateLimit-Reset` headers, matching the behavior
of OpenAI Platform and Anthropic Console rate-limit responses.

## 8. Maintenance Windows

### 8.1 Scheduled maintenance window

- Claw Router scheduled maintenance occurs on the second Sunday of every
  month, 02:00-06:00 UTC.
- Maintenance is performed within this window and is expected to last no
  longer than 2 hours, although the full 4-hour window is reserved.
- Maintenance may include software updates, configuration changes, database
  migrations, certificate rotation, and capacity adjustments.

### 8.2 Notification

- SDKWork notifies customers of scheduled maintenance at least 72 hours in
  advance through the customer support channel and, for Enterprise Edition,
  the dedicated Slack channel.
- Notifications include the expected start time, expected duration, affected
  endpoints, and a summary of the planned change.
- Emergency maintenance outside the published window requires at least 24
  hours of notice for Enterprise Edition and as much notice as practicable
  for Pro Edition.

### 8.3 Unplanned outages

- SDKWork will notify customers immediately upon detecting an unplanned
  outage affecting production traffic.
- Pro Edition customers are notified by email to the registered support
  contact.
- Enterprise Edition customers are additionally notified through the
  dedicated Slack channel and, for P1 incidents, by telephone and SMS to
  the registered escalation contacts.
- Status updates are provided at least every 30 minutes during an active
  P1 incident and at least every 2 hours during an active P2 incident
  until resolution.

## 9. Force Majeure

Neither party is liable for any failure or delay in performance under this
SLA caused by events beyond its reasonable control, including but not
limited to acts of God, war, terrorism, civil unrest, government action,
pandemic, epidemic, natural disaster, fire, flood, internet backbone
failure, or widespread utility failure. The affected party will promptly
notify the other party and use reasonable efforts to resume performance as
soon as practicable.

## 10. Support Channels

| Edition | Channel | First response target | Coverage |
| --- | --- | --- | --- |
| Pro | Email `support@sdkwork.com` | 24 hours | Business hours, customer's selected time zone |
| Enterprise | Email `enterprise-support@sdkwork.com` plus dedicated Slack channel | 1 hour for P1, 4 hours for P2 | 24x7 for P1/P2, business hours for P3/P4 |
| Enterprise (critical) | Telephone and SMS escalation | 1 hour for P1 | 24x7 |

The customer must designate at least one primary and one secondary support
contact at subscription start. Enterprise Edition customers may designate
up to five support contacts and one on-call escalation contact for
after-hours P1 incidents.

## 11. Change Management

SDKWork may update this SLA with at least 30 calendar days notice for any
change that reduces the committed uptime, increases response times, or
reduces the service credit percentages. Other clarifying changes may be
published without advance notice but are announced through the customer
support channel.

For Enterprise Edition customers, material SLA changes during a paid annual
term are not effective until the next renewal, unless the customer
explicitly agrees in writing.

## 12. Limitation Of Liability

- Cumulative service credits payable to the customer under this SLA in any
  single billing cycle are capped at 50% of the monthly base subscription
  fee.
- Except for the service credits defined here, SDKWork is not liable for
  any indirect, incidental, special, consequential, or punitive damages
  arising from service level breaches.
- The total aggregate liability of SDKWork under this SLA and the
  applicable commercial agreement, for any and all claims, is limited to the
  fees paid by the customer to SDKWork for the service during the three
  months preceding the event giving rise to the claim.
- This section does not exclude or limit liability that cannot be excluded
  or limited under applicable law.

## 13. Definitions

- **Downtime:** A continuous period of 5 minutes or more during which the
  licensed endpoints return HTTP 5xx errors or fail to respond within 30
  seconds.
- **Monthly uptime:** The percentage of total minutes in a calendar month
  that are not downtime, calculated under section 3.2.
- **P1 incident:** A production outage or critical defect with no
  workaround.
- **Service credit:** A credit applied to the customer's next billing
  cycle, calculated as a percentage of the monthly base subscription fee.
- **Billing cycle:** The period for which the customer is invoiced, monthly
  for Pro Edition and monthly or annually for Enterprise Edition.

## 14. Revision History

| Version | Date | Summary |
| --- | --- | --- |
| 1.0 | 2026-06-27 | Initial commercial SLA publication |

## 15. References

- [Commercial Pricing Model](../commercial/PRICING.md)
- [Edition Tier Matrix](./TIER_MATRIX.md)
- [LICENSE](../../LICENSE)
- [COMMERCIAL-LICENSE.md](../../COMMERCIAL-LICENSE.md)
- [SOC 2 Compliance Readiness](../compliance/SOC2-compliance-readiness.md)

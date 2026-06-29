# SDKWork Claw Router - Token / API Key Rotation Runbook

**Document Version:** 1.0
**Last Updated:** 2026-06-27
**Owner:** Security / clawrouter-security
**Review Frequency:** Quarterly
**Severity:** P1

---

## Table of Contents

1. [Scenario](#scenario)
2. [Rotation Cadence](#rotation-cadence)
3. [Rotation Procedure](#rotation-procedure)
4. [Rollback Plan](#rollback-plan)
5. [Verification Checklist](#verification-checklist)
6. [Post-Rotation Records](#post-rotation-records)
7. [Related Documents](#related-documents)

---

## Scenario

Scheduled rotation of credentials and signing material used by Claw Router:

- Tenant-facing **API keys** (issued per tenant / application).
- **JWT signing keys** — the shared HMAC secret backing app session tokens
  (`SDKWORK_CLAW_APP_SESSION_SECRET`, `AppSessionConfig`).
- **Provider credentials** — bearer tokens for upstream AI providers.
- **Admin passwords** — credentials for admin portal members.

This runbook also applies to unscheduled emergency rotation when a secret is
suspected to be compromised (see
[Security Policy](../../SECURITY.md) and the
[Tenant Isolation Incident](tenant-isolation-incident.md) runbook).

## Rotation Cadence

| Secret | Cadence | Authority | Notes |
|--------|---------|-----------|-------|
| User / tenant API key | 90 days | SOC2 CC6.2 | Reissue before expiry; old key revoked only after validation. |
| App session token signing key (HMAC) | 90 days | [SECURITY.md](../../SECURITY.md) ("App session token signing keys MUST rotate every 90 days") | Single shared HMAC secret today; per-tenant asymmetric signing (RS256/ES256) is a P0 GA prerequisite tracked in `docs/standard-alignment-audit.md`. |
| Provider relay bearer token | per Provider policy (typically 90 days) | Provider admin console | Rotate via `password_file` references, never inline strings. |
| Admin portal password | 180 days | Security policy | Force re-authentication on rotation. |

> Note: The HMAC signing key cadence follows SECURITY.md's 90-day mandate. Any
> longer proposed cadence is superseded by the repository security policy.

## Rotation Procedure

The rotation is a no-downtime, dual-key (overlap) procedure. Never revoke the
old key until the new one is verified end to end.

### Step 1: Create the new key (without affecting the old one)

```bash
# Generate a 256-bit secret (base64, 32 bytes) for the HMAC session secret
NEW_SECRET=$(openssl rand -base64 32)
echo "NEW_SECRET=$NEW_SECRET"  # record in the secret manager, not in git

# Generate a tenant API key via admin API (dual-key: existing key stays active)
kubectl exec -it deploy/claw-router-gateway -n clawrouter -- \
  curl -sS -X POST http://localhost:8080/admin/api-keys \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"tenant_id\": \"<tenant-id>\", \"label\": \"rotation-$(date +%Y%m%d)\", \"expires_at\": \"$(date -u -d '+90 days' +%Y-%m-%dT%H:%M:%SZ)\"}"
```

### Step 2: Deploy the new key to all instances (K8s Secret rolling update)

```bash
# Stage the new HMAC secret alongside the old one (overlap window)
kubectl create secret generic claw-app-session-secret-new \
  --from-literal=secret="$NEW_SECRET" -n clawrouter

# Patch the deployment to reference both, then roll pods one at a time
kubectl rollout restart deployment/claw-router-gateway -n clawrouter
kubectl rollout status  deployment/claw-router-gateway -n clawrouter
```

For provider credentials stored as `password_file` references (SECURITY.md),
update the referenced file in the mounted secret and roll the gateway pods so
the new bearer token is loaded.

### Step 3: Verify the new key works

```bash
# JWT / session token verification
NEW_TOKEN=$(kubectl exec -it deploy/claw-router-gateway -n clawrouter -- \
  curl -sS -X POST http://localhost:8080/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$TEST_USER\",\"password\":\"$TEST_PASS\"}" | jq -r .token)
kubectl exec -it deploy/claw-router-gateway -n clawrouter -- \
  curl -sS -o /dev/null -w "%{http_code}\n" \
    -H "Authorization: Bearer $NEW_TOKEN" \
    http://localhost:8080/me

# Provider relay (new bearer token)
kubectl exec -it deploy/claw-router-gateway -n clawrouter -- \
  curl -sS -o /dev/null -w "%{http_code}\n" \
    -H "Authorization: Bearer $NEW_PROVIDER_KEY" \
    https://api.openai.com/v1/models
```

### Step 4: Revoke the old key

Only after all verification checks pass:

```bash
# Revoke the old tenant API key
kubectl exec -it deploy/claw-router-gateway -n clawrouter -- \
  curl -sS -X DELETE http://localhost:8080/admin/api-keys/<old-key-id> \
    -H "Authorization: Bearer ${ADMIN_TOKEN}"

# Remove the old HMAC secret once all pods run the new one
kubectl delete secret claw-app-session-secret-old -n clawrouter
```

Back up the rotated key material first (per
[Disaster Recovery Plan](../../deployments/runbooks/disaster-recovery-plan.md#signing-key-backup)):

```bash
kubectl get secret claw-app-session-secret -n clawrouter -o jsonpath='{.data.secret}' \
  | base64 -d > backups/app-session-secret-$(date +%Y%m%d).enc
# Retain for 90 days after rotation, then destroy.
```

## Rollback Plan

If the new key causes failures (auth errors, provider 401s, JWT validation
regressions), roll back immediately:

```bash
# Point the deployment back to the previous secret
kubectl set env deployment/claw-router-gateway \
  SDKWORK_CLAW_APP_SESSION_SECRET=<previous-value> -n clawrouter
kubectl rollout restart deployment/claw-router-gateway -n clawrouter

# Re-enable the old tenant API key if it was revoked prematurely
kubectl exec -it deploy/claw-router-gateway -n clawrouter -- \
  curl -sS -X POST http://localhost:8080/admin/api-keys/<old-key-id>/restore \
    -H "Authorization: Bearer ${ADMIN_TOKEN}"
```

Because the old key is retained through the overlap window, rollback is a
single redeploy and does not require reissuing credentials.

## Verification Checklist

| Check | Metric / probe | Pass criteria |
|-------|----------------|---------------|
| API call success rate | `provider_invocation_total{status="2xx"} / total` | > 99% over 15 min |
| JWT / session validation success | `auth_token_validation_total{result="ok"}` | error rate < 0.1% |
| Provider relay success | `provider_invocation_total{provider,status="2xx"}` | no new 401/403 |
| Admin portal login | manual login with rotated admin password | 200 OK |
| Audit log records rotation | `ops_audit_log` rows for `action_type="rotate_*"` | present |
| No `fail_open` drift | `CircuitBreakerConfig::fail_open == false` | still false |

## Post-Rotation Records

- Record rotation event, timestamp, and operator in the `ops_audit_log`
  (`action_type = rotate_credential`).
- Update the secret inventory / key register with the new expiry date.
- Schedule the next rotation in the runbook index *Last Drill* tracker
  ([README.md](README.md)).

## Related Documents

- [Runbook Index](README.md)
- [Security Policy](../../SECURITY.md)
- [Disaster Recovery Plan](../../deployments/runbooks/disaster-recovery-plan.md)
- [Audit Log Investigation](audit-log-investigation.md)
- [Tenant Isolation Incident](tenant-isolation-incident.md)

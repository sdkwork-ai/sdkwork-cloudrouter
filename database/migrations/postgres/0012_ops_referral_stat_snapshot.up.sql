-- sdkwork:migration
-- id: 0012_ops_referral_stat_snapshot
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Add the ops_referral_stat_snapshot read-model table consumed by the
--   admin marketing referral stats endpoint (/backend/v3/api/billing/referrals/stats).
--   The snapshot has no runtime writer yet; the table exists so the read model
--   can return an empty page instead of failing, and future referral
--   projection jobs can populate it.
-- reversible: false
-- rollback: forward-fix

CREATE TABLE IF NOT EXISTS ops_referral_stat_snapshot (
    id BIGINT NOT NULL PRIMARY KEY,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    inviter_user_id BIGINT NOT NULL,
    inviter_name_snapshot VARCHAR(256),
    inviter_email_snapshot VARCHAR(256),
    total_invited_count BIGINT NOT NULL DEFAULT 0,
    total_revenue_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
    reward_awarded_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
    invite_link VARCHAR(512),
    status INTEGER NOT NULL DEFAULT 1,
    snapshot_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ops_referral_stat_snapshot ON ops_referral_stat_snapshot (tenant_id, organization_id, inviter_user_id, snapshot_at);

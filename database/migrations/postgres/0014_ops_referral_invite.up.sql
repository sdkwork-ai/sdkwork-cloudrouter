-- sdkwork:migration
-- id: 0014_ops_referral_invite
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Add the invite-code registration capability read/write tables:
--   ops_referral_invite_code (per-user referral invite code),
--   ops_referral_relation (inviter/invitee binding created when a new user
--   registers with a valid invite code), and ops_referral_strategy
--   (marketing-center configured referral reward strategies). Reward
--   granting is a follow-up phase; relations carry a reward_status marker.
-- reversible: false
-- rollback: forward-fix
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

CREATE TABLE IF NOT EXISTS ops_referral_invite_code (
    id BIGINT NOT NULL PRIMARY KEY,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    user_id BIGINT NOT NULL,
    invite_code VARCHAR(32) NOT NULL,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ops_referral_invite_code_tenant_user ON ops_referral_invite_code (tenant_id, organization_id, user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ops_referral_invite_code_tenant_code ON ops_referral_invite_code (tenant_id, organization_id, invite_code);

CREATE TABLE IF NOT EXISTS ops_referral_relation (
    id BIGINT NOT NULL PRIMARY KEY,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    invitee_user_id BIGINT NOT NULL,
    inviter_user_id BIGINT NOT NULL,
    invite_code VARCHAR(32) NOT NULL,
    source VARCHAR(16) NOT NULL DEFAULT 'register',
    status INTEGER NOT NULL DEFAULT 1,
    reward_status VARCHAR(16) NOT NULL DEFAULT 'pending',
    claimed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ops_referral_relation_tenant_invitee ON ops_referral_relation (tenant_id, organization_id, invitee_user_id);
CREATE INDEX IF NOT EXISTS idx_ops_referral_relation_inviter ON ops_referral_relation (tenant_id, organization_id, inviter_user_id, created_at, id);
CREATE INDEX IF NOT EXISTS idx_ops_referral_relation_code ON ops_referral_relation (tenant_id, organization_id, invite_code);

CREATE TABLE IF NOT EXISTS ops_referral_strategy (
    id BIGINT NOT NULL PRIMARY KEY,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    name VARCHAR(128) NOT NULL,
    description VARCHAR(512) NOT NULL DEFAULT '',
    status VARCHAR(16) NOT NULL DEFAULT 'disabled',
    reward_type VARCHAR(16) NOT NULL DEFAULT 'POINTS',
    reward_value VARCHAR(64) NOT NULL,
    reward_target VARCHAR(16) NOT NULL DEFAULT 'INVITER',
    trigger_event VARCHAR(16) NOT NULL DEFAULT 'REGISTER',
    max_rewards_per_inviter BIGINT NOT NULL DEFAULT 0,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ops_referral_strategy_tenant_status ON ops_referral_strategy (tenant_id, organization_id, status, created_at, id);

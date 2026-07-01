-- Runtime schema repairs applied after generated baseline install.
-- Notification projection tables required by dashboard overview,
-- announcements, and app notifications.

CREATE TABLE IF NOT EXISTS ops_notification_message (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    data_scope INTEGER NOT NULL DEFAULT 0,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ,
    deleted_by BIGINT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    app_id VARCHAR(128),
    scope_type INTEGER NOT NULL DEFAULT 1,
    message_code VARCHAR(128),
    message_type INTEGER,
    title VARCHAR(200),
    summary VARCHAR(512),
    content TEXT,
    severity INTEGER,
    priority INTEGER NOT NULL DEFAULT 0,
    show_as_popup BOOLEAN NOT NULL DEFAULT FALSE,
    action_url VARCHAR(512),
    published_at TIMESTAMPTZ,
    expire_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ops_notification_message_scope
    ON ops_notification_message (tenant_id, organization_id, app_id, scope_type, status, published_at, id);

CREATE INDEX IF NOT EXISTS idx_ops_notification_message_popup
    ON ops_notification_message (tenant_id, organization_id, show_as_popup, published_at, id);

CREATE TABLE IF NOT EXISTS ops_notification_recipient (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    data_scope INTEGER NOT NULL DEFAULT 0,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ,
    deleted_by BIGINT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    message_id BIGINT NOT NULL,
    app_id VARCHAR(128),
    recipient_type INTEGER NOT NULL,
    recipient_value VARCHAR(256),
    recipient_user_id BIGINT,
    recipient_role_code VARCHAR(128)
);

CREATE INDEX IF NOT EXISTS idx_ops_notification_recipient_message
    ON ops_notification_recipient (tenant_id, organization_id, message_id, status, id);

CREATE INDEX IF NOT EXISTS idx_ops_notification_recipient_user
    ON ops_notification_recipient (tenant_id, organization_id, recipient_type, recipient_user_id, status, id);

CREATE INDEX IF NOT EXISTS idx_ops_notification_recipient_role
    ON ops_notification_recipient (tenant_id, organization_id, recipient_type, recipient_role_code, status, id);

CREATE TABLE IF NOT EXISTS ops_notification_delivery (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    user_id BIGINT NOT NULL DEFAULT 0,
    data_scope INTEGER NOT NULL DEFAULT 0,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ,
    deleted_by BIGINT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    app_id VARCHAR(128) NOT NULL DEFAULT 'default',
    message_id BIGINT NOT NULL,
    delivery_channel INTEGER,
    delivery_status INTEGER,
    read_at TIMESTAMPTZ,
    popup_seen_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    failure_code VARCHAR(128),
    retry_count INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ops_notification_delivery_user_message_app
    ON ops_notification_delivery (tenant_id, organization_id, message_id, user_id, app_id, delivery_channel);

CREATE INDEX IF NOT EXISTS idx_ops_notification_delivery_user_read
    ON ops_notification_delivery (tenant_id, organization_id, user_id, app_id, read_at, created_at, id);

CREATE INDEX IF NOT EXISTS idx_ops_notification_delivery_popup_seen
    ON ops_notification_delivery (tenant_id, organization_id, user_id, app_id, popup_seen_at, id);

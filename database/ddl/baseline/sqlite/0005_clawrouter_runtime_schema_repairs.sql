-- Runtime schema repairs applied after generated baseline install.
-- Keeps canonical ai_usage table name and notification projection tables
-- required by dashboard overview, announcements, and app notifications.

CREATE TABLE IF NOT EXISTS ops_notification_message (
    id INTEGER PRIMARY KEY,
    uuid TEXT NOT NULL,
    tenant_id INTEGER NOT NULL DEFAULT 0,
    organization_id INTEGER NOT NULL DEFAULT 0,
    data_scope INTEGER NOT NULL DEFAULT 0,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    deleted_by INTEGER,
    metadata TEXT NOT NULL DEFAULT '{}',
    app_id TEXT,
    scope_type INTEGER NOT NULL DEFAULT 1,
    message_code TEXT,
    message_type INTEGER,
    title TEXT,
    summary TEXT,
    content TEXT,
    severity INTEGER,
    priority INTEGER NOT NULL DEFAULT 0,
    show_as_popup INTEGER NOT NULL DEFAULT 0,
    action_url TEXT,
    published_at TEXT,
    expire_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_ops_notification_message_scope
    ON ops_notification_message (tenant_id, organization_id, app_id, scope_type, status, published_at, id);

CREATE INDEX IF NOT EXISTS idx_ops_notification_message_popup
    ON ops_notification_message (tenant_id, organization_id, show_as_popup, published_at, id);

CREATE TABLE IF NOT EXISTS ops_notification_recipient (
    id INTEGER PRIMARY KEY,
    uuid TEXT NOT NULL,
    tenant_id INTEGER NOT NULL DEFAULT 0,
    organization_id INTEGER NOT NULL DEFAULT 0,
    data_scope INTEGER NOT NULL DEFAULT 0,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    deleted_by INTEGER,
    metadata TEXT NOT NULL DEFAULT '{}',
    message_id INTEGER NOT NULL,
    app_id TEXT,
    recipient_type INTEGER NOT NULL,
    recipient_value TEXT,
    recipient_user_id INTEGER,
    recipient_role_code TEXT
);

CREATE INDEX IF NOT EXISTS idx_ops_notification_recipient_message
    ON ops_notification_recipient (tenant_id, organization_id, message_id, status, id);

CREATE INDEX IF NOT EXISTS idx_ops_notification_recipient_user
    ON ops_notification_recipient (tenant_id, organization_id, recipient_type, recipient_user_id, status, id);

CREATE INDEX IF NOT EXISTS idx_ops_notification_recipient_role
    ON ops_notification_recipient (tenant_id, organization_id, recipient_type, recipient_role_code, status, id);

CREATE TABLE IF NOT EXISTS ops_notification_delivery (
    id INTEGER PRIMARY KEY,
    uuid TEXT NOT NULL,
    tenant_id INTEGER NOT NULL DEFAULT 0,
    organization_id INTEGER NOT NULL DEFAULT 0,
    user_id INTEGER NOT NULL DEFAULT 0,
    data_scope INTEGER NOT NULL DEFAULT 0,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    deleted_by INTEGER,
    metadata TEXT NOT NULL DEFAULT '{}',
    app_id TEXT NOT NULL DEFAULT 'default',
    message_id INTEGER NOT NULL,
    delivery_channel INTEGER,
    delivery_status INTEGER,
    read_at TEXT,
    popup_seen_at TEXT,
    archived_at TEXT,
    delivered_at TEXT,
    failure_code TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ops_notification_delivery_user_message_app
    ON ops_notification_delivery (tenant_id, organization_id, message_id, user_id, app_id, delivery_channel);

CREATE INDEX IF NOT EXISTS idx_ops_notification_delivery_user_read
    ON ops_notification_delivery (tenant_id, organization_id, user_id, app_id, read_at, created_at, id);

CREATE INDEX IF NOT EXISTS idx_ops_notification_delivery_popup_seen
    ON ops_notification_delivery (tenant_id, organization_id, user_id, app_id, popup_seen_at, id);

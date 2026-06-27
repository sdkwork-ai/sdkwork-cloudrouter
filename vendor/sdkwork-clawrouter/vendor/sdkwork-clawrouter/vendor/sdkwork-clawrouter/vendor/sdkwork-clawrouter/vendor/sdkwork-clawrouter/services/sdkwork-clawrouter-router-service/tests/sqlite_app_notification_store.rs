use sdkwork_clawrouter_router_service::infrastructure::sql::sqlite::SqliteAppNotificationStore;
use sdkwork_clawrouter_router_service::ports::{
    AcknowledgeAppNotificationCommand, AppNotificationQuery, AppNotificationStore,
    AppNotificationSubject, MarkAppNotificationPopupSeenCommand,
};
use sqlx::sqlite::SqlitePoolOptions;

#[tokio::test]
async fn sqlite_app_notification_store_targets_messages_and_persists_user_state() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_schema(&pool).await;
    seed_notifications(&pool).await;

    let store = SqliteAppNotificationStore::new(pool.clone());
    let subject = AppNotificationSubject {
        tenant_id: 100001,
        organization_id: 0,
        user_id: 30,
    };

    let items = store
        .list_notifications(AppNotificationQuery {
            subject,
            app_id: "claw-router".to_owned(),
            include_archived: false,
            page: 1,
            page_size: 50,
        })
        .await
        .unwrap()
        .items;

    let visible_ids: Vec<&str> = items.iter().map(|item| item.id.as_str()).collect();
    assert!(visible_ids.contains(&"1"), "app-scoped all-user message");
    assert!(visible_ids.contains(&"2"), "single-user message");
    assert!(visible_ids.contains(&"3"), "role-targeted message");
    assert!(visible_ids.contains(&"4"), "global all-app message");
    assert!(visible_ids.contains(&"9"), "previously read message");
    assert!(!visible_ids.contains(&"5"), "other app-scoped message");
    assert!(!visible_ids.contains(&"6"), "expired message");
    assert!(!visible_ids.contains(&"7"), "inactive message");

    let launch = items.iter().find(|item| item.id == "1").unwrap();
    assert_eq!("Platform launch", launch.title);
    assert_eq!("info", launch.message_type);
    assert_eq!(true, launch.show_as_popup);
    assert_eq!(false, launch.read);
    assert_eq!(false, launch.popup_seen);

    let historical = items.iter().find(|item| item.id == "9").unwrap();
    assert_eq!(true, historical.read);
    assert_eq!(true, historical.popup_seen);

    store
        .acknowledge(AcknowledgeAppNotificationCommand {
            subject,
            app_id: "claw-router".to_owned(),
            notification_id: "1".to_owned(),
        })
        .await
        .unwrap();

    let updated = store
        .list_notifications(AppNotificationQuery {
            subject,
            app_id: "claw-router".to_owned(),
            include_archived: false,
            page: 1,
            page_size: 50,
        })
        .await
        .unwrap()
        .items
        .into_iter()
        .find(|item| item.id == "1")
        .unwrap();
    assert_eq!(true, updated.read);
    assert_eq!(true, updated.popup_seen);

    let row: (i64, Option<String>, Option<String>) = sqlx::query_as(
        r#"
        SELECT COUNT(*), MAX(CAST(read_at AS TEXT)), MAX(CAST(popup_seen_at AS TEXT))
        FROM ops_notification_delivery
        WHERE tenant_id = 100001 AND organization_id = 0 AND message_id = 1 AND user_id = 30 AND app_id = 'claw-router' AND delivery_channel = 1
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(1, row.0);
    assert!(row.1.unwrap_or_default().len() > 0);
    assert!(row.2.unwrap_or_default().len() > 0);
}

#[tokio::test]
async fn sqlite_app_notification_store_supports_default_global_console_app() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_schema(&pool).await;
    seed_notifications(&pool).await;

    let store = SqliteAppNotificationStore::new(pool.clone());
    let subject = AppNotificationSubject {
        tenant_id: 100001,
        organization_id: 0,
        user_id: 30,
    };

    let items = store
        .list_notifications(AppNotificationQuery {
            subject,
            app_id: "default".to_owned(),
            include_archived: false,
            page: 1,
            page_size: 50,
        })
        .await
        .unwrap()
        .items;

    let visible_ids: Vec<&str> = items.iter().map(|item| item.id.as_str()).collect();
    assert_eq!(vec!["4"], visible_ids);
    assert_eq!("default", items[0].app_id);

    store
        .acknowledge(AcknowledgeAppNotificationCommand {
            subject,
            app_id: "default".to_owned(),
            notification_id: "4".to_owned(),
        })
        .await
        .unwrap();

    let updated = store
        .list_notifications(AppNotificationQuery {
            subject,
            app_id: "default".to_owned(),
            include_archived: false,
            page: 1,
            page_size: 50,
        })
        .await
        .unwrap()
        .items
        .into_iter()
        .find(|item| item.id == "4")
        .unwrap();
    assert_eq!(true, updated.read);
    assert_eq!(true, updated.popup_seen);
}

#[tokio::test]
async fn sqlite_app_notification_store_ignores_legacy_content_announcements() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_schema(&pool).await;
    seed_notifications(&pool).await;
    seed_announcements(&pool).await;

    let store = SqliteAppNotificationStore::new(pool.clone());
    let subject = AppNotificationSubject {
        tenant_id: 100001,
        organization_id: 0,
        user_id: 30,
    };

    let items = store
        .list_notifications(AppNotificationQuery {
            subject,
            app_id: "default".to_owned(),
            include_archived: false,
            page: 1,
            page_size: 50,
        })
        .await
        .unwrap()
        .items;

    let visible_ids: Vec<&str> = items.iter().map(|item| item.id.as_str()).collect();
    assert_eq!(vec!["4"], visible_ids);
    assert!(
        items
            .iter()
            .all(|item| !item.id.starts_with("announcement-")),
        "app notifications must expose canonical ops_notification_message ids only"
    );

    let error = store
        .acknowledge(AcknowledgeAppNotificationCommand {
            subject,
            app_id: "default".to_owned(),
            notification_id: "announcement-100".to_owned(),
        })
        .await
        .unwrap_err();
    assert!(error.is_not_found());

    let legacy_delivery_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*)
        FROM ops_notification_delivery
        WHERE message_id < 0
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(0, legacy_delivery_count);
}

#[tokio::test]
async fn sqlite_app_notification_store_lists_announcements_written_as_standard_notifications() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_schema(&pool).await;
    seed_standard_announcements(&pool).await;

    let store = SqliteAppNotificationStore::new(pool.clone());
    let subject = AppNotificationSubject {
        tenant_id: 100001,
        organization_id: 0,
        user_id: 30,
    };

    let items = store
        .list_notifications(AppNotificationQuery {
            subject,
            app_id: "default".to_owned(),
            include_archived: false,
            page: 1,
            page_size: 50,
        })
        .await
        .unwrap()
        .items;

    let visible_ids: Vec<&str> = items.iter().map(|item| item.id.as_str()).collect();
    assert!(visible_ids.contains(&"100"));
    assert!(visible_ids.contains(&"101"));
    assert!(!visible_ids.iter().any(|id| id.starts_with("announcement-")));

    let popup = items.iter().find(|item| item.id == "100").unwrap();
    assert_eq!("default", popup.app_id);
    assert_eq!("System maintenance", popup.title);
    assert_eq!("Maintenance starts tonight.", popup.desc);
    assert_eq!("Maintenance starts tonight.", popup.content);
    assert_eq!("warning", popup.message_type);
    assert_eq!(true, popup.show_as_popup);
    assert_eq!(false, popup.read);
    assert_eq!(false, popup.popup_seen);
    assert_eq!(false, popup.archived);

    store
        .acknowledge(AcknowledgeAppNotificationCommand {
            subject,
            app_id: "default".to_owned(),
            notification_id: "100".to_owned(),
        })
        .await
        .unwrap();

    let updated = store
        .list_notifications(AppNotificationQuery {
            subject,
            app_id: "default".to_owned(),
            include_archived: false,
            page: 1,
            page_size: 50,
        })
        .await
        .unwrap()
        .items
        .into_iter()
        .find(|item| item.id == "100")
        .unwrap();
    assert_eq!(true, updated.read);
    assert_eq!(true, updated.popup_seen);

    let row: (i64, Option<String>, Option<String>) = sqlx::query_as(
        r#"
        SELECT COUNT(*), MAX(CAST(read_at AS TEXT)), MAX(CAST(popup_seen_at AS TEXT))
        FROM ops_notification_delivery
        WHERE tenant_id = 100001 AND organization_id = 0 AND message_id = 100 AND user_id = 30 AND app_id = 'default' AND delivery_channel = 1
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(1, row.0);
    assert!(row.1.unwrap_or_default().len() > 0);
    assert!(row.2.unwrap_or_default().len() > 0);
}

#[tokio::test]
async fn sqlite_app_notification_store_keeps_global_delivery_state_per_app() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_schema(&pool).await;
    seed_notifications(&pool).await;

    let store = SqliteAppNotificationStore::new(pool);
    let subject = AppNotificationSubject {
        tenant_id: 100001,
        organization_id: 0,
        user_id: 30,
    };

    store
        .mark_popup_seen(MarkAppNotificationPopupSeenCommand {
            subject,
            app_id: "claw-router".to_owned(),
            notification_id: "4".to_owned(),
        })
        .await
        .unwrap();

    let other_app_items = store
        .list_notifications(AppNotificationQuery {
            subject,
            app_id: "desktop-shell".to_owned(),
            include_archived: false,
            page: 1,
            page_size: 50,
        })
        .await
        .unwrap()
        .items;

    let global = other_app_items.iter().find(|item| item.id == "4").unwrap();
    assert_eq!("desktop-shell", global.app_id);
    assert_eq!(false, global.popup_seen);
    assert!(
        other_app_items.iter().any(|item| item.id == "5"),
        "desktop-shell app-scoped notification should remain isolated from claw-router"
    );
}

#[tokio::test]
async fn sqlite_app_notification_store_acknowledges_without_reopening_popup() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_schema(&pool).await;
    seed_notifications(&pool).await;

    let store = SqliteAppNotificationStore::new(pool.clone());
    let subject = AppNotificationSubject {
        tenant_id: 100001,
        organization_id: 0,
        user_id: 30,
    };

    store
        .acknowledge(AcknowledgeAppNotificationCommand {
            subject,
            app_id: "claw-router".to_owned(),
            notification_id: "1".to_owned(),
        })
        .await
        .unwrap();

    let updated = store
        .list_notifications(AppNotificationQuery {
            subject,
            app_id: "claw-router".to_owned(),
            include_archived: false,
            page: 1,
            page_size: 50,
        })
        .await
        .unwrap()
        .items
        .into_iter()
        .find(|item| item.id == "1")
        .unwrap();

    assert_eq!(true, updated.read);
    assert_eq!(true, updated.popup_seen);
    assert_eq!(
        false,
        updated.show_as_popup && !updated.read && !updated.popup_seen,
        "acknowledged notifications must not be eligible for popup display"
    );
}

#[tokio::test]
async fn sqlite_app_notification_store_repairs_missing_delivery_upsert_index_before_acknowledge() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_schema(&pool).await;
    seed_notifications(&pool).await;
    sqlx::query("DROP INDEX uk_ops_notification_delivery_user_message_app")
        .execute(&pool)
        .await
        .unwrap();

    let store = SqliteAppNotificationStore::new(pool.clone());
    let subject = AppNotificationSubject {
        tenant_id: 100001,
        organization_id: 0,
        user_id: 30,
    };

    store
        .acknowledge(AcknowledgeAppNotificationCommand {
            subject,
            app_id: "claw-router".to_owned(),
            notification_id: "1".to_owned(),
        })
        .await
        .unwrap();

    assert_sqlite_index_exists(&pool, "uk_ops_notification_delivery_user_message_app").await;
    let delivery_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*)
        FROM ops_notification_delivery
        WHERE tenant_id = 100001
          AND organization_id = 0
          AND message_id = 1
          AND user_id = 30
          AND app_id = 'claw-router'
          AND delivery_channel = 1
          AND read_at IS NOT NULL
          AND popup_seen_at IS NOT NULL
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(1, delivery_count);
}

#[tokio::test]
async fn sqlite_app_notification_store_deduplicates_delivery_rows_before_repairing_upsert_index() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_schema(&pool).await;
    seed_notifications(&pool).await;
    sqlx::query("DROP INDEX uk_ops_notification_delivery_user_message_app")
        .execute(&pool)
        .await
        .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ops_notification_delivery
            (id, uuid, tenant_id, organization_id, user_id, status, app_id, message_id, delivery_channel, delivery_status, read_at, popup_seen_at, delivered_at, created_at, updated_at)
        VALUES
            (92, 'duplicate-read', 100001, 0, 30, 1, 'claw-router', 1, 1, 2, '2026-05-17 10:40:00', NULL, '2026-05-17 10:00:00', '2026-05-17 10:00:00', '2026-05-17 10:40:00'),
            (93, 'duplicate-popup', 100001, 0, 30, 1, 'claw-router', 1, 1, 2, NULL, '2026-05-17 10:41:00', '2026-05-17 10:00:00', '2026-05-17 10:00:00', '2026-05-17 10:41:00')
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let store = SqliteAppNotificationStore::new(pool.clone());
    let subject = AppNotificationSubject {
        tenant_id: 100001,
        organization_id: 0,
        user_id: 30,
    };

    store
        .acknowledge(AcknowledgeAppNotificationCommand {
            subject,
            app_id: "claw-router".to_owned(),
            notification_id: "1".to_owned(),
        })
        .await
        .unwrap();

    assert_sqlite_index_exists(&pool, "uk_ops_notification_delivery_user_message_app").await;
    let delivery_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*)
        FROM ops_notification_delivery
        WHERE tenant_id = 100001
          AND organization_id = 0
          AND message_id = 1
          AND user_id = 30
          AND app_id = 'claw-router'
          AND delivery_channel = 1
          AND read_at IS NOT NULL
          AND popup_seen_at IS NOT NULL
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(1, delivery_count);
}

async fn create_schema(pool: &sqlx::SqlitePool) {
    for statement in [
        r#"
        CREATE TABLE iam_organization_membership (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            membership_kind TEXT NOT NULL,
            employee_no TEXT,
            display_name TEXT,
            is_primary INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL,
            joined_at TEXT NOT NULL,
            left_at TEXT,
            remark TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        "#,
        r#"
        CREATE TABLE ops_notification_message (
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
        )
        "#,
        r#"
        CREATE TABLE ops_notification_recipient (
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
        )
        "#,
        r#"
        CREATE TABLE ops_notification_delivery (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL DEFAULT 0,
            organization_id INTEGER NOT NULL DEFAULT 0,
            user_id INTEGER,
            owner_type INTEGER,
            owner_id INTEGER,
            data_scope INTEGER NOT NULL DEFAULT 0,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            version INTEGER NOT NULL DEFAULT 0,
            deleted_at TEXT,
            deleted_by INTEGER,
            metadata TEXT NOT NULL DEFAULT '{}',
            app_id TEXT NOT NULL DEFAULT 'default',
            message_id INTEGER,
            delivery_channel INTEGER,
            delivery_status INTEGER,
            read_at TEXT,
            popup_seen_at TEXT,
            archived_at TEXT,
            delivered_at TEXT,
            failure_code TEXT,
            retry_count INTEGER
        )
        "#,
        r#"
        CREATE UNIQUE INDEX uk_ops_notification_delivery_user_message_app
        ON ops_notification_delivery (tenant_id, organization_id, message_id, user_id, app_id, delivery_channel)
        "#,
        r#"
        CREATE TABLE content_announcement (
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
            title TEXT,
            content TEXT,
            target_scope INTEGER,
            audience_filter TEXT,
            announcement_type INTEGER,
            pinned INTEGER,
            published_at TEXT,
            effective_from TEXT,
            effective_to TEXT
        )
        "#,
    ] {
        sqlx::query(statement).execute(pool).await.unwrap();
    }
}

async fn assert_sqlite_index_exists(pool: &sqlx::SqlitePool, name: &str) {
    let exists: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*)
        FROM sqlite_master
        WHERE type = 'index' AND name = ?
        "#,
    )
    .bind(name)
    .fetch_one(pool)
    .await
    .unwrap();
    assert_eq!(1, exists, "expected sqlite index {name} to exist");
}

async fn seed_notifications(pool: &sqlx::SqlitePool) {
    sqlx::query(
        r#"
        INSERT INTO iam_organization_membership
            (id, tenant_id, organization_id, user_id, membership_kind, display_name, is_primary, status, joined_at, created_at, updated_at)
        VALUES
            ('member-30', '100001', '0', '30', 'admin', 'Admin User', 1, 'active', '2026-05-17 00:00:00', '2026-05-17 00:00:00', '2026-05-17 00:00:00')
        "#,
    )
    .execute(pool)
    .await
    .unwrap();

    sqlx::query(
        r#"
        INSERT INTO ops_notification_message
            (id, uuid, tenant_id, organization_id, status, app_id, scope_type, message_code, message_type, title, summary, content, severity, priority, show_as_popup, published_at, expire_at, created_at, updated_at)
        VALUES
            (1, 'msg-1', 100001, 0, 1, 'claw-router', 1, 'launch', 1, 'Platform launch', 'Launch summary', 'Launch content', 1, 90, 1, '2026-05-17 10:00:00', '2099-01-01 00:00:00', '2026-05-17 10:00:00', '2026-05-17 10:00:00'),
            (2, 'msg-2', 100001, 0, 1, 'claw-router', 1, 'single-user', 2, 'Billing user notice', 'User summary', 'User content', 2, 80, 0, '2026-05-17 11:00:00', '2099-01-01 00:00:00', '2026-05-17 11:00:00', '2026-05-17 11:00:00'),
            (3, 'msg-3', 100001, 0, 1, 'claw-router', 1, 'role-admin', 3, 'Admin role notice', 'Role summary', 'Role content', 3, 70, 0, '2026-05-17 12:00:00', '2099-01-01 00:00:00', '2026-05-17 12:00:00', '2026-05-17 12:00:00'),
            (4, 'msg-4', 100001, 0, 1, NULL, 2, 'global-all-app', 4, 'Global service notice', 'Global summary', 'Global content', 4, 60, 1, '2026-05-17 13:00:00', '2099-01-01 00:00:00', '2026-05-17 13:00:00', '2026-05-17 13:00:00'),
            (5, 'msg-5', 100001, 0, 1, 'desktop-shell', 1, 'desktop-only', 1, 'Desktop notice', 'Desktop summary', 'Desktop content', 1, 50, 0, '2026-05-17 14:00:00', '2099-01-01 00:00:00', '2026-05-17 14:00:00', '2026-05-17 14:00:00'),
            (6, 'msg-6', 100001, 0, 1, 'claw-router', 1, 'expired', 1, 'Expired notice', 'Expired summary', 'Expired content', 1, 40, 0, '2026-05-17 15:00:00', '2026-05-18 00:00:00', '2026-05-17 15:00:00', '2026-05-17 15:00:00'),
            (7, 'msg-7', 100001, 0, 0, 'claw-router', 1, 'inactive', 1, 'Inactive notice', 'Inactive summary', 'Inactive content', 1, 30, 0, '2026-05-17 16:00:00', '2099-01-01 00:00:00', '2026-05-17 16:00:00', '2026-05-17 16:00:00'),
            (9, 'msg-9', 100001, 0, 1, 'claw-router', 1, 'read', 1, 'Read notice', 'Read summary', 'Read content', 1, 20, 1, '2026-05-17 09:00:00', '2099-01-01 00:00:00', '2026-05-17 09:00:00', '2026-05-17 09:00:00')
        "#,
    )
    .execute(pool)
    .await
    .unwrap();

    sqlx::query(
        r#"
        INSERT INTO ops_notification_recipient
            (id, uuid, tenant_id, organization_id, status, message_id, app_id, recipient_type, recipient_value, recipient_user_id, recipient_role_code)
        VALUES
            (1, 'recipient-1', 100001, 0, 1, 1, 'claw-router', 1, 'all', NULL, NULL),
            (2, 'recipient-2', 100001, 0, 1, 2, 'claw-router', 2, '30', 30, NULL),
            (3, 'recipient-3', 100001, 0, 1, 3, 'claw-router', 3, 'admin', NULL, 'admin'),
            (4, 'recipient-4', 100001, 0, 1, 4, NULL, 1, 'all', NULL, NULL),
            (5, 'recipient-5', 100001, 0, 1, 5, 'desktop-shell', 1, 'all', NULL, NULL),
            (6, 'recipient-6', 100001, 0, 1, 6, 'claw-router', 1, 'all', NULL, NULL),
            (7, 'recipient-7', 100001, 0, 1, 7, 'claw-router', 1, 'all', NULL, NULL),
            (9, 'recipient-9', 100001, 0, 1, 9, 'claw-router', 1, 'all', NULL, NULL)
        "#,
    )
    .execute(pool)
    .await
    .unwrap();

    sqlx::query(
        r#"
        INSERT INTO ops_notification_delivery
            (id, uuid, tenant_id, organization_id, user_id, status, app_id, message_id, delivery_channel, delivery_status, read_at, popup_seen_at, delivered_at, created_at, updated_at)
        VALUES
            (90, 'delivery-other-user', 100001, 0, 999, 1, 'claw-router', 1, 1, 2, '2026-05-17 10:30:00', '2026-05-17 10:31:00', '2026-05-17 10:00:00', '2026-05-17 10:00:00', '2026-05-17 10:00:00'),
            (91, 'delivery-read-user', 100001, 0, 30, 1, 'claw-router', 9, 1, 2, '2026-05-17 09:30:00', '2026-05-17 09:31:00', '2026-05-17 09:00:00', '2026-05-17 09:00:00', '2026-05-17 09:00:00')
        "#,
    )
    .execute(pool)
    .await
    .unwrap();
}

async fn seed_announcements(pool: &sqlx::SqlitePool) {
    sqlx::query(
        r#"
        INSERT INTO content_announcement
            (id, uuid, tenant_id, organization_id, status, title, content, target_scope, audience_filter, announcement_type, pinned, published_at, effective_from, effective_to, created_at, updated_at)
        VALUES
            (100, 'announcement-100', 100001, 0, 1, 'System maintenance', 'Maintenance starts tonight.', 1, '{"target":"all","showAsPopup":true}', 3, 0, '2026-05-17 16:00:00', '2026-05-17 00:00:00', '2099-01-01 00:00:00', '2026-05-17 16:00:00', '2026-05-17 16:00:00'),
            (101, 'announcement-101', 100001, 0, 1, 'Feature update', 'New console features are available.', 1, '{"target":"all","showAsPopup":false}', 1, 0, '2026-05-17 17:00:00', '2026-05-17 00:00:00', '2099-01-01 00:00:00', '2026-05-17 17:00:00', '2026-05-17 17:00:00'),
            (102, 'announcement-102', 100001, 0, 0, 'Draft announcement', 'Drafts stay hidden.', 1, '{"target":"all","showAsPopup":true}', 4, 0, '2026-05-17 18:00:00', '2026-05-17 00:00:00', '2099-01-01 00:00:00', '2026-05-17 18:00:00', '2026-05-17 18:00:00'),
            (103, 'announcement-103', 100001, 0, 1, 'VIP announcement', 'VIP-only content stays targeted.', 2, '{"target":"vip","showAsPopup":true}', 1, 0, '2026-05-17 19:00:00', '2026-05-17 00:00:00', '2099-01-01 00:00:00', '2026-05-17 19:00:00', '2026-05-17 19:00:00')
        "#,
    )
    .execute(pool)
    .await
    .unwrap();
}

async fn seed_standard_announcements(pool: &sqlx::SqlitePool) {
    sqlx::query(
        r#"
        INSERT INTO ops_notification_message
            (id, uuid, tenant_id, organization_id, status, app_id, scope_type, message_code, message_type, title, summary, content, severity, priority, show_as_popup, published_at, expire_at, created_at, updated_at)
        VALUES
            (100, 'announcement-msg-100', 100001, 0, 1, NULL, 2, 'announcement:100', 1, 'System maintenance', 'Maintenance starts tonight.', 'Maintenance starts tonight.', 3, 100, 1, '2026-05-17 16:00:00', '2099-01-01 00:00:00', '2026-05-17 16:00:00', '2026-05-17 16:00:00'),
            (101, 'announcement-msg-101', 100001, 0, 1, NULL, 2, 'announcement:101', 1, 'Feature update', 'New console features are available.', 'New console features are available.', 1, 0, 0, '2026-05-17 17:00:00', '2099-01-01 00:00:00', '2026-05-17 17:00:00', '2026-05-17 17:00:00')
        "#,
    )
    .execute(pool)
    .await
    .unwrap();

    sqlx::query(
        r#"
        INSERT INTO ops_notification_recipient
            (id, uuid, tenant_id, organization_id, status, message_id, app_id, recipient_type, recipient_value, recipient_user_id, recipient_role_code)
        VALUES
            (100, 'announcement-recipient-100', 100001, 0, 1, 100, NULL, 1, 'all', NULL, NULL),
            (101, 'announcement-recipient-101', 100001, 0, 1, 101, NULL, 1, 'all', NULL, NULL)
        "#,
    )
    .execute(pool)
    .await
    .unwrap();
}

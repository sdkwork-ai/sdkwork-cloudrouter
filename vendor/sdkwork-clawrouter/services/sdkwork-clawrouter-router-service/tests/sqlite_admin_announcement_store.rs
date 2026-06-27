use sdkwork_clawrouter_router_service::infrastructure::sql::sqlite::SqliteAdminAnnouncementStore;
use sdkwork_clawrouter_router_service::ports::{
    AdminAnnouncementStore, AdminAnnouncementSubject, CreateAdminAnnouncementCommand,
    DeleteAdminAnnouncementCommand, ListAdminAnnouncementsQuery, UpdateAdminAnnouncementCommand,
};
use sqlx::sqlite::SqlitePoolOptions;

#[tokio::test]
async fn sqlite_admin_announcement_store_uses_standard_notification_tables() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_schema(&pool).await;

    let store = SqliteAdminAnnouncementStore::new(pool.clone());
    let subject = AdminAnnouncementSubject {
        tenant_id: 100001,
        organization_id: 0,
        operator_id: 30,
        operator_type: 1,
    };

    let created = store
        .create_announcement(CreateAdminAnnouncementCommand {
            subject,
            announcement_uuid: "announcement-uuid".to_owned(),
            audit_log_uuid: "audit-create".to_owned(),
            title: "Gateway maintenance".to_owned(),
            content: "Maintenance window at 23:00 UTC".to_owned(),
            target: "all".to_owned(),
            status: "published".to_owned(),
            show_as_popup: true,
            request_id: "req-create".to_owned(),
            requested_at: "2026-05-18 10:00:00".to_owned(),
        })
        .await
        .unwrap();

    assert_eq!(1, created.id);
    assert_eq!("Gateway maintenance", created.title);
    assert_eq!("all", created.target);
    assert_eq!("published", created.status);
    assert_eq!(true, created.show_as_popup);

    let content_announcement_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM content_announcement")
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(
        0, content_announcement_count,
        "admin announcements must not create a second announcement persistence model"
    );

    let standard_message_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM ops_notification_message WHERE id = 1")
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(1, standard_message_count);

    let recipient: (i64, String) = sqlx::query_as(
        r#"
        SELECT recipient_type, recipient_value
        FROM ops_notification_recipient
        WHERE message_id = 1
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(1, recipient.0);
    assert_eq!("all", recipient.1);

    let updated = store
        .update_announcement(UpdateAdminAnnouncementCommand {
            subject,
            announcement_id: created.id,
            audit_log_uuid: "audit-update".to_owned(),
            title: None,
            content: Some("Maintenance postponed.".to_owned()),
            target: Some("vip".to_owned()),
            status: Some("draft".to_owned()),
            show_as_popup: Some(false),
            request_id: "req-update".to_owned(),
            requested_at: "2026-05-18 10:10:00".to_owned(),
        })
        .await
        .unwrap()
        .unwrap();

    assert_eq!("Maintenance postponed.", updated.content);
    assert_eq!("vip", updated.target);
    assert_eq!("draft", updated.status);
    assert_eq!(false, updated.show_as_popup);

    let listed = store
        .list_announcements(ListAdminAnnouncementsQuery { subject })
        .await
        .unwrap();
    assert_eq!(1, listed.len());
    assert_eq!("vip", listed[0].target);

    assert!(store
        .delete_announcement(DeleteAdminAnnouncementCommand {
            subject,
            announcement_id: created.id,
            audit_log_uuid: "audit-delete".to_owned(),
            request_id: "req-delete".to_owned(),
            requested_at: "2026-05-18 10:20:00".to_owned(),
        })
        .await
        .unwrap());

    let visible = store
        .list_announcements(ListAdminAnnouncementsQuery { subject })
        .await
        .unwrap();
    assert!(visible.is_empty());

    let audit_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM ops_audit_log WHERE target_type = 21")
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(3, audit_count);
}

async fn create_schema(pool: &sqlx::SqlitePool) {
    for statement in [
        r#"
        CREATE TABLE content_announcement (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL DEFAULT 0,
            organization_id INTEGER NOT NULL DEFAULT 0,
            status INTEGER NOT NULL DEFAULT 1,
            title TEXT,
            content TEXT
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
        CREATE TABLE ops_audit_log (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            action TEXT NOT NULL,
            target_type INTEGER NOT NULL,
            target_id INTEGER,
            request_id TEXT,
            operator_id INTEGER,
            operator_type INTEGER,
            change_summary TEXT
        )
        "#,
    ] {
        sqlx::query(statement).execute(pool).await.unwrap();
    }
}

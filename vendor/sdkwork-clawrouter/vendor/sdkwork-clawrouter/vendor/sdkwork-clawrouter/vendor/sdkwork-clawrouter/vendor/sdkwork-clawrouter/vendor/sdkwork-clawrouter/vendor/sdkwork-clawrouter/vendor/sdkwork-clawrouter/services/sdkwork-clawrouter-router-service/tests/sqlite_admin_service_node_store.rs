use sdkwork_clawrouter_router_service::infrastructure::sql::sqlite::SqliteAdminServiceNodeStore;
use sdkwork_clawrouter_router_service::ports::{
    AdminServiceNodeStore, AdminServiceNodeSubject, CreateAdminServiceNodeCommand,
    DeleteAdminServiceNodeCommand, ListAdminServiceNodesQuery, UpdateAdminServiceNodeCommand,
    UpdateAdminServiceNodeStatusCommand,
};
use sqlx::sqlite::SqlitePoolOptions;
use sqlx::SqlitePool;

#[tokio::test]
async fn sqlite_admin_service_node_store_manages_gateway_instance_configuration() {
    let pool = sqlite_pool().await;
    create_gateway_instance_table(&pool).await;
    seed_gateway_instances(&pool).await;

    let store = SqliteAdminServiceNodeStore::new(pool.clone());
    let listed = store
        .list_service_nodes(ListAdminServiceNodesQuery {
            subject: subject(),
            search: Some("shanghai".to_owned()),
            status: Some("enabled".to_owned()),
        })
        .await
        .unwrap();

    assert_eq!(1, listed.len());
    assert_eq!("node-shanghai", listed[0].id);
    assert_eq!("edge-shanghai-01", listed[0].name);
    assert_eq!("edge-shanghai.example.com", listed[0].domain);
    assert_eq!("10.0.0.10", listed[0].ip);
    assert_eq!("Shanghai relay node", listed[0].remark);
    assert_eq!("enabled", listed[0].status);
    assert_eq!("online", listed[0].health_status);

    let created = store
        .create_service_node(CreateAdminServiceNodeCommand {
            subject: subject(),
            name: "edge-beijing-01".to_owned(),
            domain: "edge-beijing.example.com".to_owned(),
            ip: "10.0.1.10".to_owned(),
            remark: "Beijing relay node".to_owned(),
            status: Some("enabled".to_owned()),
        })
        .await
        .unwrap();

    assert!(!created.id.is_empty());
    assert_eq!("edge-beijing-01", created.name);
    assert_eq!("edge-beijing.example.com", created.domain);
    assert_eq!("10.0.1.10", created.ip);
    assert_eq!("Beijing relay node", created.remark);
    assert_eq!("enabled", created.status);
    assert_eq!("unknown", created.health_status);

    let updated = store
        .update_service_node(UpdateAdminServiceNodeCommand {
            subject: subject(),
            node_id: created.id.clone(),
            name: Some("edge-beijing-primary".to_owned()),
            domain: Some("edge-bj.example.com".to_owned()),
            ip: Some("10.0.1.11".to_owned()),
            remark: Some("Primary Beijing relay".to_owned()),
        })
        .await
        .unwrap();

    assert_eq!("edge-beijing-primary", updated.name);
    assert_eq!("edge-bj.example.com", updated.domain);
    assert_eq!("10.0.1.11", updated.ip);
    assert_eq!("Primary Beijing relay", updated.remark);

    let disabled = store
        .update_service_node_status(UpdateAdminServiceNodeStatusCommand {
            subject: subject(),
            node_id: created.id.clone(),
            status: "disabled".to_owned(),
        })
        .await
        .unwrap();
    assert_eq!("disabled", disabled.status);

    let delete_outcome = store
        .delete_service_node(DeleteAdminServiceNodeCommand {
            subject: subject(),
            node_id: created.id,
        })
        .await
        .unwrap();
    assert!(delete_outcome.deleted);

    let after_delete = store
        .list_service_nodes(ListAdminServiceNodesQuery {
            subject: subject(),
            search: Some("beijing".to_owned()),
            status: None,
        })
        .await
        .unwrap();
    assert!(after_delete.is_empty());
}

async fn sqlite_pool() -> SqlitePool {
    SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap()
}

fn subject() -> AdminServiceNodeSubject {
    AdminServiceNodeSubject {
        tenant_id: 100001,
        organization_id: 0,
        operator_id: 30,
        operator_type: 1,
    }
}

async fn create_gateway_instance_table(pool: &SqlitePool) {
    sqlx::query(
        r#"
        CREATE TABLE ops_gateway_instance (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER,
            organization_id INTEGER,
            data_scope INTEGER,
            status INTEGER NOT NULL,
            created_at TEXT,
            updated_at TEXT,
            version INTEGER,
            deleted_at TEXT,
            deleted_by INTEGER,
            metadata TEXT,
            instance_code TEXT,
            deployment_mode INTEGER,
            region TEXT,
            cell TEXT,
            version_name TEXT,
            host_name TEXT,
            ip_address_hash TEXT,
            ip_address_masked TEXT,
            node_name TEXT,
            pod_name TEXT,
            container_id_hash TEXT,
            desktop_device_hash TEXT,
            runtime_type INTEGER,
            orchestrator TEXT,
            started_at TEXT,
            last_heartbeat_at TEXT,
            health_status INTEGER,
            config_hash TEXT
        )
        "#,
    )
    .execute(pool)
    .await
    .unwrap();
}

async fn seed_gateway_instances(pool: &SqlitePool) {
    sqlx::query(
        r#"
        INSERT INTO ops_gateway_instance (
            id, uuid, tenant_id, organization_id, data_scope, status, created_at, updated_at,
            version, deleted_at, deleted_by, metadata, instance_code, deployment_mode, region,
            cell, version_name, host_name, ip_address_hash, ip_address_masked, node_name,
            pod_name, container_id_hash, desktop_device_hash, runtime_type, orchestrator,
            started_at, last_heartbeat_at, health_status, config_hash
        )
        VALUES
            (101, 'uuid-shanghai', 100001, 0, 1, 1, '2026-05-26 07:00:00', '2026-05-26 08:00:00',
             1, NULL, NULL, '{"domain":"edge-shanghai.example.com","remark":"Shanghai relay node"}',
             'node-shanghai', 2, 'cn-east', 'sh-a', '2026.05', 'sh-host', NULL, '10.0.0.10',
             'edge-shanghai-01', NULL, NULL, NULL, 2, 'kubernetes', '2026-05-26 07:00:00',
             '2026-05-26 08:00:00', 1, 'config-shanghai'),
            (102, 'uuid-disabled', 100001, 0, 1, 0, '2026-05-26 07:00:00', '2026-05-26 08:00:00',
             1, NULL, NULL, '{"domain":"edge-disabled.example.com","remark":"Disabled relay node"}',
             'node-disabled', 2, 'cn-east', 'sh-b', '2026.05', 'disabled-host', NULL, '10.0.0.11',
             'edge-disabled-01', NULL, NULL, NULL, 2, 'kubernetes', '2026-05-26 07:00:00',
             '2026-05-26 08:00:00', 0, 'config-disabled'),
            (103, 'uuid-other', 99, 99, 1, 1, '2026-05-26 07:00:00', '2026-05-26 08:00:00',
             1, NULL, NULL, '{"domain":"edge-other.example.com","remark":"Other tenant"}',
             'node-other', 2, 'cn-north', 'bj-a', '2026.05', 'other-host', NULL, '10.0.2.10',
             'edge-other-01', NULL, NULL, NULL, 2, 'kubernetes', '2026-05-26 07:00:00',
             '2026-05-26 08:00:00', 1, 'config-other'),
            (104, 'uuid-deleted', 100001, 0, 1, 1, '2026-05-26 07:00:00', '2026-05-26 08:00:00',
             1, '2026-05-26 08:30:00', 30, '{"domain":"edge-deleted.example.com","remark":"Deleted"}',
             'node-deleted', 2, 'cn-east', 'sh-c', '2026.05', 'deleted-host', NULL, '10.0.0.12',
             'edge-deleted-01', NULL, NULL, NULL, 2, 'kubernetes', '2026-05-26 07:00:00',
             '2026-05-26 08:00:00', 1, 'config-deleted')
        "#,
    )
    .execute(pool)
    .await
    .unwrap();
}

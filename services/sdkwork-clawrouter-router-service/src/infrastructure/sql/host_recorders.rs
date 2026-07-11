use sdkwork_models_contract_service::{
    AiRoutingConfigChange as ModelsAiRoutingConfigChange, AiRoutingConfigChangeFuture,
    AiRoutingConfigChangeRecorder, DomainResult, OpsAuditLogEntry, OpsAuditLogFuture,
    OpsAuditLogRecorder,
};
use sqlx::{Postgres, Sqlite, Transaction};

use crate::infrastructure::sql::routing_config_change::{
    AiRoutingConfigChange, record_postgres_ai_routing_config_change,
    record_sqlite_ai_routing_config_change,
};
use crate::infrastructure::sql::runtime_id::next_claw_runtime_id;
use sdkwork_models_contract_service::DomainError;

pub struct ClawRouterAiRoutingConfigChangeRecorder;

impl AiRoutingConfigChangeRecorder for ClawRouterAiRoutingConfigChangeRecorder {
    fn record_sqlite_change<'a>(
        &'a self,
        tx: &'a mut Transaction<'a, Sqlite>,
        change: ModelsAiRoutingConfigChange<'a>,
    ) -> AiRoutingConfigChangeFuture<'a> {
        Box::pin(async move {
            record_sqlite_ai_routing_config_change(tx, to_local_change(change)).await
        })
    }

    fn record_postgres_change<'a>(
        &'a self,
        tx: &'a mut Transaction<'a, Postgres>,
        change: ModelsAiRoutingConfigChange<'a>,
    ) -> AiRoutingConfigChangeFuture<'a> {
        Box::pin(async move {
            record_postgres_ai_routing_config_change(tx, to_local_change(change)).await
        })
    }
}

pub struct ClawRouterOpsAuditLogRecorder;

impl OpsAuditLogRecorder for ClawRouterOpsAuditLogRecorder {
    fn record_sqlite_audit_log<'a>(
        &'a self,
        tx: &'a mut Transaction<'a, Sqlite>,
        entry: OpsAuditLogEntry<'a>,
    ) -> OpsAuditLogFuture<'a> {
        Box::pin(async move {
            sqlx::query(
                r#"
                INSERT INTO ops_audit_log
                    (id, uuid, tenant_id, organization_id, action, target_type, target_id, request_id, operator_id, operator_type, change_summary)
                VALUES
                    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                "#,
            )
            .bind(next_claw_runtime_id("ops_audit_log")?)
            .bind(entry.audit_log_uuid)
            .bind(entry.tenant_id)
            .bind(entry.organization_id)
            .bind(entry.action)
            .bind(entry.target_type)
            .bind(entry.target_id)
            .bind(entry.request_id)
            .bind(entry.operator_id)
            .bind(entry.operator_type)
            .bind(entry.change_summary.to_string())
            .execute(&mut **tx)
            .await
            .map_err(|error| {
                DomainError::new(format!("failed to write AI resource audit log: {error}"))
            })?;
            Ok(())
        })
    }

    fn record_postgres_audit_log<'a>(
        &'a self,
        tx: &'a mut Transaction<'a, Postgres>,
        entry: OpsAuditLogEntry<'a>,
    ) -> OpsAuditLogFuture<'a> {
        Box::pin(async move {
            sqlx::query(
                r#"
                INSERT INTO ops_audit_log
                    (id, uuid, tenant_id, organization_id, action, target_type, target_id, request_id, operator_id, operator_type, change_summary)
                VALUES
                    ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)
                "#,
            )
            .bind(next_claw_runtime_id("ops_audit_log")?)
            .bind(entry.audit_log_uuid)
            .bind(entry.tenant_id)
            .bind(entry.organization_id)
            .bind(entry.action)
            .bind(entry.target_type)
            .bind(entry.target_id)
            .bind(entry.request_id)
            .bind(entry.operator_id)
            .bind(entry.operator_type)
            .bind(entry.change_summary)
            .execute(&mut **tx)
            .await
            .map_err(|error| {
                DomainError::new(format!("failed to write AI resource audit log: {error}"))
            })?;
            Ok(())
        })
    }
}

fn to_local_change(change: ModelsAiRoutingConfigChange<'_>) -> AiRoutingConfigChange<'_> {
    AiRoutingConfigChange {
        tenant_id: change.tenant_id,
        organization_id: change.organization_id,
        operator_id: change.operator_id,
        request_id: change.request_id,
        requested_at: change.requested_at,
        changed_object_type: change.changed_object_type,
        changed_object_id: change.changed_object_id,
        action: change.action,
        event_payload: change.event_payload,
    }
}

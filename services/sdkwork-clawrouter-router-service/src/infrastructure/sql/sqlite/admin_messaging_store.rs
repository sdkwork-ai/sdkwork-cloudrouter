use sqlx::{Row, SqlitePool};

use crate::domain::{DomainError, DomainResult};
use crate::infrastructure::sql::model_catalog_import::stable_uuid;
use crate::infrastructure::sql::runtime_id::next_claw_runtime_id;
use crate::infrastructure::sql::sql_admin_messaging::{
    status_label_sql, MESSAGING_AUDIT_TARGET_PROVIDER_ACCOUNT, MESSAGING_AUDIT_TARGET_ROUTE_RULE,
    MESSAGING_AUDIT_TARGET_SENDER_IDENTITY, MESSAGING_AUDIT_TARGET_SEND_REQUEST,
    MESSAGING_AUDIT_TARGET_SUPPRESSION, MESSAGING_AUDIT_TARGET_TEMPLATE,
    MESSAGING_AUDIT_TARGET_TEMPLATE_VERSION, MESSAGING_AUDIT_TARGET_VERIFICATION_POLICY,
};
use crate::ports::{
    AdminMessagingCollection, AdminMessagingCommandFuture, AdminMessagingJsonRecord,
    AdminMessagingMutationItem, AdminMessagingRouteSimulationCommand,
    AdminMessagingRouteSimulationItem, AdminMessagingStore, AdminMessagingTemplateSendCommand,
    AdminMessagingTestSendCommand, AdminMessagingTestSendItem,
    CreateMessagingProviderAccountCommand, CreateMessagingRouteRuleCommand,
    CreateMessagingSenderIdentityCommand, CreateMessagingSuppressionCommand,
    CreateMessagingTemplateCommand, ListAdminMessagingRecordsQuery,
    PublishMessagingTemplateVersionCommand, UpdateVerificationPolicyCommand,
};

#[derive(Debug, Clone)]
pub struct SqliteAdminMessagingStore {
    pool: SqlitePool,
}

impl SqliteAdminMessagingStore {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }
}

impl AdminMessagingStore for SqliteAdminMessagingStore {
    fn list_provider_accounts<'a>(
        &'a self,
        query: ListAdminMessagingRecordsQuery,
    ) -> AdminMessagingCommandFuture<'a, AdminMessagingCollection> {
        Box::pin(async move { list_provider_accounts(&self.pool, query).await })
    }

    fn create_provider_account<'a>(
        &'a self,
        command: CreateMessagingProviderAccountCommand,
    ) -> AdminMessagingCommandFuture<'a, AdminMessagingMutationItem> {
        Box::pin(async move { create_provider_account(&self.pool, command).await })
    }

    fn list_sender_identities<'a>(
        &'a self,
        query: ListAdminMessagingRecordsQuery,
    ) -> AdminMessagingCommandFuture<'a, AdminMessagingCollection> {
        Box::pin(async move { list_sender_identities(&self.pool, query).await })
    }

    fn create_sender_identity<'a>(
        &'a self,
        command: CreateMessagingSenderIdentityCommand,
    ) -> AdminMessagingCommandFuture<'a, AdminMessagingMutationItem> {
        Box::pin(async move { create_sender_identity(&self.pool, command).await })
    }

    fn list_templates<'a>(
        &'a self,
        query: ListAdminMessagingRecordsQuery,
    ) -> AdminMessagingCommandFuture<'a, AdminMessagingCollection> {
        Box::pin(async move { list_templates(&self.pool, query).await })
    }

    fn create_template<'a>(
        &'a self,
        command: CreateMessagingTemplateCommand,
    ) -> AdminMessagingCommandFuture<'a, AdminMessagingMutationItem> {
        Box::pin(async move { create_template(&self.pool, command).await })
    }

    fn publish_template_version<'a>(
        &'a self,
        command: PublishMessagingTemplateVersionCommand,
    ) -> AdminMessagingCommandFuture<'a, AdminMessagingMutationItem> {
        Box::pin(async move { publish_template_version(&self.pool, command).await })
    }

    fn list_route_rules<'a>(
        &'a self,
        query: ListAdminMessagingRecordsQuery,
    ) -> AdminMessagingCommandFuture<'a, AdminMessagingCollection> {
        Box::pin(async move { list_route_rules(&self.pool, query).await })
    }

    fn create_route_rule<'a>(
        &'a self,
        command: CreateMessagingRouteRuleCommand,
    ) -> AdminMessagingCommandFuture<'a, AdminMessagingMutationItem> {
        Box::pin(async move { create_route_rule(&self.pool, command).await })
    }

    fn list_send_requests<'a>(
        &'a self,
        query: ListAdminMessagingRecordsQuery,
    ) -> AdminMessagingCommandFuture<'a, AdminMessagingCollection> {
        Box::pin(async move { list_send_requests(&self.pool, query).await })
    }

    fn simulate_route<'a>(
        &'a self,
        command: AdminMessagingRouteSimulationCommand,
    ) -> AdminMessagingCommandFuture<'a, AdminMessagingRouteSimulationItem> {
        Box::pin(async move { simulate_route(&self.pool, command).await })
    }

    fn test_send<'a>(
        &'a self,
        command: AdminMessagingTestSendCommand,
    ) -> AdminMessagingCommandFuture<'a, AdminMessagingTestSendItem> {
        Box::pin(async move { test_send(&self.pool, command).await })
    }

    fn send_template<'a>(
        &'a self,
        command: AdminMessagingTemplateSendCommand,
    ) -> AdminMessagingCommandFuture<'a, AdminMessagingTestSendItem> {
        Box::pin(async move { send_template(&self.pool, command).await })
    }

    fn list_suppressions<'a>(
        &'a self,
        query: ListAdminMessagingRecordsQuery,
    ) -> AdminMessagingCommandFuture<'a, AdminMessagingCollection> {
        Box::pin(async move { list_suppressions(&self.pool, query).await })
    }

    fn create_suppression<'a>(
        &'a self,
        command: CreateMessagingSuppressionCommand,
    ) -> AdminMessagingCommandFuture<'a, AdminMessagingMutationItem> {
        Box::pin(async move { create_suppression(&self.pool, command).await })
    }

    fn list_rate_limit_buckets<'a>(
        &'a self,
        query: ListAdminMessagingRecordsQuery,
    ) -> AdminMessagingCommandFuture<'a, AdminMessagingCollection> {
        Box::pin(async move { list_rate_limit_buckets(&self.pool, query).await })
    }

    fn list_verification_policies<'a>(
        &'a self,
        query: ListAdminMessagingRecordsQuery,
    ) -> AdminMessagingCommandFuture<'a, AdminMessagingCollection> {
        Box::pin(async move { list_verification_policies(&self.pool, query).await })
    }

    fn update_verification_policy<'a>(
        &'a self,
        command: UpdateVerificationPolicyCommand,
    ) -> AdminMessagingCommandFuture<'a, AdminMessagingMutationItem> {
        Box::pin(async move { update_verification_policy(&self.pool, command).await })
    }
}

async fn list_provider_accounts(
    pool: &SqlitePool,
    query: ListAdminMessagingRecordsQuery,
) -> DomainResult<AdminMessagingCollection> {
    let rows = sqlx::query(&format!(
        r#"
        SELECT
            CAST(COALESCE(c.id, a.id) AS TEXT) AS id,
            CAST(a.id AS TEXT) AS providerAccountId,
            CAST(c.id AS TEXT) AS capabilityId,
            a.account_code AS code,
            a.account_code AS accountCode,
            a.account_name AS name,
            a.account_name AS accountName,
            a.supplier_code AS providerCode,
            COALESCE(c.channel, '') AS channel,
            COALESCE(c.delivery_purpose, '') AS deliveryPurpose,
            {status_label} AS status,
            COALESCE(c.health_status, 'unknown') AS healthStatus,
            CAST(a.updated_at AS TEXT) AS updatedAt,
            CAST(COUNT(*) OVER() AS INTEGER) AS total
        FROM integration_provider_account a
        LEFT JOIN messaging_provider_capability c
          ON c.tenant_id = a.tenant_id
         AND c.organization_id = a.organization_id
         AND c.provider_account_id = a.id
         AND c.deleted_at IS NULL
        WHERE a.tenant_id = ?1
          AND a.organization_id = ?2
          AND a.deleted_at IS NULL
          AND (?3 IS NULL OR {status_label} = ?3)
          AND (?4 IS NULL OR c.channel = ?4)
          AND (?5 IS NULL OR a.supplier_code = ?5)
          AND (?6 IS NULL OR lower(a.account_code) LIKE ?6 OR lower(a.account_name) LIKE ?6 OR lower(a.supplier_code) LIKE ?6)
        ORDER BY a.updated_at DESC, a.id DESC
        LIMIT ?7 OFFSET ?8
        "#,
        status_label = status_label_sql("a.status")
    ))
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.status.as_deref())
    .bind(query.channel.as_deref())
    .bind(query.supplier_code.as_deref())
    .bind(like_filter(query.q.as_deref()))
    .bind(query.page_size)
    .bind(query.offset)
    .fetch_all(pool)
    .await
    .map_err(store_error)?;

    collection_from_rows(rows, query, PROVIDER_ACCOUNT_FIELDS)
}

async fn create_provider_account(
    pool: &SqlitePool,
    command: CreateMessagingProviderAccountCommand,
) -> DomainResult<AdminMessagingMutationItem> {
    let delivery_purpose = command
        .delivery_purpose
        .as_deref()
        .unwrap_or("verification")
        .to_owned();
    let account_id = if let Some(id) = existing_provider_account_id(
        pool,
        command.subject.tenant_id,
        command.subject.organization_id,
        &command.supplier_code,
        &command.account_code,
    )
    .await?
    {
        id
    } else {
        let provider_id = sqlx::query_scalar::<_, i64>(
            r#"
            SELECT id
            FROM integration_provider
            WHERE supplier_code = ?1
              AND deleted_at IS NULL
            LIMIT 1
            "#,
        )
        .bind(&command.supplier_code)
        .fetch_optional(pool)
        .await
        .map_err(store_error)?;

        let account_id = next_claw_runtime_id("integration_provider_account")?;
        sqlx::query(
            r#"
            INSERT INTO integration_provider_account
                (uuid, tenant_id, organization_id, status, provider_id, supplier_code, account_code,
                 account_name, auth_type, base_url, auth_config, secret_ref, id)
            VALUES
                (?1, ?2, ?3, 1, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
            "#,
        )
        .bind(stable_uuid(
            "messaging-provider-account",
            &[
                &command.subject.tenant_id.to_string(),
                &command.subject.organization_id.to_string(),
                &command.supplier_code,
                &command.account_code,
                &command.idempotency_key,
            ],
        ))
        .bind(command.subject.tenant_id)
        .bind(command.subject.organization_id)
        .bind(provider_id)
        .bind(&command.supplier_code)
        .bind(&command.account_code)
        .bind(&command.account_name)
        .bind(auth_type_code(command.auth_type.as_deref()))
        .bind(command.base_url.as_deref())
        .bind(json_text(
            &serde_json::json!({ "authType": command.auth_type }),
        ))
        .bind(&command.secret_ref)
        .bind(account_id)
        .execute(pool)
        .await
        .map_err(|error| write_error("failed to create messaging provider account", error))?;
        account_id
    };

    if existing_provider_capability_id(
        pool,
        command.subject,
        account_id,
        &command.channel,
        &delivery_purpose,
    )
    .await?
    .is_none()
    {
        sqlx::query(
            r#"
            INSERT INTO messaging_provider_capability
                (uuid, tenant_id, organization_id, status, supplier_code, provider_account_id, channel,
                 delivery_purpose, capability_schema, supports_template_sync, supports_delivery_receipt,
                 supports_test_send, supports_batch_send, supports_webhook, sandbox_supported, id)
            VALUES
                (?1, ?2, ?3, 1, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)
            "#,
        )
        .bind(stable_uuid(
            "messaging-provider-capability",
            &[
                &command.subject.tenant_id.to_string(),
                &command.subject.organization_id.to_string(),
                &account_id.to_string(),
                &command.channel,
                &delivery_purpose,
            ],
        ))
        .bind(command.subject.tenant_id)
        .bind(command.subject.organization_id)
        .bind(&command.supplier_code)
        .bind(account_id)
        .bind(&command.channel)
        .bind(&delivery_purpose)
        .bind(json_text(&command.capability_schema))
        .bind(json_bool(
            &command.capability_schema,
            "supportsTemplateSync",
        ))
        .bind(json_bool(
            &command.capability_schema,
            "supportsDeliveryReceipt",
        ))
        .bind(true)
        .bind(json_bool(&command.capability_schema, "supportsBatchSend"))
        .bind(json_bool(&command.capability_schema, "supportsWebhook"))
        .bind(json_bool(&command.capability_schema, "sandboxSupported"))
        .bind(next_claw_runtime_id("messaging_provider_capability")?)
        .execute(pool)
        .await
        .map_err(|error| write_error("failed to create messaging provider capability", error))?;

        insert_audit_if_absent(
            pool,
            command.subject,
            &command.request_id,
            "messaging.provider_account.create",
            MESSAGING_AUDIT_TARGET_PROVIDER_ACCOUNT,
            account_id,
            None,
        )
        .await?;
    }
    Ok(mutation(account_id, "active"))
}

async fn list_sender_identities(
    pool: &SqlitePool,
    query: ListAdminMessagingRecordsQuery,
) -> DomainResult<AdminMessagingCollection> {
    let rows = sqlx::query(&format!(
        r#"
        SELECT
            CAST(s.id AS TEXT) AS id,
            s.identity_code AS code,
            s.identity_code AS identityCode,
            COALESCE(s.display_name, s.identity_code) AS name,
            COALESCE(s.display_name, s.identity_code) AS displayName,
            s.supplier_code AS providerCode,
            s.channel AS channel,
            s.approval_status AS approvalStatus,
            {status_label} AS status,
            CAST(s.updated_at AS TEXT) AS updatedAt,
            CAST(COUNT(*) OVER() AS INTEGER) AS total
        FROM messaging_sender_identity s
        WHERE s.tenant_id = ?1
          AND s.organization_id = ?2
          AND s.deleted_at IS NULL
          AND (?3 IS NULL OR {status_label} = ?3 OR s.approval_status = ?3)
          AND (?4 IS NULL OR s.channel = ?4)
          AND (?5 IS NULL OR s.supplier_code = ?5)
          AND (?6 IS NULL OR lower(s.identity_code) LIKE ?6 OR lower(COALESCE(s.display_name, '')) LIKE ?6)
        ORDER BY s.updated_at DESC, s.id DESC
        LIMIT ?7 OFFSET ?8
        "#,
        status_label = status_label_sql("s.status")
    ))
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.status.as_deref())
    .bind(query.channel.as_deref())
    .bind(query.supplier_code.as_deref())
    .bind(like_filter(query.q.as_deref()))
    .bind(query.page_size)
    .bind(query.offset)
    .fetch_all(pool)
    .await
    .map_err(store_error)?;

    collection_from_rows(rows, query, SENDER_IDENTITY_FIELDS)
}

async fn create_sender_identity(
    pool: &SqlitePool,
    command: CreateMessagingSenderIdentityCommand,
) -> DomainResult<AdminMessagingMutationItem> {
    let account_id = parse_required_id(&command.provider_account_id, "providerAccountId")?;
    let supplier_code =
        load_provider_account_supplier_code(pool, command.subject, account_id).await?;
    ensure_provider_account_supports_channel(pool, command.subject, account_id, &command.channel)
        .await?;
    if let Some(id) =
        existing_sender_identity_id(pool, command.subject, account_id, &command.identity_code)
            .await?
    {
        return Ok(mutation(id, "draft"));
    }
    let id = next_claw_runtime_id("messaging_sender_identity")?;
    sqlx::query(
        r#"
        INSERT INTO messaging_sender_identity
            (uuid, tenant_id, organization_id, status, provider_account_id, supplier_code, channel,
             identity_code, display_name, from_email, from_name, reply_to, domain_name, sign_name,
             sender_id, country_code, id)
        VALUES
            (?1, ?2, ?3, 1, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)
        "#,
    )
    .bind(stable_uuid(
        "messaging-sender-identity",
        &[
            &command.subject.tenant_id.to_string(),
            &command.subject.organization_id.to_string(),
            &account_id.to_string(),
            &command.identity_code,
            &command.idempotency_key,
        ],
    ))
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(account_id)
    .bind(&supplier_code)
    .bind(&command.channel)
    .bind(&command.identity_code)
    .bind(command.display_name.as_deref())
    .bind(command.from_email.as_deref())
    .bind(command.from_name.as_deref())
    .bind(command.reply_to.as_deref())
    .bind(command.domain_name.as_deref())
    .bind(command.sign_name.as_deref())
    .bind(command.sender_id.as_deref())
    .bind(command.country_code.as_deref())
    .bind(id)
    .execute(pool)
    .await
    .map_err(|error| write_error("failed to create messaging sender identity", error))?;
    insert_audit_if_absent(
        pool,
        command.subject,
        &command.request_id,
        "messaging.sender_identity.create",
        MESSAGING_AUDIT_TARGET_SENDER_IDENTITY,
        id,
        None,
    )
    .await?;
    Ok(mutation(id, "draft"))
}

async fn list_templates(
    pool: &SqlitePool,
    query: ListAdminMessagingRecordsQuery,
) -> DomainResult<AdminMessagingCollection> {
    let rows = sqlx::query(
        r#"
        SELECT
            CAST(t.id AS TEXT) AS id,
            t.template_code AS code,
            t.template_code AS templateCode,
            t.template_name AS name,
            t.template_name AS templateName,
            t.scene_code AS sceneCode,
            t.channel AS channel,
            t.delivery_purpose AS deliveryPurpose,
            t.category AS category,
            t.publish_status AS status,
            t.publish_status AS publishStatus,
            CAST(t.updated_at AS TEXT) AS updatedAt,
            CAST(COUNT(*) OVER() AS INTEGER) AS total
        FROM messaging_template t
        WHERE t.tenant_id = ?1
          AND t.organization_id = ?2
          AND t.deleted_at IS NULL
          AND (?3 IS NULL OR t.publish_status = ?3)
          AND (?4 IS NULL OR t.channel = ?4)
          AND (?5 IS NULL OR t.scene_code = ?5)
          AND (?6 IS NULL OR lower(t.template_code) LIKE ?6 OR lower(t.template_name) LIKE ?6)
        ORDER BY t.updated_at DESC, t.id DESC
        LIMIT ?7 OFFSET ?8
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.status.as_deref())
    .bind(query.channel.as_deref())
    .bind(query.scene_code.as_deref())
    .bind(like_filter(query.q.as_deref()))
    .bind(query.page_size)
    .bind(query.offset)
    .fetch_all(pool)
    .await
    .map_err(store_error)?;

    collection_from_rows(rows, query, TEMPLATE_FIELDS)
}

async fn create_template(
    pool: &SqlitePool,
    command: CreateMessagingTemplateCommand,
) -> DomainResult<AdminMessagingMutationItem> {
    if let Some(id) = existing_template_id(pool, command.subject, &command.template_code).await? {
        return Ok(mutation(id, "draft"));
    }
    let template_id = next_claw_runtime_id("messaging_template")?;
    sqlx::query(
        r#"
        INSERT INTO messaging_template
            (uuid, tenant_id, organization_id, status, template_code, scene_code, channel, delivery_purpose, category, template_name, publish_status, id)
        VALUES
            (?1, ?2, ?3, 1, ?4, ?5, ?6, ?7, ?8, ?9, 'draft', ?10)
        "#,
    )
    .bind(stable_uuid(
        "messaging-template",
        &[
            &command.subject.tenant_id.to_string(),
            &command.subject.organization_id.to_string(),
            &command.template_code,
            &command.idempotency_key,
        ],
    ))
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(&command.template_code)
    .bind(&command.scene_code)
    .bind(&command.channel)
    .bind(&command.delivery_purpose)
    .bind(&command.category)
    .bind(&command.template_name)
    .bind(template_id)
    .execute(pool)
    .await
    .map_err(|error| write_error("failed to create messaging template", error))?;
    let content_hash = stable_uuid("messaging-template-content", &[&command.body_template]);
    let version_id = next_claw_runtime_id("messaging_template_version")?;
    sqlx::query(
        r#"
        INSERT INTO messaging_template_version
            (uuid, tenant_id, organization_id, status, template_id, version_no, subject_template,
             text_template, html_template, variable_schema, content_hash, id)
        VALUES
            (?1, ?2, ?3, 1, ?4, 1, ?5, ?6, ?7, ?8, ?9, ?10)
        "#,
    )
    .bind(stable_uuid(
        "messaging-template-version",
        &[
            &command.subject.tenant_id.to_string(),
            &template_id.to_string(),
            "1",
        ],
    ))
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(template_id)
    .bind(command.subject_template.as_deref())
    .bind(if command.content_format.as_deref() == Some("html") {
        None
    } else {
        Some(command.body_template.as_str())
    })
    .bind(if command.content_format.as_deref() == Some("html") {
        Some(command.body_template.as_str())
    } else {
        None
    })
    .bind(json_text(&command.variable_schema))
    .bind(&content_hash)
    .bind(version_id)
    .execute(pool)
    .await
    .map_err(|error| write_error("failed to create messaging template version", error))?;
    sqlx::query(
        r#"
        INSERT INTO messaging_template_variant
            (uuid, tenant_id, organization_id, status, template_version_id, channel, locale, content_format, body_template, id)
        VALUES
            (?1, ?2, ?3, 1, ?4, ?5, ?6, ?7, ?8, ?9)
        "#,
    )
    .bind(stable_uuid(
        "messaging-template-variant",
        &[
            &command.subject.tenant_id.to_string(),
            &version_id.to_string(),
            command.locale.as_deref().unwrap_or("default"),
        ],
    ))
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(version_id)
    .bind(&command.channel)
    .bind(command.locale.as_deref().unwrap_or("default"))
    .bind(command.content_format.as_deref().unwrap_or("text"))
    .bind(&command.body_template)
    .bind(next_claw_runtime_id("messaging_template_variant")?)
    .execute(pool)
    .await
    .map_err(|error| write_error("failed to create messaging template variant", error))?;
    sqlx::query("UPDATE messaging_template SET current_version_id = ?1 WHERE id = ?2")
        .bind(version_id)
        .bind(template_id)
        .execute(pool)
        .await
        .map_err(store_error)?;
    insert_audit_if_absent(
        pool,
        command.subject,
        &command.request_id,
        "messaging.template.create",
        MESSAGING_AUDIT_TARGET_TEMPLATE,
        template_id,
        None,
    )
    .await?;
    Ok(mutation(template_id, "draft"))
}

async fn publish_template_version(
    pool: &SqlitePool,
    command: PublishMessagingTemplateVersionCommand,
) -> DomainResult<AdminMessagingMutationItem> {
    let template_id = parse_required_id(&command.template_id, "templateId")?;
    let version_id = parse_required_id(&command.version_id, "versionId")?;
    let result = sqlx::query(
        r#"
        UPDATE messaging_template_version
        SET review_status = 'published', published_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE tenant_id = ?1
          AND organization_id = ?2
          AND id = ?3
          AND template_id = ?4
          AND deleted_at IS NULL
        "#,
    )
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(version_id)
    .bind(template_id)
    .execute(pool)
    .await
    .map_err(store_error)?;
    if result.rows_affected() == 0 {
        return Err(DomainError::not_found(
            "messaging template version was not found",
        ));
    }
    sqlx::query(
        r#"
        UPDATE messaging_template
        SET current_version_id = ?1, publish_status = 'published', updated_at = CURRENT_TIMESTAMP
        WHERE tenant_id = ?2
          AND organization_id = ?3
          AND id = ?4
          AND deleted_at IS NULL
        "#,
    )
    .bind(version_id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(template_id)
    .execute(pool)
    .await
    .map_err(store_error)?;
    insert_audit_if_absent(
        pool,
        command.subject,
        &command.request_id,
        "messaging.template_version.publish",
        MESSAGING_AUDIT_TARGET_TEMPLATE_VERSION,
        version_id,
        None,
    )
    .await?;
    Ok(mutation(version_id, "published"))
}

async fn list_route_rules(
    pool: &SqlitePool,
    query: ListAdminMessagingRecordsQuery,
) -> DomainResult<AdminMessagingCollection> {
    let rows = sqlx::query(&format!(
        r#"
        SELECT
            CAST(r.id AS TEXT) AS id,
            r.rule_code AS code,
            r.rule_code AS ruleCode,
            r.scene_code AS sceneCode,
            r.channel AS channel,
            r.delivery_purpose AS deliveryPurpose,
            r.country_code AS countryCode,
            r.locale AS locale,
            r.user_segment AS userSegment,
            r.priority AS priority,
            {status_label} AS status,
            CAST(r.updated_at AS TEXT) AS updatedAt,
            CAST(COUNT(*) OVER() AS INTEGER) AS total
        FROM messaging_route_rule r
        WHERE r.tenant_id = ?1
          AND r.organization_id = ?2
          AND r.deleted_at IS NULL
          AND (?3 IS NULL OR {status_label} = ?3)
          AND (?4 IS NULL OR r.channel = ?4)
          AND (?5 IS NULL OR r.scene_code = ?5)
          AND (?6 IS NULL OR lower(r.rule_code) LIKE ?6)
        ORDER BY r.priority ASC, r.updated_at DESC, r.id DESC
        LIMIT ?7 OFFSET ?8
        "#,
        status_label = status_label_sql("r.status")
    ))
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.status.as_deref())
    .bind(query.channel.as_deref())
    .bind(query.scene_code.as_deref())
    .bind(like_filter(query.q.as_deref()))
    .bind(query.page_size)
    .bind(query.offset)
    .fetch_all(pool)
    .await
    .map_err(store_error)?;

    collection_from_rows(rows, query, ROUTE_RULE_FIELDS)
}

async fn create_route_rule(
    pool: &SqlitePool,
    command: CreateMessagingRouteRuleCommand,
) -> DomainResult<AdminMessagingMutationItem> {
    if let Some(id) = existing_route_rule_id(pool, command.subject, &command.rule_code).await? {
        return Ok(mutation(id, "active"));
    }
    let targets = validate_route_rule_targets(pool, &command).await?;
    let rule_id = next_claw_runtime_id("messaging_route_rule")?;
    sqlx::query(
        r#"
        INSERT INTO messaging_route_rule
            (uuid, tenant_id, organization_id, status, rule_code, scene_code, channel, delivery_purpose, country_code,
             locale, user_segment, priority, failover_policy, id)
        VALUES
            (?1, ?2, ?3, 1, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)
        "#,
    )
    .bind(stable_uuid(
        "messaging-route-rule",
        &[
            &command.subject.tenant_id.to_string(),
            &command.subject.organization_id.to_string(),
            &command.rule_code,
            &command.idempotency_key,
        ],
    ))
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(&command.rule_code)
    .bind(&command.scene_code)
    .bind(&command.channel)
    .bind(&command.delivery_purpose)
    .bind(command.country_code.as_deref().unwrap_or("*"))
    .bind(command.locale.as_deref().unwrap_or("*"))
    .bind(command.user_segment.as_deref().unwrap_or("*"))
    .bind(command.priority.unwrap_or(100))
    .bind(json_text(&command.failover_policy))
    .bind(rule_id)
    .execute(pool)
    .await
    .map_err(|error| write_error("failed to create messaging route rule", error))?;
    for target in &targets {
        sqlx::query(
            r#"
            INSERT INTO messaging_route_rule_target
                (uuid, tenant_id, organization_id, status, route_rule_id, provider_account_id,
                 supplier_code, sender_identity_id, template_binding_id, target_order, weight, id)
            VALUES
                (?1, ?2, ?3, 1, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
            "#,
        )
        .bind(stable_uuid(
            "messaging-route-target",
            &[
                &command.subject.tenant_id.to_string(),
                &rule_id.to_string(),
                &target.target_order.to_string(),
            ],
        ))
        .bind(command.subject.tenant_id)
        .bind(command.subject.organization_id)
        .bind(rule_id)
        .bind(target.provider_account_id)
        .bind(&target.supplier_code)
        .bind(target.sender_identity_id)
        .bind(target.template_binding_id)
        .bind(target.target_order)
        .bind(target.weight)
        .bind(next_claw_runtime_id("messaging_route_rule_target")?)
        .execute(pool)
        .await
        .map_err(|error| write_error("failed to create messaging route rule target", error))?;
    }
    insert_audit_if_absent(
        pool,
        command.subject,
        &command.request_id,
        "messaging.route_rule.create",
        MESSAGING_AUDIT_TARGET_ROUTE_RULE,
        rule_id,
        None,
    )
    .await?;
    Ok(mutation(rule_id, "active"))
}

async fn list_send_requests(
    pool: &SqlitePool,
    query: ListAdminMessagingRecordsQuery,
) -> DomainResult<AdminMessagingCollection> {
    let rows = sqlx::query(
        r#"
        SELECT
            CAST(r.id AS TEXT) AS id,
            r.request_no AS code,
            r.request_no AS requestNo,
            r.scene_code AS sceneCode,
            r.channel AS channel,
            r.target_masked AS targetMasked,
            r.delivery_status AS status,
            r.delivery_status AS deliveryStatus,
            COALESCE(a.supplier_code, '') AS providerCode,
            CAST(r.created_at AS TEXT) AS createdAt,
            CAST(r.created_at AS TEXT) AS failedAt,
            CAST(r.created_at AS TEXT) AS updatedAt,
            CAST(COUNT(*) OVER() AS INTEGER) AS total
        FROM messaging_send_request r
        LEFT JOIN messaging_send_attempt a
          ON a.tenant_id = r.tenant_id
         AND a.organization_id = r.organization_id
         AND a.send_request_id = r.id
         AND a.attempt_no = 1
        WHERE r.tenant_id = ?1
          AND r.organization_id = ?2
          AND (?3 IS NULL OR r.delivery_status = ?3)
          AND (?4 IS NULL OR r.channel = ?4)
          AND (?5 IS NULL OR r.scene_code = ?5)
          AND (?6 IS NULL OR a.supplier_code = ?6)
          AND (?7 IS NULL OR r.target_hash = ?7)
        ORDER BY r.created_at DESC, r.id DESC
        LIMIT ?8 OFFSET ?9
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.status.as_deref())
    .bind(query.channel.as_deref())
    .bind(query.scene_code.as_deref())
    .bind(query.supplier_code.as_deref())
    .bind(query.target_hash.as_deref())
    .bind(query.page_size)
    .bind(query.offset)
    .fetch_all(pool)
    .await
    .map_err(store_error)?;

    collection_from_rows(rows, query, SEND_REQUEST_FIELDS)
}

async fn simulate_route(
    pool: &SqlitePool,
    command: AdminMessagingRouteSimulationCommand,
) -> DomainResult<AdminMessagingRouteSimulationItem> {
    let route = load_matching_route_rule(
        pool,
        command.subject,
        &command.scene_code,
        &command.channel,
        &command.delivery_purpose,
        command.country_code.as_deref(),
        command.locale.as_deref(),
        command.user_segment.as_deref(),
    )
    .await?;
    let Some(route) = route else {
        return Ok(AdminMessagingRouteSimulationItem {
            matched: false,
            route_rule_id: None,
            targets: Vec::new(),
        });
    };
    let targets = load_route_targets(pool, command.subject, route.id).await?;
    insert_audit_if_absent(
        pool,
        command.subject,
        &command.request_id,
        "messaging.route.simulate",
        MESSAGING_AUDIT_TARGET_ROUTE_RULE,
        route.id,
        None,
    )
    .await?;
    Ok(AdminMessagingRouteSimulationItem {
        matched: true,
        route_rule_id: Some(route.id.to_string()),
        targets,
    })
}

async fn test_send(
    pool: &SqlitePool,
    command: AdminMessagingTestSendCommand,
) -> DomainResult<AdminMessagingTestSendItem> {
    send_template_like(
        pool,
        command.subject,
        &command.scene_code,
        &command.channel,
        &command.delivery_purpose,
        &command.template_code,
        command.country_code.as_deref(),
        command.locale.as_deref(),
        command.user_segment.as_deref(),
        &command.target_masked,
        &command.target_hash,
        command.dry_run,
        &command.variables,
        &command.idempotency_key,
        &command.request_id,
        "messaging.test_send.create",
    )
    .await
}

async fn send_template(
    pool: &SqlitePool,
    command: AdminMessagingTemplateSendCommand,
) -> DomainResult<AdminMessagingTestSendItem> {
    send_template_like(
        pool,
        command.subject,
        &command.scene_code,
        &command.channel,
        &command.delivery_purpose,
        &command.template_code,
        command.country_code.as_deref(),
        command.locale.as_deref(),
        command.user_segment.as_deref(),
        &command.target_masked,
        &command.target_hash,
        command.dry_run,
        &command.variables,
        &command.idempotency_key,
        &command.request_id,
        "messaging.template_send.create",
    )
    .await
}

async fn send_template_like(
    pool: &SqlitePool,
    subject: crate::ports::AdminMessagingSubject,
    scene_code: &str,
    channel: &str,
    delivery_purpose: &str,
    template_code: &str,
    country_code: Option<&str>,
    locale: Option<&str>,
    user_segment: Option<&str>,
    target_masked: &str,
    target_hash: &str,
    dry_run: Option<bool>,
    variables: &serde_json::Value,
    idempotency_key: &str,
    request_id: &str,
    audit_action: &str,
) -> DomainResult<AdminMessagingTestSendItem> {
    if let Some(row) = sqlx::query(
        r#"
        SELECT r.request_no,
               r.delivery_status,
               COALESCE(a.supplier_code, pa.supplier_code, '') AS supplier_code
        FROM messaging_send_request r
        LEFT JOIN messaging_send_attempt a
          ON a.tenant_id = r.tenant_id
         AND a.organization_id = r.organization_id
         AND a.send_request_id = r.id
         AND a.attempt_no = 1
        LEFT JOIN integration_provider_account pa
          ON pa.tenant_id = r.tenant_id
         AND pa.organization_id = r.organization_id
         AND pa.id = r.resolved_provider_account_id
         AND pa.deleted_at IS NULL
        WHERE r.tenant_id = ?1
          AND r.organization_id = ?2
          AND r.idempotency_key = ?3
        LIMIT 1
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(idempotency_key)
    .fetch_optional(pool)
    .await
    .map_err(store_error)?
    {
        return Ok(AdminMessagingTestSendItem {
            request_id: string_cell(&row, "request_no")?,
            delivery_status: string_cell(&row, "delivery_status")?,
            supplier_code: non_empty_string_cell(&row, "supplier_code")?,
        });
    }

    let route = load_matching_route_rule(
        pool,
        subject,
        scene_code,
        channel,
        delivery_purpose,
        country_code,
        locale,
        user_segment,
    )
    .await?;
    let target = match route.as_ref() {
        Some(route) => load_first_route_target(pool, subject, route.id).await?,
        None => None,
    };
    let template = load_template_selection(
        pool,
        subject,
        scene_code,
        channel,
        delivery_purpose,
        template_code,
        locale,
    )
    .await?;
    validate_template_variables(&template.variable_schema, variables)?;
    let request_no = stable_uuid(
        "message-request",
        &[
            &subject.tenant_id.to_string(),
            &subject.organization_id.to_string(),
            idempotency_key,
        ],
    );
    let payload_hash = stable_uuid("message-payload", &[target_hash, scene_code, template_code]);
    let suppression = load_active_suppression(pool, subject, channel, target_hash).await?;
    let is_dry_run = dry_run.unwrap_or(false);
    let rate_limited = if target.is_some() && suppression.is_none() {
        verification_send_limit_reached(
            pool,
            subject,
            scene_code,
            channel,
            delivery_purpose,
            target_hash,
        )
        .await?
    } else {
        false
    };
    let delivery_status = if target.is_none() {
        "route_unmatched"
    } else if suppression.is_some() {
        "suppressed"
    } else if rate_limited {
        "rate_limited"
    } else if is_dry_run {
        "dry_run"
    } else {
        "queued"
    };
    let variable_keys = template_variable_keys(variables);
    let send_request_id = next_claw_runtime_id("messaging_send_request")?;
    sqlx::query(
        r#"
        INSERT INTO messaging_send_request
            (uuid, tenant_id, organization_id, request_id, payload_hash, request_no, idempotency_key,
             scene_code, channel, delivery_purpose, target_type, target_hash, target_masked,
             template_version_id, template_variant_id, resolved_route_rule_id, resolved_provider_account_id, resolved_sender_identity_id, render_hash,
             request_payload_redacted, dry_run, delivery_status, id)
        VALUES
            (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23)
        "#,
    )
    .bind(stable_uuid("message-request-row", &[&request_no]))
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(request_id)
    .bind(&payload_hash)
    .bind(&request_no)
    .bind(idempotency_key)
    .bind(scene_code)
    .bind(channel)
    .bind(delivery_purpose)
    .bind(target_type(channel))
    .bind(target_hash)
    .bind(target_masked)
    .bind(template.version_id)
    .bind(template.variant_id)
    .bind(route.as_ref().map(|route| route.id))
    .bind(target.as_ref().map(|target| target.provider_account_id))
    .bind(target.as_ref().and_then(|target| target.sender_identity_id))
    .bind(stable_uuid("message-render", &[&payload_hash]))
    .bind(json_text(&serde_json::json!({
        "sceneCode": scene_code,
        "channel": channel,
        "deliveryPurpose": delivery_purpose,
        "templateCode": template_code,
        "variableKeys": variable_keys.clone(),
        "subjectTemplate": template.subject_template,
        "bodyTemplate": template.body_template,
        "deliveryStatus": delivery_status,
        "suppressionReasonCode": suppression.as_ref().map(|item| item.reason_code.as_str())
    })))
    .bind(is_dry_run)
    .bind(delivery_status)
    .bind(send_request_id)
    .execute(pool)
    .await
    .map_err(|error| write_error("failed to create messaging test send request", error))?;
    let supplier_code = target.as_ref().map(|target| target.supplier_code.clone());
    let mut send_attempt_id = None;
    if let (Some(target), "queued") = (target.as_ref(), delivery_status) {
        let attempt_id = next_claw_runtime_id("messaging_send_attempt")?;
        sqlx::query(
            r#"
            INSERT INTO messaging_send_attempt
                (uuid, tenant_id, organization_id, request_id, payload_hash, send_request_id, attempt_no,
                 supplier_code, provider_account_id, provider_status, attempted_at, id)
            VALUES
                (?1, ?2, ?3, ?4, ?5, ?6, 1, ?7, ?8, 'queued', CURRENT_TIMESTAMP, ?9)
            "#,
        )
        .bind(stable_uuid("message-attempt", &[&send_request_id.to_string(), "1"]))
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(request_id)
        .bind(&payload_hash)
        .bind(send_request_id)
        .bind(&target.supplier_code)
        .bind(target.provider_account_id)
        .bind(attempt_id)
        .execute(pool)
        .await
        .map_err(|error| write_error("failed to create messaging test send attempt", error))?;
        send_attempt_id = Some(attempt_id);
    }
    let event_supplier_code = supplier_code.as_deref().unwrap_or("unresolved");
    insert_delivery_event(
        pool,
        subject,
        request_id,
        &payload_hash,
        send_request_id,
        send_attempt_id,
        event_supplier_code,
        delivery_status,
        &serde_json::json!({
            "sceneCode": scene_code,
            "channel": channel,
            "deliveryPurpose": delivery_purpose,
            "templateCode": template_code,
            "variableKeys": variable_keys,
            "targetMasked": target_masked,
            "deliveryStatus": delivery_status,
            "reasonCode": suppression.as_ref().map(|item| item.reason_code.as_str())
        }),
    )
    .await?;
    if !is_dry_run {
        if delivery_status == "queued" {
            increment_rate_limit_bucket(
                pool,
                subject,
                scene_code,
                channel,
                target_hash,
                RateLimitCounter::Send,
            )
            .await?;
        } else {
            increment_rate_limit_bucket(
                pool,
                subject,
                scene_code,
                channel,
                target_hash,
                RateLimitCounter::Reject,
            )
            .await?;
        }
    }
    insert_audit_if_absent(
        pool,
        subject,
        request_id,
        audit_action,
        MESSAGING_AUDIT_TARGET_SEND_REQUEST,
        send_request_id,
        None,
    )
    .await?;
    Ok(AdminMessagingTestSendItem {
        request_id: request_no,
        delivery_status: delivery_status.to_owned(),
        supplier_code,
    })
}

async fn list_suppressions(
    pool: &SqlitePool,
    query: ListAdminMessagingRecordsQuery,
) -> DomainResult<AdminMessagingCollection> {
    let rows = sqlx::query(&format!(
        r#"
        SELECT
            CAST(s.id AS TEXT) AS id,
            s.reason_code AS code,
            s.reason_code AS reasonCode,
            s.channel AS channel,
            s.target_masked AS name,
            s.target_masked AS targetMasked,
            s.target_hash AS targetHash,
            s.scope_type AS scopeType,
            CAST(s.starts_at AS TEXT) AS startsAt,
            CAST(s.ends_at AS TEXT) AS endsAt,
            s.source AS source,
            {status_label} AS status,
            CAST(s.updated_at AS TEXT) AS updatedAt,
            CAST(COUNT(*) OVER() AS INTEGER) AS total
        FROM messaging_suppression s
        WHERE s.tenant_id = ?1
          AND s.organization_id = ?2
          AND s.deleted_at IS NULL
          AND (?3 IS NULL OR {status_label} = ?3)
          AND (?4 IS NULL OR s.channel = ?4)
          AND (?5 IS NULL OR s.target_hash = ?5)
          AND (?6 IS NULL OR s.reason_code = ?6)
        ORDER BY s.updated_at DESC, s.id DESC
        LIMIT ?7 OFFSET ?8
        "#,
        status_label = status_label_sql("s.status")
    ))
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.status.as_deref())
    .bind(query.channel.as_deref())
    .bind(query.target_hash.as_deref())
    .bind(query.reason_code.as_deref())
    .bind(query.page_size)
    .bind(query.offset)
    .fetch_all(pool)
    .await
    .map_err(store_error)?;

    collection_from_rows(rows, query, SUPPRESSION_FIELDS)
}

async fn create_suppression(
    pool: &SqlitePool,
    command: CreateMessagingSuppressionCommand,
) -> DomainResult<AdminMessagingMutationItem> {
    if let Some(id) = existing_suppression_id(pool, &command).await? {
        return Ok(mutation(id, "active"));
    }

    let suppression_id = next_claw_runtime_id("messaging_suppression")?;
    sqlx::query(
        r#"
        INSERT INTO messaging_suppression
            (uuid, tenant_id, organization_id, status, channel, target_hash, target_masked,
             reason_code, scope_type, scope_id, starts_at, ends_at, source, note, id)
        VALUES
            (?1, ?2, ?3, 1, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)
        "#,
    )
    .bind(stable_uuid(
        "messaging-suppression",
        &[
            &command.subject.tenant_id.to_string(),
            &command.subject.organization_id.to_string(),
            &command.channel,
            &command.target_hash,
            &command.scope_type,
            &command.scope_id,
            &command.reason_code,
        ],
    ))
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(&command.channel)
    .bind(&command.target_hash)
    .bind(&command.target_masked)
    .bind(&command.reason_code)
    .bind(&command.scope_type)
    .bind(&command.scope_id)
    .bind(&command.starts_at)
    .bind(command.ends_at.as_deref())
    .bind(&command.source)
    .bind(command.note.as_deref())
    .bind(suppression_id)
    .execute(pool)
    .await
    .map_err(|error| write_error("failed to create messaging suppression", error))?;

    insert_audit_if_absent(
        pool,
        command.subject,
        &command.request_id,
        "messaging.suppression.create",
        MESSAGING_AUDIT_TARGET_SUPPRESSION,
        suppression_id,
        None,
    )
    .await?;
    Ok(mutation(suppression_id, "active"))
}

async fn list_rate_limit_buckets(
    pool: &SqlitePool,
    query: ListAdminMessagingRecordsQuery,
) -> DomainResult<AdminMessagingCollection> {
    let rows = sqlx::query(&format!(
        r#"
        SELECT
            CAST(b.id AS TEXT) AS id,
            b.scene_code AS code,
            b.scene_code AS sceneCode,
            b.channel AS channel,
            b.target_hash AS targetHash,
            b.ip_hash AS ipHash,
            b.device_hash AS deviceHash,
            CAST(b.window_start AS TEXT) AS windowStart,
            b.window_seconds AS windowSeconds,
            b.send_count AS sendCount,
            b.verify_count AS verifyCount,
            b.reject_count AS rejectCount,
            {status_label} AS status,
            CAST(b.updated_at AS TEXT) AS updatedAt,
            CAST(COUNT(*) OVER() AS INTEGER) AS total
        FROM messaging_rate_limit_bucket b
        WHERE b.tenant_id = ?1
          AND b.organization_id = ?2
          AND b.deleted_at IS NULL
          AND (?3 IS NULL OR b.scene_code = ?3)
          AND (?4 IS NULL OR b.channel = ?4)
          AND (?5 IS NULL OR b.target_hash = ?5)
          AND (?6 IS NULL OR b.ip_hash = ?6)
          AND (?7 IS NULL OR b.device_hash = ?7)
        ORDER BY b.window_start DESC, b.id DESC
        LIMIT ?8 OFFSET ?9
        "#,
        status_label = status_label_sql("b.status")
    ))
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.scene_code.as_deref())
    .bind(query.channel.as_deref())
    .bind(query.target_hash.as_deref())
    .bind(query.ip_hash.as_deref())
    .bind(query.device_hash.as_deref())
    .bind(query.page_size)
    .bind(query.offset)
    .fetch_all(pool)
    .await
    .map_err(store_error)?;

    collection_from_rows(rows, query, RATE_LIMIT_FIELDS)
}

async fn list_verification_policies(
    pool: &SqlitePool,
    query: ListAdminMessagingRecordsQuery,
) -> DomainResult<AdminMessagingCollection> {
    let rows = sqlx::query(&format!(
        r#"
        SELECT
            CAST(p.id AS TEXT) AS id,
            p.scene_code AS code,
            p.scene_name AS name,
            p.scene_name AS sceneName,
            p.scene_code AS sceneCode,
            p.default_channel AS channel,
            p.default_channel AS defaultChannel,
            p.template_code AS templateCode,
            p.code_length AS codeLength,
            p.ttl_seconds AS ttlSeconds,
            p.max_verify_attempts AS maxVerifyAttempts,
            {status_label} AS status,
            CAST(p.updated_at AS TEXT) AS updatedAt,
            CAST(COUNT(*) OVER() AS INTEGER) AS total
        FROM iam_verification_scene_policy p
        WHERE p.tenant_id = ?1
          AND p.organization_id = ?2
          AND p.deleted_at IS NULL
          AND (?3 IS NULL OR {status_label} = ?3)
          AND (?4 IS NULL OR p.default_channel = ?4)
          AND (?5 IS NULL OR p.scene_code = ?5)
          AND (?6 IS NULL OR lower(p.scene_code) LIKE ?6 OR lower(COALESCE(p.scene_name, '')) LIKE ?6)
        ORDER BY p.updated_at DESC, p.id DESC
        LIMIT ?7 OFFSET ?8
        "#,
        status_label = status_label_sql("p.status")
    ))
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.status.as_deref())
    .bind(query.channel.as_deref())
    .bind(query.scene_code.as_deref())
    .bind(like_filter(query.q.as_deref()))
    .bind(query.page_size)
    .bind(query.offset)
    .fetch_all(pool)
    .await
    .map_err(store_error)?;

    collection_from_rows(rows, query, VERIFICATION_POLICY_FIELDS)
}

async fn update_verification_policy(
    pool: &SqlitePool,
    command: UpdateVerificationPolicyCommand,
) -> DomainResult<AdminMessagingMutationItem> {
    let policy_lookup = load_policy_lookup(pool, command.subject, &command.policy_id).await?;
    let Some((policy_id, scene_code)) = policy_lookup else {
        return Err(DomainError::not_found(
            "verification policy was not found for messaging management",
        ));
    };
    sqlx::query(
        r#"
        UPDATE iam_verification_scene_policy
        SET allowed_channels = ?1,
            default_channel = ?2,
            code_length = ?3,
            ttl_seconds = ?4,
            resend_interval_seconds = COALESCE(?5, resend_interval_seconds),
            max_send_per_hour = COALESCE(?6, max_send_per_hour),
            max_verify_attempts = ?7,
            template_code = ?8,
            risk_policy = ?9,
            updated_at = CURRENT_TIMESTAMP
        WHERE tenant_id = ?10
          AND organization_id = ?11
          AND id = ?12
          AND deleted_at IS NULL
        "#,
    )
    .bind(json_text(&serde_json::json!(command.allowed_channels)))
    .bind(command.default_channel.as_deref())
    .bind(command.code_length)
    .bind(command.ttl_seconds)
    .bind(command.resend_interval_seconds)
    .bind(command.max_send_per_hour)
    .bind(command.max_verify_attempts)
    .bind(&command.template_code)
    .bind(json_text(&command.risk_policy))
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(policy_id)
    .execute(pool)
    .await
    .map_err(store_error)?;
    insert_audit_if_absent(
        pool,
        command.subject,
        &command.request_id,
        "messaging.verification_policy.update",
        MESSAGING_AUDIT_TARGET_VERIFICATION_POLICY,
        policy_id,
        None,
    )
    .await?;
    Ok(AdminMessagingMutationItem {
        id: scene_code,
        status: "active".to_owned(),
    })
}

#[derive(Debug, Clone)]
struct RouteRuleRow {
    id: i64,
}

#[derive(Debug, Clone)]
struct RouteTargetRow {
    provider_account_id: i64,
    supplier_code: String,
    sender_identity_id: Option<i64>,
}

#[derive(Debug, Clone)]
struct ValidatedRouteRuleTarget {
    provider_account_id: i64,
    supplier_code: String,
    sender_identity_id: Option<i64>,
    template_binding_id: Option<i64>,
    target_order: i64,
    weight: i64,
}

#[derive(Debug, Clone)]
struct TemplateSelectionRow {
    version_id: i64,
    variant_id: i64,
    subject_template: Option<String>,
    body_template: String,
    variable_schema: serde_json::Value,
}

#[derive(Debug, Clone)]
struct SuppressionRow {
    reason_code: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum RateLimitCounter {
    Send,
    Reject,
}

async fn load_matching_route_rule(
    pool: &SqlitePool,
    subject: crate::ports::AdminMessagingSubject,
    scene_code: &str,
    channel: &str,
    delivery_purpose: &str,
    country_code: Option<&str>,
    locale: Option<&str>,
    user_segment: Option<&str>,
) -> DomainResult<Option<RouteRuleRow>> {
    sqlx::query(
        r#"
        SELECT id
        FROM messaging_route_rule
        WHERE tenant_id = ?1
          AND organization_id = ?2
          AND scene_code = ?3
          AND channel = ?4
          AND delivery_purpose = ?5
          AND status = 1
          AND deleted_at IS NULL
          AND country_code IN (?6, '*')
          AND locale IN (?7, '*')
          AND user_segment IN (?8, '*')
        ORDER BY priority ASC, id ASC
        LIMIT 1
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(scene_code)
    .bind(channel)
    .bind(delivery_purpose)
    .bind(country_code.unwrap_or("*"))
    .bind(locale.unwrap_or("*"))
    .bind(user_segment.unwrap_or("*"))
    .fetch_optional(pool)
    .await
    .map_err(store_error)?
    .map(|row| {
        Ok(RouteRuleRow {
            id: integer_cell(&row, "id")?,
        })
    })
    .transpose()
}

async fn load_route_targets(
    pool: &SqlitePool,
    subject: crate::ports::AdminMessagingSubject,
    route_rule_id: i64,
) -> DomainResult<Vec<AdminMessagingJsonRecord>> {
    let rows = sqlx::query(
        r#"
        SELECT
            CAST(id AS TEXT) AS id,
            CAST(provider_account_id AS TEXT) AS providerAccountId,
            supplier_code AS providerCode,
            CAST(sender_identity_id AS TEXT) AS senderIdentityId,
            CAST(template_binding_id AS TEXT) AS templateBindingId,
            target_order AS targetOrder,
            weight AS weight,
            'active' AS status
        FROM messaging_route_rule_target
        WHERE tenant_id = ?1
          AND organization_id = ?2
          AND route_rule_id = ?3
          AND status = 1
          AND deleted_at IS NULL
        ORDER BY target_order ASC, id ASC
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(route_rule_id)
    .fetch_all(pool)
    .await
    .map_err(store_error)?;
    rows.into_iter()
        .map(|row| row_to_record(&row, ROUTE_TARGET_FIELDS))
        .collect()
}

async fn load_first_route_target(
    pool: &SqlitePool,
    subject: crate::ports::AdminMessagingSubject,
    route_rule_id: i64,
) -> DomainResult<Option<RouteTargetRow>> {
    sqlx::query(
        r#"
        SELECT provider_account_id, supplier_code, sender_identity_id
        FROM messaging_route_rule_target
        WHERE tenant_id = ?1
          AND organization_id = ?2
          AND route_rule_id = ?3
          AND status = 1
          AND deleted_at IS NULL
        ORDER BY target_order ASC, id ASC
        LIMIT 1
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(route_rule_id)
    .fetch_optional(pool)
    .await
    .map_err(store_error)?
    .map(|row| {
        Ok(RouteTargetRow {
            provider_account_id: integer_cell(&row, "provider_account_id")?,
            supplier_code: string_cell(&row, "supplier_code")?,
            sender_identity_id: optional_integer_cell(&row, "sender_identity_id")?,
        })
    })
    .transpose()
}

async fn load_template_selection(
    pool: &SqlitePool,
    subject: crate::ports::AdminMessagingSubject,
    scene_code: &str,
    channel: &str,
    delivery_purpose: &str,
    template_code: &str,
    locale: Option<&str>,
) -> DomainResult<TemplateSelectionRow> {
    sqlx::query(
        r#"
        SELECT
            v.id AS version_id,
            x.id AS variant_id,
            v.subject_template AS subject_template,
            x.body_template AS body_template,
            v.variable_schema AS variable_schema
        FROM messaging_template t
        JOIN messaging_template_version v
          ON v.tenant_id = t.tenant_id
         AND v.organization_id = t.organization_id
         AND v.template_id = t.id
         AND v.id = t.current_version_id
         AND v.review_status = 'published'
         AND v.status = 1
         AND v.deleted_at IS NULL
        JOIN messaging_template_variant x
          ON x.tenant_id = t.tenant_id
         AND x.organization_id = t.organization_id
         AND x.template_version_id = v.id
         AND x.channel = t.channel
         AND x.status = 1
         AND x.deleted_at IS NULL
         AND x.locale IN (?7, 'default')
        WHERE t.tenant_id = ?1
          AND t.organization_id = ?2
          AND t.scene_code = ?3
          AND t.channel = ?4
          AND t.delivery_purpose = ?5
          AND t.template_code = ?6
          AND t.publish_status = 'published'
          AND t.status = 1
          AND t.deleted_at IS NULL
        ORDER BY CASE WHEN x.locale = ?7 THEN 0 ELSE 1 END, x.id ASC
        LIMIT 1
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(scene_code)
    .bind(channel)
    .bind(delivery_purpose)
    .bind(template_code)
    .bind(locale.unwrap_or("default"))
    .fetch_optional(pool)
    .await
    .map_err(store_error)?
    .map(|row| {
        Ok(TemplateSelectionRow {
            version_id: integer_cell(&row, "version_id")?,
            variant_id: integer_cell(&row, "variant_id")?,
            subject_template: non_empty_string_cell(&row, "subject_template")?,
            body_template: string_cell(&row, "body_template")?,
            variable_schema: json_cell(&row, "variable_schema")?,
        })
    })
    .transpose()?
    .ok_or_else(|| {
        DomainError::not_found(format!(
            "messaging template {template_code} is not published for {delivery_purpose}/{channel}/{scene_code}"
        ))
    })
}

async fn load_active_suppression(
    pool: &SqlitePool,
    subject: crate::ports::AdminMessagingSubject,
    channel: &str,
    target_hash: &str,
) -> DomainResult<Option<SuppressionRow>> {
    sqlx::query(
        r#"
        SELECT reason_code
        FROM messaging_suppression
        WHERE tenant_id = ?1
          AND organization_id = ?2
          AND channel = ?3
          AND target_hash = ?4
          AND status = 1
          AND deleted_at IS NULL
          AND datetime(starts_at) <= CURRENT_TIMESTAMP
          AND (ends_at IS NULL OR datetime(ends_at) > CURRENT_TIMESTAMP)
        ORDER BY starts_at DESC, id DESC
        LIMIT 1
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(channel)
    .bind(target_hash)
    .fetch_optional(pool)
    .await
    .map_err(store_error)?
    .map(|row| {
        Ok(SuppressionRow {
            reason_code: string_cell(&row, "reason_code")?,
        })
    })
    .transpose()
}

async fn verification_send_limit_reached(
    pool: &SqlitePool,
    subject: crate::ports::AdminMessagingSubject,
    scene_code: &str,
    channel: &str,
    delivery_purpose: &str,
    target_hash: &str,
) -> DomainResult<bool> {
    if delivery_purpose != "verification" {
        return Ok(false);
    }
    let max_send_per_hour = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT max_send_per_hour
        FROM iam_verification_scene_policy
        WHERE tenant_id = ?1
          AND organization_id = ?2
          AND scene_code = ?3
          AND status = 1
          AND deleted_at IS NULL
        LIMIT 1
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(scene_code)
    .fetch_optional(pool)
    .await
    .map_err(store_error)?;
    let Some(max_send_per_hour) = max_send_per_hour else {
        return Ok(false);
    };
    let send_count = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COALESCE(MAX(send_count), 0)
        FROM messaging_rate_limit_bucket
        WHERE tenant_id = ?1
          AND organization_id = ?2
          AND scene_code = ?3
          AND channel = ?4
          AND target_hash = ?5
          AND ip_hash = '*'
          AND device_hash = '*'
          AND window_start = strftime('%Y-%m-%d %H:00:00', 'now')
          AND window_seconds = 3600
          AND status = 1
          AND deleted_at IS NULL
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(scene_code)
    .bind(channel)
    .bind(target_hash)
    .fetch_one(pool)
    .await
    .map_err(store_error)?;
    Ok(send_count >= max_send_per_hour)
}

async fn increment_rate_limit_bucket(
    pool: &SqlitePool,
    subject: crate::ports::AdminMessagingSubject,
    scene_code: &str,
    channel: &str,
    target_hash: &str,
    counter: RateLimitCounter,
) -> DomainResult<()> {
    let send_delta = if counter == RateLimitCounter::Send {
        1
    } else {
        0
    };
    let reject_delta = if counter == RateLimitCounter::Reject {
        1
    } else {
        0
    };
    let update_result = sqlx::query(
        r#"
        UPDATE messaging_rate_limit_bucket
        SET send_count = send_count + ?1,
            reject_count = reject_count + ?2,
            last_event_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE tenant_id = ?3
          AND organization_id = ?4
          AND scene_code = ?5
          AND channel = ?6
          AND target_hash = ?7
          AND ip_hash = '*'
          AND device_hash = '*'
          AND window_start = strftime('%Y-%m-%d %H:00:00', 'now')
          AND window_seconds = 3600
          AND deleted_at IS NULL
        "#,
    )
    .bind(send_delta)
    .bind(reject_delta)
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(scene_code)
    .bind(channel)
    .bind(target_hash)
    .execute(pool)
    .await
    .map_err(|error| write_error("failed to update messaging rate-limit bucket", error))?;
    if update_result.rows_affected() > 0 {
        return Ok(());
    }
    sqlx::query(
        r#"
        INSERT INTO messaging_rate_limit_bucket
            (uuid, tenant_id, organization_id, status, scene_code, channel, target_hash,
             ip_hash, device_hash, window_start, window_seconds, send_count, verify_count,
             reject_count, last_event_at, id)
        VALUES
            (?1, ?2, ?3, 1, ?4, ?5, ?6, '*', '*',
             strftime('%Y-%m-%d %H:00:00', 'now'), 3600, ?7, 0, ?8, CURRENT_TIMESTAMP, ?9)
        "#,
    )
    .bind(stable_uuid(
        "messaging-rate-limit-bucket",
        &[
            &subject.tenant_id.to_string(),
            &subject.organization_id.to_string(),
            scene_code,
            channel,
            target_hash,
        ],
    ))
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(scene_code)
    .bind(channel)
    .bind(target_hash)
    .bind(send_delta)
    .bind(reject_delta)
    .bind(next_claw_runtime_id("messaging_rate_limit_bucket")?)
    .execute(pool)
    .await
    .map_err(|error| write_error("failed to create messaging rate-limit bucket", error))?;
    Ok(())
}

async fn insert_delivery_event(
    pool: &SqlitePool,
    subject: crate::ports::AdminMessagingSubject,
    request_id: &str,
    payload_hash: &str,
    send_request_id: i64,
    send_attempt_id: Option<i64>,
    supplier_code: &str,
    event_type: &str,
    payload_redacted: &serde_json::Value,
) -> DomainResult<()> {
    let provider_event_id = format!(
        "{}-{}",
        event_type,
        stable_uuid(
            "messaging-delivery-event",
            &[&send_request_id.to_string(), event_type]
        )
    );
    sqlx::query(
        r#"
        INSERT INTO messaging_delivery_event
            (uuid, tenant_id, organization_id, request_id, payload_hash, send_request_id,
             send_attempt_id, supplier_code, provider_event_id, provider_message_id,
             event_type, event_at, payload_redacted, id)
        VALUES
            (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, NULL, ?10, CURRENT_TIMESTAMP, ?11, ?12)
        "#,
    )
    .bind(stable_uuid(
        "messaging-delivery-event-row",
        &[&send_request_id.to_string(), event_type],
    ))
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(request_id)
    .bind(payload_hash)
    .bind(send_request_id)
    .bind(send_attempt_id)
    .bind(supplier_code)
    .bind(provider_event_id)
    .bind(event_type)
    .bind(json_text(payload_redacted))
    .bind(next_claw_runtime_id("messaging_delivery_event")?)
    .execute(pool)
    .await
    .map_err(|error| write_error("failed to create messaging delivery event", error))?;
    Ok(())
}

async fn existing_provider_account_id(
    pool: &SqlitePool,
    tenant_id: i64,
    organization_id: i64,
    supplier_code: &str,
    account_code: &str,
) -> DomainResult<Option<i64>> {
    sqlx::query_scalar(
        r#"
        SELECT id
        FROM integration_provider_account
        WHERE tenant_id = ?1
          AND organization_id = ?2
          AND supplier_code = ?3
          AND account_code = ?4
          AND deleted_at IS NULL
        LIMIT 1
        "#,
    )
    .bind(tenant_id)
    .bind(organization_id)
    .bind(supplier_code)
    .bind(account_code)
    .fetch_optional(pool)
    .await
    .map_err(store_error)
}

async fn existing_provider_capability_id(
    pool: &SqlitePool,
    subject: crate::ports::AdminMessagingSubject,
    provider_account_id: i64,
    channel: &str,
    delivery_purpose: &str,
) -> DomainResult<Option<i64>> {
    sqlx::query_scalar(
        r#"
        SELECT id
        FROM messaging_provider_capability
        WHERE tenant_id = ?1
          AND organization_id = ?2
          AND provider_account_id = ?3
          AND channel = ?4
          AND delivery_purpose = ?5
          AND deleted_at IS NULL
        LIMIT 1
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(provider_account_id)
    .bind(channel)
    .bind(delivery_purpose)
    .fetch_optional(pool)
    .await
    .map_err(store_error)
}

async fn existing_suppression_id(
    pool: &SqlitePool,
    command: &CreateMessagingSuppressionCommand,
) -> DomainResult<Option<i64>> {
    sqlx::query_scalar(
        r#"
        SELECT id
        FROM messaging_suppression
        WHERE tenant_id = ?1
          AND organization_id = ?2
          AND channel = ?3
          AND target_hash = ?4
          AND scope_type = ?5
          AND scope_id = ?6
          AND reason_code = ?7
          AND deleted_at IS NULL
        LIMIT 1
        "#,
    )
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(&command.channel)
    .bind(&command.target_hash)
    .bind(&command.scope_type)
    .bind(&command.scope_id)
    .bind(&command.reason_code)
    .fetch_optional(pool)
    .await
    .map_err(store_error)
}

async fn validate_route_rule_targets(
    pool: &SqlitePool,
    command: &CreateMessagingRouteRuleCommand,
) -> DomainResult<Vec<ValidatedRouteRuleTarget>> {
    let mut targets = Vec::with_capacity(command.targets.len());
    for target in &command.targets {
        if targets
            .iter()
            .any(|existing: &ValidatedRouteRuleTarget| existing.target_order == target.target_order)
        {
            return Err(DomainError::new(
                "invalid messaging targets.targetOrder: value must be unique",
            ));
        }
        let provider_account_id =
            parse_required_id(&target.provider_account_id, "targets.providerAccountId")?;
        ensure_provider_account_supports_delivery(
            pool,
            command.subject,
            provider_account_id,
            &command.delivery_purpose,
            &command.channel,
        )
        .await?;
        let supplier_code =
            load_provider_account_supplier_code(pool, command.subject, provider_account_id).await?;
        let sender_identity_id = optional_parsed_id(
            target.sender_identity_id.as_deref(),
            "targets.senderIdentityId",
        )?;
        ensure_sender_identity_matches_route_target(
            pool,
            command.subject,
            sender_identity_id,
            provider_account_id,
            &command.channel,
        )
        .await?;
        let template_binding_id = optional_parsed_id(
            target.template_binding_id.as_deref(),
            "targets.templateBindingId",
        )?;
        targets.push(ValidatedRouteRuleTarget {
            provider_account_id,
            supplier_code,
            sender_identity_id,
            template_binding_id,
            target_order: target.target_order,
            weight: target.weight.unwrap_or(100),
        });
    }
    Ok(targets)
}

async fn existing_sender_identity_id(
    pool: &SqlitePool,
    subject: crate::ports::AdminMessagingSubject,
    account_id: i64,
    identity_code: &str,
) -> DomainResult<Option<i64>> {
    sqlx::query_scalar(
        r#"
        SELECT id
        FROM messaging_sender_identity
        WHERE tenant_id = ?1
          AND organization_id = ?2
          AND provider_account_id = ?3
          AND identity_code = ?4
          AND deleted_at IS NULL
        LIMIT 1
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(account_id)
    .bind(identity_code)
    .fetch_optional(pool)
    .await
    .map_err(store_error)
}

async fn existing_template_id(
    pool: &SqlitePool,
    subject: crate::ports::AdminMessagingSubject,
    template_code: &str,
) -> DomainResult<Option<i64>> {
    sqlx::query_scalar(
        r#"
        SELECT id
        FROM messaging_template
        WHERE tenant_id = ?1
          AND organization_id = ?2
          AND template_code = ?3
          AND deleted_at IS NULL
        LIMIT 1
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(template_code)
    .fetch_optional(pool)
    .await
    .map_err(store_error)
}

async fn existing_route_rule_id(
    pool: &SqlitePool,
    subject: crate::ports::AdminMessagingSubject,
    rule_code: &str,
) -> DomainResult<Option<i64>> {
    sqlx::query_scalar(
        r#"
        SELECT id
        FROM messaging_route_rule
        WHERE tenant_id = ?1
          AND organization_id = ?2
          AND rule_code = ?3
          AND deleted_at IS NULL
        LIMIT 1
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(rule_code)
    .fetch_optional(pool)
    .await
    .map_err(store_error)
}

async fn load_provider_account_supplier_code(
    pool: &SqlitePool,
    subject: crate::ports::AdminMessagingSubject,
    account_id: i64,
) -> DomainResult<String> {
    sqlx::query_scalar(
        r#"
        SELECT supplier_code
        FROM integration_provider_account
        WHERE tenant_id = ?1
          AND organization_id = ?2
          AND id = ?3
          AND deleted_at IS NULL
        LIMIT 1
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(account_id)
    .fetch_optional(pool)
    .await
    .map_err(store_error)?
    .ok_or_else(|| DomainError::not_found("messaging provider account was not found"))
}

async fn ensure_provider_account_supports_delivery(
    pool: &SqlitePool,
    subject: crate::ports::AdminMessagingSubject,
    provider_account_id: i64,
    delivery_purpose: &str,
    channel: &str,
) -> DomainResult<()> {
    let is_supported: Option<i64> = sqlx::query_scalar(
        r#"
        SELECT 1
        FROM messaging_provider_capability
        WHERE tenant_id = ?1
          AND organization_id = ?2
          AND provider_account_id = ?3
          AND delivery_purpose = ?4
          AND channel = ?5
          AND status = 1
          AND deleted_at IS NULL
        LIMIT 1
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(provider_account_id)
    .bind(delivery_purpose)
    .bind(channel)
    .fetch_optional(pool)
    .await
    .map_err(store_error)?;

    if is_supported.is_none() {
        return Err(DomainError::conflict(format!(
            "messaging provider account {provider_account_id} does not support {delivery_purpose}/{channel}"
        )));
    }

    Ok(())
}

async fn ensure_provider_account_supports_channel(
    pool: &SqlitePool,
    subject: crate::ports::AdminMessagingSubject,
    provider_account_id: i64,
    channel: &str,
) -> DomainResult<()> {
    let is_supported: Option<i64> = sqlx::query_scalar(
        r#"
        SELECT 1
        FROM messaging_provider_capability
        WHERE tenant_id = ?1
          AND organization_id = ?2
          AND provider_account_id = ?3
          AND channel = ?4
          AND status = 1
          AND deleted_at IS NULL
        LIMIT 1
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(provider_account_id)
    .bind(channel)
    .fetch_optional(pool)
    .await
    .map_err(store_error)?;

    if is_supported.is_none() {
        return Err(DomainError::conflict(format!(
            "messaging provider account {provider_account_id} does not support channel {channel}"
        )));
    }

    Ok(())
}

async fn ensure_sender_identity_matches_route_target(
    pool: &SqlitePool,
    subject: crate::ports::AdminMessagingSubject,
    sender_identity_id: Option<i64>,
    provider_account_id: i64,
    channel: &str,
) -> DomainResult<()> {
    let Some(sender_identity_id) = sender_identity_id else {
        return Ok(());
    };

    let is_matching: Option<i64> = sqlx::query_scalar(
        r#"
        SELECT 1
        FROM messaging_sender_identity
        WHERE tenant_id = ?1
          AND organization_id = ?2
          AND id = ?3
          AND provider_account_id = ?4
          AND channel = ?5
          AND status = 1
          AND deleted_at IS NULL
        LIMIT 1
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(sender_identity_id)
    .bind(provider_account_id)
    .bind(channel)
    .fetch_optional(pool)
    .await
    .map_err(store_error)?;

    if is_matching.is_none() {
        return Err(DomainError::conflict(format!(
            "messaging sender identity {sender_identity_id} does not belong to provider account {provider_account_id} and channel {channel}"
        )));
    }

    Ok(())
}

async fn load_policy_lookup(
    pool: &SqlitePool,
    subject: crate::ports::AdminMessagingSubject,
    policy_id: &str,
) -> DomainResult<Option<(i64, String)>> {
    let parsed_id = policy_id.parse::<i64>().ok();
    sqlx::query(
        r#"
        SELECT id, scene_code
        FROM iam_verification_scene_policy
        WHERE tenant_id = ?1
          AND organization_id = ?2
          AND deleted_at IS NULL
          AND ((?3 IS NOT NULL AND id = ?3) OR scene_code = ?4)
        LIMIT 1
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(parsed_id)
    .bind(policy_id)
    .fetch_optional(pool)
    .await
    .map_err(store_error)?
    .map(|row| Ok((integer_cell(&row, "id")?, string_cell(&row, "scene_code")?)))
    .transpose()
}

async fn insert_audit_if_absent(
    pool: &SqlitePool,
    subject: crate::ports::AdminMessagingSubject,
    request_id: &str,
    action: &str,
    target_type: i32,
    target_id: i64,
    target_uuid: Option<&str>,
) -> DomainResult<()> {
    sqlx::query(
        r#"
        INSERT INTO ops_audit_log
            (uuid, tenant_id, organization_id, request_id, operator_id, operator_type, action, target_type, target_id, target_uuid, created_at, id)
        SELECT
            ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, CURRENT_TIMESTAMP, ?11
        WHERE NOT EXISTS (
            SELECT 1
            FROM ops_audit_log
            WHERE tenant_id = ?12
              AND organization_id = ?13
              AND request_id = ?14
              AND action = ?15
        )
        "#,
    )
    .bind(stable_uuid(
        "messaging-audit",
        &[
            &subject.tenant_id.to_string(),
            &subject.organization_id.to_string(),
            request_id,
            action,
        ],
    ))
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(request_id)
    .bind(subject.operator_id)
    .bind(subject.operator_type)
    .bind(action)
    .bind(target_type)
    .bind(target_id)
    .bind(target_uuid)
    .bind(next_claw_runtime_id("ops_audit_log")?)
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(request_id)
    .bind(action)
    .execute(pool)
    .await
    .map_err(|error| write_error("failed to write messaging audit log", error))?;
    Ok(())
}

const PROVIDER_ACCOUNT_FIELDS: &[Field] = &[
    Field::String("id"),
    Field::String("providerAccountId"),
    Field::String("capabilityId"),
    Field::String("code"),
    Field::String("accountCode"),
    Field::String("name"),
    Field::String("accountName"),
    Field::String("providerCode"),
    Field::String("channel"),
    Field::String("deliveryPurpose"),
    Field::String("status"),
    Field::String("healthStatus"),
    Field::String("updatedAt"),
];
const SENDER_IDENTITY_FIELDS: &[Field] = &[
    Field::String("id"),
    Field::String("code"),
    Field::String("identityCode"),
    Field::String("name"),
    Field::String("displayName"),
    Field::String("providerCode"),
    Field::String("channel"),
    Field::String("approvalStatus"),
    Field::String("status"),
    Field::String("updatedAt"),
];
const TEMPLATE_FIELDS: &[Field] = &[
    Field::String("id"),
    Field::String("code"),
    Field::String("templateCode"),
    Field::String("name"),
    Field::String("templateName"),
    Field::String("sceneCode"),
    Field::String("channel"),
    Field::String("deliveryPurpose"),
    Field::String("category"),
    Field::String("status"),
    Field::String("publishStatus"),
    Field::String("updatedAt"),
];
const ROUTE_RULE_FIELDS: &[Field] = &[
    Field::String("id"),
    Field::String("code"),
    Field::String("ruleCode"),
    Field::String("sceneCode"),
    Field::String("channel"),
    Field::String("deliveryPurpose"),
    Field::String("countryCode"),
    Field::String("locale"),
    Field::String("userSegment"),
    Field::Integer("priority"),
    Field::String("status"),
    Field::String("updatedAt"),
];
const ROUTE_TARGET_FIELDS: &[Field] = &[
    Field::String("id"),
    Field::String("providerAccountId"),
    Field::String("providerCode"),
    Field::String("senderIdentityId"),
    Field::String("templateBindingId"),
    Field::Integer("targetOrder"),
    Field::Integer("weight"),
    Field::String("status"),
];
const SEND_REQUEST_FIELDS: &[Field] = &[
    Field::String("id"),
    Field::String("code"),
    Field::String("requestNo"),
    Field::String("sceneCode"),
    Field::String("channel"),
    Field::String("targetMasked"),
    Field::String("status"),
    Field::String("deliveryStatus"),
    Field::String("providerCode"),
    Field::String("createdAt"),
    Field::String("failedAt"),
    Field::String("updatedAt"),
];
const SUPPRESSION_FIELDS: &[Field] = &[
    Field::String("id"),
    Field::String("code"),
    Field::String("reasonCode"),
    Field::String("channel"),
    Field::String("name"),
    Field::String("targetMasked"),
    Field::String("targetHash"),
    Field::String("scopeType"),
    Field::String("startsAt"),
    Field::String("endsAt"),
    Field::String("source"),
    Field::String("status"),
    Field::String("updatedAt"),
];
const RATE_LIMIT_FIELDS: &[Field] = &[
    Field::String("id"),
    Field::String("code"),
    Field::String("sceneCode"),
    Field::String("channel"),
    Field::String("targetHash"),
    Field::String("ipHash"),
    Field::String("deviceHash"),
    Field::String("windowStart"),
    Field::Integer("windowSeconds"),
    Field::Integer("sendCount"),
    Field::Integer("verifyCount"),
    Field::Integer("rejectCount"),
    Field::String("status"),
    Field::String("updatedAt"),
];
const VERIFICATION_POLICY_FIELDS: &[Field] = &[
    Field::String("id"),
    Field::String("code"),
    Field::String("name"),
    Field::String("sceneName"),
    Field::String("sceneCode"),
    Field::String("channel"),
    Field::String("defaultChannel"),
    Field::String("templateCode"),
    Field::Integer("codeLength"),
    Field::Integer("ttlSeconds"),
    Field::Integer("maxVerifyAttempts"),
    Field::String("status"),
    Field::String("updatedAt"),
];

#[derive(Clone, Copy)]
enum Field {
    String(&'static str),
    Integer(&'static str),
}

fn collection_from_rows(
    rows: Vec<sqlx::sqlite::SqliteRow>,
    query: ListAdminMessagingRecordsQuery,
    fields: &[Field],
) -> DomainResult<AdminMessagingCollection> {
    let total = rows
        .first()
        .map(|row| integer_cell(row, "total"))
        .transpose()?
        .unwrap_or(0);
    let mut items = Vec::with_capacity(rows.len());
    for row in rows {
        items.push(row_to_record(&row, fields)?);
    }
    Ok(AdminMessagingCollection {
        items,
        total,
        page_no: query.page_no,
        page_size: query.page_size,
    })
}

fn row_to_record(
    row: &sqlx::sqlite::SqliteRow,
    fields: &[Field],
) -> DomainResult<AdminMessagingJsonRecord> {
    let mut record = AdminMessagingJsonRecord::new();
    for field in fields {
        match *field {
            Field::String(name) => {
                record.insert(
                    name.to_owned(),
                    serde_json::Value::String(string_cell(row, name)?),
                );
            }
            Field::Integer(name) => {
                record.insert(
                    name.to_owned(),
                    serde_json::Value::from(integer_cell(row, name)?),
                );
            }
        }
    }
    Ok(record)
}

fn mutation(id: i64, status: &str) -> AdminMessagingMutationItem {
    AdminMessagingMutationItem {
        id: id.to_string(),
        status: status.to_owned(),
    }
}

fn like_filter(value: Option<&str>) -> Option<String> {
    value.map(|value| format!("%{}%", value.to_ascii_lowercase()))
}

fn json_text(value: &serde_json::Value) -> String {
    serde_json::to_string(value).unwrap_or_else(|_| "{}".to_owned())
}

fn template_variable_keys(variables: &serde_json::Value) -> Vec<String> {
    let mut keys = variables
        .as_object()
        .map(|items| items.keys().cloned().collect::<Vec<_>>())
        .unwrap_or_default();
    keys.sort();
    keys
}

fn json_bool(value: &serde_json::Value, key: &str) -> bool {
    value
        .get(key)
        .and_then(serde_json::Value::as_bool)
        .unwrap_or(false)
}

fn target_type(channel: &str) -> &'static str {
    match channel {
        "email" => "email",
        _ => "phone",
    }
}

fn auth_type_code(auth_type: Option<&str>) -> i32 {
    match auth_type {
        Some("bearer") => 2,
        Some("basic") => 3,
        Some("oauth2") => 4,
        _ => 1,
    }
}

fn parse_required_id(value: &str, field_name: &str) -> DomainResult<i64> {
    let parsed = value
        .trim()
        .parse::<i64>()
        .map_err(|error| DomainError::new(format!("invalid messaging {field_name}: {error}")))?;
    if parsed <= 0 {
        return Err(DomainError::new(format!(
            "invalid messaging {field_name}: value must be positive"
        )));
    }
    Ok(parsed)
}

fn optional_parsed_id(value: Option<&str>, field_name: &str) -> DomainResult<Option<i64>> {
    value
        .map(|value| parse_required_id(value, field_name))
        .transpose()
}

fn string_cell(row: &sqlx::sqlite::SqliteRow, column: &str) -> DomainResult<String> {
    if let Ok(value) = row.try_get::<Option<String>, _>(column) {
        return Ok(value.unwrap_or_default());
    }
    if let Ok(value) = row.try_get::<String, _>(column) {
        return Ok(value);
    }
    if let Ok(value) = row.try_get::<Option<i64>, _>(column) {
        return Ok(value.map(|value| value.to_string()).unwrap_or_default());
    }
    if let Ok(value) = row.try_get::<i64, _>(column) {
        return Ok(value.to_string());
    }
    Err(DomainError::new(format!(
        "messaging row column {column} is not readable as text"
    )))
}

fn non_empty_string_cell(
    row: &sqlx::sqlite::SqliteRow,
    column: &str,
) -> DomainResult<Option<String>> {
    let value = string_cell(row, column)?;
    if value.trim().is_empty() {
        return Ok(None);
    }
    Ok(Some(value))
}

fn json_cell(row: &sqlx::sqlite::SqliteRow, column: &str) -> DomainResult<serde_json::Value> {
    let raw = string_cell(row, column)?;
    if raw.trim().is_empty() {
        return Ok(serde_json::json!({}));
    }
    serde_json::from_str(&raw)
        .map_err(|error| DomainError::new(format!("invalid messaging json {column}: {error}")))
}

fn validate_template_variables(
    variable_schema: &serde_json::Value,
    variables: &serde_json::Value,
) -> DomainResult<()> {
    let Some(required) = variable_schema
        .get("required")
        .and_then(serde_json::Value::as_array)
    else {
        return Ok(());
    };
    let Some(values) = variables.as_object() else {
        return Err(DomainError::new(
            "messaging template variables must be a JSON object",
        ));
    };
    for required_item in required {
        let Some(name) = required_item.as_str() else {
            continue;
        };
        let present = values
            .get(name)
            .map(|value| !value.is_null())
            .unwrap_or(false);
        if !present {
            return Err(DomainError::new(format!(
                "missing required template variable {name}"
            )));
        }
    }
    Ok(())
}

fn integer_cell(row: &sqlx::sqlite::SqliteRow, column: &str) -> DomainResult<i64> {
    if let Ok(value) = row.try_get::<i64, _>(column) {
        return Ok(value);
    }
    if let Ok(value) = row.try_get::<Option<i64>, _>(column) {
        return Ok(value.unwrap_or_default());
    }
    if let Ok(value) = row.try_get::<i32, _>(column) {
        return Ok(i64::from(value));
    }
    let value = string_cell(row, column)?;
    if value.trim().is_empty() {
        return Ok(0);
    }
    value
        .parse::<i64>()
        .map_err(|error| DomainError::new(format!("invalid messaging integer {column}: {error}")))
}

fn optional_integer_cell(row: &sqlx::sqlite::SqliteRow, column: &str) -> DomainResult<Option<i64>> {
    if let Ok(value) = row.try_get::<Option<i64>, _>(column) {
        return Ok(value);
    }
    if let Ok(value) = row.try_get::<i64, _>(column) {
        return Ok(Some(value));
    }
    let value = string_cell(row, column)?;
    if value.trim().is_empty() {
        return Ok(None);
    }
    value
        .parse::<i64>()
        .map(Some)
        .map_err(|error| DomainError::new(format!("invalid messaging integer {column}: {error}")))
}

fn write_error(context: &str, error: sqlx::Error) -> DomainError {
    let message = error.to_string();
    if message.contains("UNIQUE constraint failed") || message.contains("unique constraint") {
        return DomainError::conflict(format!("{context}: record already exists"));
    }
    DomainError::new(format!("{context}: {message}"))
}

fn store_error(error: sqlx::Error) -> DomainError {
    DomainError::new(error.to_string())
}

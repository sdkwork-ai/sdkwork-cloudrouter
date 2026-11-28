//! PostgreSQL implementation of the AI capability collection port.
//!
//! Every statement is scoped by the request subject inside SQL; the workspace
//! predicate is never applied in Rust, so a handler cannot widen the scope.
//!
//! Kind integrity is also enforced by the schema: a single-kind collection can
//! only hold items of that kind (composite foreign key + check constraint), and
//! a collection can only be filed under a category of its own kind. The checks
//! below turn those database rejections into actionable client problems before
//! they reach the driver.
//!
//! Deleted rows keep a tombstone suffix on their human key/category code
//! (`#deleted-<id>`), so an operator can delete a collection and immediately
//! reuse its key without tripping the unique index.

use serde_json::Value;
use sqlx::{PgPool, Postgres, Row, Transaction};

use crate::domain::{DomainError, DomainResult};
use crate::infrastructure::sql::runtime_id::next_cloud_runtime_id;
use crate::infrastructure::sql::store_error::redacted_store_error;
use crate::ports::{
    AdminCollectionCapabilityCounts, AdminCollectionCategoryItem, AdminCollectionCategoryListPage,
    AdminCollectionDeleteOutcome, AdminCollectionFuture, AdminCollectionItemInput,
    AdminCollectionItemRecord, AdminCollectionListPage, AdminCollectionRecord,
    AdminCollectionReleaseListPage, AdminCollectionReleaseRecord, AdminCollectionStore,
    AdminCollectionSubject, CreateAdminCollectionCategoryCommand, CreateAdminCollectionCommand,
    DeleteAdminCollectionCategoryCommand, DeleteAdminCollectionCommand,
    ListAdminCollectionCategoriesQuery, ListAdminCollectionReleasesQuery,
    ListAdminCollectionsQuery, ReplaceAdminCollectionItemsCommand,
    UpdateAdminCollectionCategoryCommand, UpdateAdminCollectionCommand,
    UpdateAdminCollectionStatusCommand,
};

const MAX_CATEGORY_PAGE_SIZE: i64 = 200;
const MAX_LIST_PAGE_SIZE: i64 = 200;
const DELETED_TAG: &str = "#deleted-";

/// Built-in category set created by the initialize command. `isSystem` keeps
/// them read-only until the operator creates workspace-specific categories.
const SYSTEM_CATEGORIES: &[(&str, &str, &str, &str)] = &[
    (
        "mixed",
        "general",
        "General",
        "Mixed collection that groups skills, MCP servers, agents, and plugins together.",
    ),
    ("skill", "skills", "Skills", "Skills-only collection."),
    ("mcp", "mcp", "MCP servers", "MCP-server-only collection."),
    ("agent", "agents", "Agents", "Agent-only collection."),
    ("plugin", "plugins", "Plugins", "Plugin-only collection."),
];

#[derive(Debug, Clone)]
pub struct PostgresAdminCollectionStore {
    pool: PgPool,
}

impl PostgresAdminCollectionStore {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

impl AdminCollectionStore for PostgresAdminCollectionStore {
    fn list_categories<'a>(
        &'a self,
        query: ListAdminCollectionCategoriesQuery,
    ) -> AdminCollectionFuture<'a, AdminCollectionCategoryListPage> {
        Box::pin(async move { list_categories(&self.pool, query).await })
    }

    fn initialize_categories<'a>(
        &'a self,
        subject: AdminCollectionSubject,
    ) -> AdminCollectionFuture<'a, AdminCollectionCategoryListPage> {
        Box::pin(async move { initialize_categories(&self.pool, subject).await })
    }

    fn create_category<'a>(
        &'a self,
        command: CreateAdminCollectionCategoryCommand,
    ) -> AdminCollectionFuture<'a, AdminCollectionCategoryItem> {
        Box::pin(async move { create_category(&self.pool, command).await })
    }

    fn update_category<'a>(
        &'a self,
        command: UpdateAdminCollectionCategoryCommand,
    ) -> AdminCollectionFuture<'a, AdminCollectionCategoryItem> {
        Box::pin(async move { update_category(&self.pool, command).await })
    }

    fn delete_category<'a>(
        &'a self,
        command: DeleteAdminCollectionCategoryCommand,
    ) -> AdminCollectionFuture<'a, AdminCollectionDeleteOutcome> {
        Box::pin(async move { delete_category(&self.pool, command).await })
    }

    fn list_collections<'a>(
        &'a self,
        query: ListAdminCollectionsQuery,
    ) -> AdminCollectionFuture<'a, AdminCollectionListPage> {
        Box::pin(async move { list_collections(&self.pool, query).await })
    }

    fn get_collection<'a>(
        &'a self,
        subject: AdminCollectionSubject,
        collection_id: String,
    ) -> AdminCollectionFuture<'a, AdminCollectionRecord> {
        Box::pin(async move { load_collection(&self.pool, subject, &collection_id).await })
    }

    fn create_collection<'a>(
        &'a self,
        command: CreateAdminCollectionCommand,
    ) -> AdminCollectionFuture<'a, AdminCollectionRecord> {
        Box::pin(async move { create_collection(&self.pool, command).await })
    }

    fn update_collection<'a>(
        &'a self,
        command: UpdateAdminCollectionCommand,
    ) -> AdminCollectionFuture<'a, AdminCollectionRecord> {
        Box::pin(async move { update_collection(&self.pool, command).await })
    }

    fn delete_collection<'a>(
        &'a self,
        command: DeleteAdminCollectionCommand,
    ) -> AdminCollectionFuture<'a, AdminCollectionDeleteOutcome> {
        Box::pin(async move { delete_collection(&self.pool, command).await })
    }

    fn replace_collection_items<'a>(
        &'a self,
        command: ReplaceAdminCollectionItemsCommand,
    ) -> AdminCollectionFuture<'a, AdminCollectionRecord> {
        Box::pin(async move { replace_collection_items(&self.pool, command).await })
    }

    fn update_collection_status<'a>(
        &'a self,
        command: UpdateAdminCollectionStatusCommand,
    ) -> AdminCollectionFuture<'a, AdminCollectionRecord> {
        Box::pin(async move { update_collection_status(&self.pool, command).await })
    }

    fn list_collection_releases<'a>(
        &'a self,
        query: ListAdminCollectionReleasesQuery,
    ) -> AdminCollectionFuture<'a, AdminCollectionReleaseListPage> {
        Box::pin(async move { list_collection_releases(&self.pool, query).await })
    }
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

async fn list_categories(
    pool: &PgPool,
    query: ListAdminCollectionCategoriesQuery,
) -> DomainResult<AdminCollectionCategoryListPage> {
    let status = optional_status_int(query.status.as_deref())?;
    let page_size = query.page_size.clamp(1, MAX_CATEGORY_PAGE_SIZE);
    let rows = sqlx::query(CATEGORY_LIST_SQL)
        .bind(query.subject.tenant_id)
        .bind(query.subject.organization_id)
        .bind(query.collection_kind)
        .bind(status)
        .bind(query.search)
        .bind(page_size)
        .bind(query.offset.max(0))
        .fetch_all(pool)
        .await
        .map_err(|error| redacted_store_error("failed to list collection categories", error))?;
    let total = rows
        .first()
        .and_then(|row| row.try_get::<i64, _>("total").ok())
        .unwrap_or(0);
    let items = rows
        .into_iter()
        .map(category_from_row)
        .collect::<DomainResult<Vec<_>>>()?;
    Ok(AdminCollectionCategoryListPage {
        items,
        total,
        page_no: query.page_no,
        page_size,
    })
}

const CATEGORY_LIST_SQL: &str = r#"
SELECT
    c.id::text AS category_id,
    c.category_code,
    c.name,
    c.description,
    c.icon_ref,
    c.collection_kind,
    c.parent_id::text AS parent_id,
    c.sort_order,
    CASE WHEN c.status = 1 THEN 'enabled' ELSE 'disabled' END AS status,
    (COALESCE(c.metadata->>'system', '') = 'true') AS is_system,
    CAST((SELECT COUNT(*) FROM ai_collection col
      WHERE col.category_id = c.id AND col.deleted_at IS NULL
        AND col.tenant_id = c.tenant_id
        AND (col.organization_id = c.organization_id OR c.organization_id = 0)) AS TEXT) AS collection_count,
    COALESCE(c.created_at::text, '') AS created_at,
    COALESCE(c.updated_at::text, '') AS updated_at,
    COUNT(*) OVER() AS total
FROM ai_collection_category c
WHERE c.deleted_at IS NULL
  AND c.tenant_id = $1
  AND (c.organization_id = $2 OR c.organization_id = 0)
  AND ($3::text IS NULL OR c.collection_kind = $3)
  AND ($4::integer IS NULL OR c.status = $4)
  AND ($5::text IS NULL
       OR LOWER(c.name) LIKE '%' || LOWER($5::text) || '%'
       OR LOWER(c.category_code) LIKE '%' || LOWER($5::text) || '%'
       OR LOWER(c.description) LIKE '%' || LOWER($5::text) || '%')
ORDER BY c.collection_kind ASC, c.sort_order ASC, c.id ASC
LIMIT $6 OFFSET $7
"#;

async fn initialize_categories(
    pool: &PgPool,
    subject: AdminCollectionSubject,
) -> DomainResult<AdminCollectionCategoryListPage> {
    let mut transaction = pool
        .begin()
        .await
        .map_err(|error| redacted_store_error("failed to begin category initialization", error))?;
    for (index, (kind, code, name, description)) in SYSTEM_CATEGORIES.iter().enumerate() {
        let id = next_cloud_runtime_id("ai_collection_category")?;
        sqlx::query(
            r#"
            INSERT INTO ai_collection_category (
                id, uuid, tenant_id, organization_id, data_scope, status, created_at, updated_at,
                version, deleted_at, deleted_by, metadata, collection_kind, category_code, name,
                description, icon_ref, parent_id, sort_order
            )
            VALUES (
                $1, $2, $3, $4, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
                1, NULL, NULL, '{"system":true}'::jsonb, $5, $6, $7,
                $8, '', NULL, $9
            )
            ON CONFLICT (tenant_id, organization_id, collection_kind, category_code) DO NOTHING
            "#,
        )
        .bind(id)
        .bind(format!("collection-category-{id}"))
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(kind)
        .bind(code)
        .bind(name)
        .bind(description)
        .bind(i32::try_from(index).unwrap_or(i32::MAX) * 10)
        .execute(&mut *transaction)
        .await
        .map_err(|error| {
            redacted_store_error("failed to initialize collection categories", error)
        })?;
    }
    transaction
        .commit()
        .await
        .map_err(|error| redacted_store_error("failed to commit category initialization", error))?;
    list_categories(
        pool,
        ListAdminCollectionCategoriesQuery {
            subject,
            page_no: 1,
            page_size: MAX_CATEGORY_PAGE_SIZE,
            offset: 0,
            search: None,
            collection_kind: None,
            status: None,
        },
    )
    .await
}

async fn create_category(
    pool: &PgPool,
    command: CreateAdminCollectionCategoryCommand,
) -> DomainResult<AdminCollectionCategoryItem> {
    let status = status_int(&command.status)?;
    let parent_id = match command.parent_id.as_deref() {
        Some(value) => Some(parse_id(value, "parentId")?),
        None => None,
    };
    if let Some(parent_id) = parent_id {
        ensure_category_parent(
            pool,
            command.subject,
            parent_id,
            &command.collection_kind,
            None,
        )
        .await?;
    }
    let id = next_cloud_runtime_id("ai_collection_category")?;
    sqlx::query(
        r#"
        INSERT INTO ai_collection_category (
            id, uuid, tenant_id, organization_id, data_scope, status, created_at, updated_at,
            version, deleted_at, deleted_by, metadata, collection_kind, category_code, name,
            description, icon_ref, parent_id, sort_order
        )
        VALUES (
            $1, $2, $3, $4, 1, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
            1, NULL, NULL, '{}'::jsonb, $6, $7, $8,
            $9, $10, $11, $12
        )
        "#,
    )
    .bind(id)
    .bind(format!("collection-category-{id}"))
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(status)
    .bind(&command.collection_kind)
    .bind(&command.category_code)
    .bind(&command.name)
    .bind(&command.description)
    .bind(&command.icon_ref)
    .bind(parent_id)
    .bind(command.sort_order)
    .execute(pool)
    .await
    .map_err(|error| redacted_store_error("failed to create collection category", error))?;
    load_category(pool, command.subject, id).await
}

async fn update_category(
    pool: &PgPool,
    command: UpdateAdminCollectionCategoryCommand,
) -> DomainResult<AdminCollectionCategoryItem> {
    let category_id = parse_id(&command.category_id, "categoryId")?;
    let status = command.status.as_deref().map(status_int).transpose()?;
    let parent_id = match &command.parent_id {
        Some(value) => Some(
            value
                .as_deref()
                .map(|id| parse_id(id, "parentId"))
                .transpose()?,
        ),
        None => None,
    };
    let mut transaction = pool
        .begin()
        .await
        .map_err(|error| redacted_store_error("failed to begin category update", error))?;
    let existing = load_category_for_update(&mut transaction, command.subject, category_id)
        .await?
        .ok_or_else(|| DomainError::not_found("collection category was not found"))?;
    if existing.is_system {
        return Err(DomainError::bad_request(
            "system collection categories cannot be modified",
        ));
    }
    let (update_parent, parent_value) = match parent_id {
        Some(value) => (true, value),
        None => (false, None),
    };
    if let Some(parent_value) = parent_value {
        if parent_value == category_id {
            return Err(DomainError::bad_request(
                "a collection category cannot be its own parent",
            ));
        }
        ensure_category_parent(
            &mut *transaction,
            command.subject,
            parent_value,
            &existing.collection_kind,
            Some(category_id),
        )
        .await?;
    }
    sqlx::query(
        r#"
        UPDATE ai_collection_category
        SET name = COALESCE($3, name),
            description = COALESCE($4, description),
            icon_ref = COALESCE($5, icon_ref),
            parent_id = CASE WHEN $6::boolean THEN $7::bigint ELSE parent_id END,
            sort_order = COALESCE($8, sort_order),
            status = COALESCE($9, status),
            updated_at = CURRENT_TIMESTAMP,
            version = version + 1
        WHERE id = $1
          AND tenant_id = $2
          AND deleted_at IS NULL
        "#,
    )
    .bind(category_id)
    .bind(command.subject.tenant_id)
    .bind(command.name)
    .bind(command.description)
    .bind(command.icon_ref)
    .bind(update_parent)
    .bind(parent_value)
    .bind(command.sort_order)
    .bind(status)
    .execute(&mut *transaction)
    .await
    .map_err(|error| redacted_store_error("failed to update collection category", error))?;
    transaction
        .commit()
        .await
        .map_err(|error| redacted_store_error("failed to commit category update", error))?;
    load_category(pool, command.subject, category_id).await
}

async fn delete_category(
    pool: &PgPool,
    command: DeleteAdminCollectionCategoryCommand,
) -> DomainResult<AdminCollectionDeleteOutcome> {
    let category_id = parse_id(&command.category_id, "categoryId")?;
    let mut transaction = pool
        .begin()
        .await
        .map_err(|error| redacted_store_error("failed to begin category delete", error))?;
    let existing = load_category_for_update(&mut transaction, command.subject, category_id)
        .await?
        .ok_or_else(|| DomainError::not_found("collection category was not found"))?;
    if existing.is_system {
        return Err(DomainError::bad_request(
            "system collection categories cannot be deleted",
        ));
    }
    let references = sqlx::query(
        r#"
        SELECT COUNT(*) AS referenced
        FROM ai_collection
        WHERE category_id = $1 AND deleted_at IS NULL AND tenant_id = $2
        "#,
    )
    .bind(category_id)
    .bind(command.subject.tenant_id)
    .fetch_one(&mut *transaction)
    .await
    .map_err(|error| redacted_store_error("failed to count category collections", error))?
    .try_get::<i64, _>("referenced")
    .map_err(|error| redacted_store_error("failed to read category reference count", error))?;
    if references > 0 {
        return Err(DomainError::conflict(
            "collection category still has collections filed under it",
        ));
    }
    sqlx::query(
        r#"
        UPDATE ai_collection_category
        SET deleted_at = CURRENT_TIMESTAMP,
            deleted_by = $3,
            status = 0,
            category_code = LEFT(category_code, 100) || $4 || id::text,
            updated_at = CURRENT_TIMESTAMP,
            version = version + 1
        WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
        "#,
    )
    .bind(category_id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.operator_id)
    .bind(DELETED_TAG)
    .execute(&mut *transaction)
    .await
    .map_err(|error| redacted_store_error("failed to delete collection category", error))?;
    transaction
        .commit()
        .await
        .map_err(|error| redacted_store_error("failed to commit category delete", error))?;
    Ok(AdminCollectionDeleteOutcome { deleted: true })
}

async fn load_category(
    pool: &PgPool,
    subject: AdminCollectionSubject,
    category_id: i64,
) -> DomainResult<AdminCollectionCategoryItem> {
    let row = sqlx::query(CATEGORY_LOAD_SQL)
        .bind(category_id)
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .fetch_optional(pool)
        .await
        .map_err(|error| redacted_store_error("failed to load collection category", error))?
        .ok_or_else(|| DomainError::not_found("collection category was not found"))?;
    category_from_row(row)
}

async fn load_category_for_update(
    transaction: &mut Transaction<'_, Postgres>,
    subject: AdminCollectionSubject,
    category_id: i64,
) -> DomainResult<Option<AdminCollectionCategoryItem>> {
    let row = sqlx::query(CATEGORY_LOCK_SQL)
        .bind(category_id)
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .fetch_optional(&mut **transaction)
        .await
        .map_err(|error| redacted_store_error("failed to lock collection category", error))?;
    row.map(category_from_row).transpose()
}

const CATEGORY_LOCK_SQL: &str = r#"
SELECT
    c.id::text AS category_id,
    c.category_code,
    c.name,
    c.description,
    c.icon_ref,
    c.collection_kind,
    c.parent_id::text AS parent_id,
    c.sort_order,
    CASE WHEN c.status = 1 THEN 'enabled' ELSE 'disabled' END AS status,
    (COALESCE(c.metadata->>'system', '') = 'true') AS is_system,
    CAST((SELECT COUNT(*) FROM ai_collection col
      WHERE col.category_id = c.id AND col.deleted_at IS NULL
        AND col.tenant_id = c.tenant_id AND col.organization_id = c.organization_id) AS TEXT) AS collection_count,
    COALESCE(c.created_at::text, '') AS created_at,
    COALESCE(c.updated_at::text, '') AS updated_at
FROM ai_collection_category c
WHERE c.id = $1
  AND c.deleted_at IS NULL
  AND c.tenant_id = $2
  AND (c.organization_id = $3 OR c.organization_id = 0)
LIMIT 1
FOR UPDATE
"#;

const CATEGORY_LOAD_SQL: &str = r#"
SELECT
    c.id::text AS category_id,
    c.category_code,
    c.name,
    c.description,
    c.icon_ref,
    c.collection_kind,
    c.parent_id::text AS parent_id,
    c.sort_order,
    CASE WHEN c.status = 1 THEN 'enabled' ELSE 'disabled' END AS status,
    (COALESCE(c.metadata->>'system', '') = 'true') AS is_system,
    CAST((SELECT COUNT(*) FROM ai_collection col
      WHERE col.category_id = c.id AND col.deleted_at IS NULL
        AND col.tenant_id = c.tenant_id AND col.organization_id = c.organization_id) AS TEXT) AS collection_count,
    COALESCE(c.created_at::text, '') AS created_at,
    COALESCE(c.updated_at::text, '') AS updated_at
FROM ai_collection_category c
WHERE c.id = $1
  AND c.deleted_at IS NULL
  AND c.tenant_id = $2
  AND (c.organization_id = $3 OR c.organization_id = 0)
LIMIT 1
"#;

fn category_from_row(row: sqlx::postgres::PgRow) -> DomainResult<AdminCollectionCategoryItem> {
    Ok(AdminCollectionCategoryItem {
        id: cell::<String>(&row, "category_id")?,
        category_code: cell::<String>(&row, "category_code")?,
        name: cell::<String>(&row, "name")?,
        description: cell::<String>(&row, "description")?,
        icon_ref: cell::<String>(&row, "icon_ref")?,
        collection_kind: cell::<String>(&row, "collection_kind")?,
        parent_id: optional_cell::<String>(&row, "parent_id")?,
        sort_order: cell::<i32>(&row, "sort_order")?,
        status: cell::<String>(&row, "status")?,
        is_system: cell::<bool>(&row, "is_system")?,
        collection_count: cell::<String>(&row, "collection_count")?,
        created_at: cell::<String>(&row, "created_at")?,
        updated_at: cell::<String>(&row, "updated_at")?,
    })
}

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------

async fn list_collections(
    pool: &PgPool,
    query: ListAdminCollectionsQuery,
) -> DomainResult<AdminCollectionListPage> {
    let status = optional_status_int(query.status.as_deref())?;
    let category_id = match query.category_id.as_deref() {
        Some(value) => Some(parse_id(value, "categoryId")?),
        None => None,
    };
    let page_size = query.page_size.clamp(1, MAX_LIST_PAGE_SIZE);
    let rows = sqlx::query(COLLECTION_LIST_SQL)
        .bind(query.subject.tenant_id)
        .bind(query.subject.organization_id)
        .bind(query.collection_kind)
        .bind(category_id)
        .bind(query.publish_status)
        .bind(status)
        .bind(query.featured)
        .bind(query.search)
        .bind(page_size)
        .bind(query.offset.max(0))
        .fetch_all(pool)
        .await
        .map_err(|error| redacted_store_error("failed to list collections", error))?;
    let total = rows
        .first()
        .and_then(|row| row.try_get::<i64, _>("total").ok())
        .unwrap_or(0);
    let collection_ids = rows
        .iter()
        .map(|row| cell::<String>(row, "collection_id"))
        .collect::<DomainResult<Vec<_>>>()?
        .into_iter()
        .map(|value| parse_id(&value, "id"))
        .collect::<DomainResult<Vec<_>>>()?;
    let mut items_by_collection =
        load_items_by_collection(pool, query.subject, &collection_ids).await?;
    let items = rows
        .into_iter()
        .map(|row| collection_from_row(row, &mut items_by_collection))
        .collect::<DomainResult<Vec<_>>>()?;
    Ok(AdminCollectionListPage {
        items,
        total,
        page_no: query.page_no,
        page_size,
    })
}

const COLLECTION_LIST_SQL: &str = r#"
SELECT
    c.id::text AS collection_id,
    c.collection_key,
    c.name,
    c.summary,
    c.description,
    c.icon_ref,
    c.collection_kind,
    c.category_id::text AS category_id,
    cat.name AS category_name,
    c.visibility,
    c.publish_status,
    c.published_at::text AS published_at,
    c.tags::text AS tags,
    c.featured,
    c.sort_order,
    c.owner_user_id::text AS owner_user_id,
    c.created_by::text AS created_by,
    c.updated_by::text AS updated_by,
    CASE WHEN c.status = 1 THEN 'enabled' ELSE 'disabled' END AS status,
    (SELECT MAX(r.release_no) FROM ai_collection_release r
      WHERE r.collection_id = c.id AND r.deleted_at IS NULL) AS latest_release_no,
    COALESCE(c.created_at::text, '') AS created_at,
    COALESCE(c.updated_at::text, '') AS updated_at,
    COUNT(*) OVER() AS total
FROM ai_collection c
LEFT JOIN ai_collection_category cat
    ON cat.id = c.category_id AND cat.deleted_at IS NULL
WHERE c.deleted_at IS NULL
  AND c.tenant_id = $1
  AND (c.organization_id = $2 OR c.organization_id = 0)
  AND ($3::text IS NULL OR c.collection_kind = $3)
  AND ($4::bigint IS NULL OR c.category_id = $4)
  AND ($5::text IS NULL OR c.publish_status = $5)
  AND ($6::integer IS NULL OR c.status = $6)
  AND ($7::boolean IS NULL OR c.featured = $7)
  AND ($8::text IS NULL
       OR LOWER(c.name) LIKE '%' || LOWER($8::text) || '%'
       OR LOWER(c.collection_key) LIKE '%' || LOWER($8::text) || '%'
       OR LOWER(c.summary) LIKE '%' || LOWER($8::text) || '%'
       OR LOWER(c.description) LIKE '%' || LOWER($8::text) || '%'
       OR LOWER(c.tags::text) LIKE '%' || LOWER($8::text) || '%')
ORDER BY c.sort_order ASC, c.updated_at DESC, c.id DESC
LIMIT $9 OFFSET $10
"#;

async fn load_collection(
    pool: &PgPool,
    subject: AdminCollectionSubject,
    collection_id: &str,
) -> DomainResult<AdminCollectionRecord> {
    let id = parse_id(collection_id, "collectionId")?;
    let row = sqlx::query(COLLECTION_LOAD_SQL)
        .bind(subject.tenant_id)
        .bind(id)
        .bind(subject.organization_id)
        .fetch_optional(pool)
        .await
        .map_err(|error| redacted_store_error("failed to load collection", error))?
        .ok_or_else(|| DomainError::not_found("collection was not found"))?;
    let mut items_by_collection = load_items_by_collection(pool, subject, &[id]).await?;
    collection_from_row(row, &mut items_by_collection)
}

const COLLECTION_LOAD_SQL: &str = r#"
SELECT
    c.id::text AS collection_id,
    c.collection_key,
    c.name,
    c.summary,
    c.description,
    c.icon_ref,
    c.collection_kind,
    c.category_id::text AS category_id,
    cat.name AS category_name,
    c.visibility,
    c.publish_status,
    c.published_at::text AS published_at,
    c.tags::text AS tags,
    c.featured,
    c.sort_order,
    c.owner_user_id::text AS owner_user_id,
    c.created_by::text AS created_by,
    c.updated_by::text AS updated_by,
    CASE WHEN c.status = 1 THEN 'enabled' ELSE 'disabled' END AS status,
    (SELECT MAX(r.release_no) FROM ai_collection_release r
      WHERE r.collection_id = c.id AND r.deleted_at IS NULL) AS latest_release_no,
    COALESCE(c.created_at::text, '') AS created_at,
    COALESCE(c.updated_at::text, '') AS updated_at
FROM ai_collection c
LEFT JOIN ai_collection_category cat
    ON cat.id = c.category_id AND cat.deleted_at IS NULL
WHERE c.deleted_at IS NULL
  AND c.tenant_id = $1
  AND c.id = $2
  AND (c.organization_id = $3 OR c.organization_id = 0)
LIMIT 1
"#;

/// Loads the ordered item list of every collection in one query so a list read
/// never becomes N+1.
async fn load_items_by_collection(
    pool: &PgPool,
    subject: AdminCollectionSubject,
    collection_ids: &[i64],
) -> DomainResult<std::collections::HashMap<i64, Vec<AdminCollectionItemRecord>>> {
    let mut grouped: std::collections::HashMap<i64, Vec<AdminCollectionItemRecord>> =
        std::collections::HashMap::new();
    if collection_ids.is_empty() {
        return Ok(grouped);
    }
    let rows = sqlx::query(COLLECTION_ITEMS_SQL)
        .bind(collection_ids.to_vec())
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .fetch_all(pool)
        .await
        .map_err(|error| redacted_store_error("failed to load collection items", error))?;
    for row in rows {
        let item = item_from_row(&row)?;
        let collection_id = parse_id(&item.collection_id, "collectionId")?;
        grouped.entry(collection_id).or_default().push(item);
    }
    Ok(grouped)
}

const COLLECTION_ITEMS_SQL: &str = r#"
SELECT
    i.id::text AS item_id,
    i.collection_id::text AS collection_id,
    i.capability_type,
    i.capability_key,
    i.capability_name,
    i.capability_version,
    i.capability_icon_ref,
    COALESCE(i.config::text, '{}') AS config,
    i.sort_order,
    i.enabled,
    COALESCE(i.created_at::text, '') AS created_at,
    COALESCE(i.updated_at::text, '') AS updated_at
FROM ai_collection_item i
WHERE i.collection_id = ANY($1::bigint[])
  AND i.tenant_id = $2
  AND (i.organization_id = $3 OR i.organization_id = 0)
ORDER BY i.collection_id ASC, i.sort_order ASC, i.id ASC
"#;

fn collection_from_row(
    row: sqlx::postgres::PgRow,
    items_by_collection: &mut std::collections::HashMap<i64, Vec<AdminCollectionItemRecord>>,
) -> DomainResult<AdminCollectionRecord> {
    let collection_id_text = cell::<String>(&row, "collection_id")?;
    let collection_id = parse_id(&collection_id_text, "id")?;
    let items = items_by_collection
        .remove(&collection_id)
        .unwrap_or_default();
    let tags = parse_tags(&cell::<String>(&row, "tags")?)?;
    let capability_counts = capability_counts(&items);
    Ok(AdminCollectionRecord {
        id: collection_id_text,
        collection_key: cell::<String>(&row, "collection_key")?,
        name: cell::<String>(&row, "name")?,
        summary: cell::<String>(&row, "summary")?,
        description: cell::<String>(&row, "description")?,
        icon_ref: cell::<String>(&row, "icon_ref")?,
        collection_kind: cell::<String>(&row, "collection_kind")?,
        category_id: optional_cell::<String>(&row, "category_id")?,
        category_name: optional_cell::<String>(&row, "category_name")?,
        visibility: cell::<String>(&row, "visibility")?,
        publish_status: cell::<String>(&row, "publish_status")?,
        published_at: optional_cell::<String>(&row, "published_at")?,
        item_count: items.len().to_string(),
        capability_counts,
        tags,
        featured: cell::<bool>(&row, "featured")?,
        sort_order: cell::<i32>(&row, "sort_order")?,
        owner_user_id: cell::<String>(&row, "owner_user_id")?,
        created_by: cell::<String>(&row, "created_by")?,
        updated_by: cell::<String>(&row, "updated_by")?,
        status: cell::<String>(&row, "status")?,
        latest_release_no: optional_cell::<i32>(&row, "latest_release_no")?,
        items,
        created_at: cell::<String>(&row, "created_at")?,
        updated_at: cell::<String>(&row, "updated_at")?,
    })
}

fn item_from_row(row: &sqlx::postgres::PgRow) -> DomainResult<AdminCollectionItemRecord> {
    let config_text = cell::<String>(row, "config")?;
    let config: Value = serde_json::from_str(&config_text).map_err(|error| {
        tracing::error!(error = %error, "collection item config is not valid JSON");
        DomainError::new("collection item config could not be decoded")
    })?;
    Ok(AdminCollectionItemRecord {
        id: cell::<String>(row, "item_id")?,
        collection_id: cell::<String>(row, "collection_id")?,
        capability_type: cell::<String>(row, "capability_type")?,
        capability_key: cell::<String>(row, "capability_key")?,
        capability_name: cell::<String>(row, "capability_name")?,
        capability_version: cell::<String>(row, "capability_version")?,
        capability_icon_ref: cell::<String>(row, "capability_icon_ref")?,
        config,
        sort_order: cell::<i32>(row, "sort_order")?,
        enabled: cell::<bool>(row, "enabled")?,
        created_at: cell::<String>(row, "created_at")?,
        updated_at: cell::<String>(row, "updated_at")?,
    })
}

fn capability_counts(items: &[AdminCollectionItemRecord]) -> AdminCollectionCapabilityCounts {
    let mut counts = AdminCollectionCapabilityCounts {
        skill: "0".to_owned(),
        mcp: "0".to_owned(),
        agent: "0".to_owned(),
        plugin: "0".to_owned(),
    };
    for item in items.iter().filter(|item| item.enabled) {
        let slot = match item.capability_type.as_str() {
            "skill" => &mut counts.skill,
            "mcp" => &mut counts.mcp,
            "agent" => &mut counts.agent,
            "plugin" => &mut counts.plugin,
            _ => continue,
        };
        let next = slot.parse::<i64>().unwrap_or(0).saturating_add(1);
        *slot = next.to_string();
    }
    counts
}

async fn create_collection(
    pool: &PgPool,
    command: CreateAdminCollectionCommand,
) -> DomainResult<AdminCollectionRecord> {
    let id = next_cloud_runtime_id("ai_collection")?;
    let collection_key = match command.collection_key.as_deref() {
        Some(value) => value.to_owned(),
        None => generated_collection_key(&command.name, id),
    };
    let category_id = match command.category_id.as_deref() {
        Some(value) => Some(parse_id(value, "categoryId")?),
        None => None,
    };
    let tags = serde_json::to_string(&command.tags)
        .map_err(|error| DomainError::new(format!("collection tags are invalid: {error}")))?;
    let mut transaction = pool
        .begin()
        .await
        .map_err(|error| redacted_store_error("failed to begin collection create", error))?;
    if let Some(category_id) = category_id {
        ensure_category_kind(
            &mut transaction,
            command.subject,
            category_id,
            &command.collection_kind,
        )
        .await?;
    }
    validate_items_for_kind(&command.collection_kind, &command.items)?;
    sqlx::query(
        r#"
        INSERT INTO ai_collection (
            id, uuid, tenant_id, organization_id, data_scope, status, created_at, updated_at,
            version, deleted_at, deleted_by, metadata, collection_key, name, summary, description,
            icon_ref, collection_kind, category_id, visibility, publish_status, published_at,
            item_count, tags, featured, sort_order, owner_user_id, created_by, updated_by
        )
        VALUES (
            $1, $2, $3, $4, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
            1, NULL, NULL, '{}'::jsonb, $5, $6, $7, $8,
            $9, $10, $11, $12, 'draft', NULL,
            $13, $14::jsonb, $15, $16, $17, $17, $17
        )
        "#,
    )
    .bind(id)
    .bind(format!("collection-{id}"))
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(&collection_key)
    .bind(&command.name)
    .bind(&command.summary)
    .bind(&command.description)
    .bind(&command.icon_ref)
    .bind(&command.collection_kind)
    .bind(category_id)
    .bind(&command.visibility)
    .bind(i64::try_from(command.items.len()).unwrap_or(i64::MAX))
    .bind(&tags)
    .bind(command.featured)
    .bind(command.sort_order)
    .bind(command.subject.operator_id)
    .execute(&mut *transaction)
    .await
    .map_err(|error| redacted_store_error("failed to create collection", error))?;
    insert_items(
        &mut transaction,
        command.subject,
        id,
        &command.collection_kind,
        &command.items,
    )
    .await?;
    transaction
        .commit()
        .await
        .map_err(|error| redacted_store_error("failed to commit collection create", error))?;
    load_collection(pool, command.subject, &id.to_string()).await
}

async fn update_collection(
    pool: &PgPool,
    command: UpdateAdminCollectionCommand,
) -> DomainResult<AdminCollectionRecord> {
    let collection_id = parse_id(&command.collection_id, "collectionId")?;
    let status = command.status.as_deref().map(status_int).transpose()?;
    let category_id = match &command.category_id {
        Some(value) => Some(
            value
                .as_deref()
                .map(|id| parse_id(id, "categoryId"))
                .transpose()?,
        ),
        None => None,
    };
    let mut transaction = pool
        .begin()
        .await
        .map_err(|error| redacted_store_error("failed to begin collection update", error))?;
    let locked =
        load_collection_scope_for_update(&mut transaction, command.subject, collection_id).await?;
    // Content edits invalidate the published snapshot: the operator must publish
    // again so a release always describes the current item set and title.
    // Filing/visibility/featured/sort/status changes do not.
    let content_changed = command
        .name
        .as_deref()
        .is_some_and(|value| value != locked.name)
        || command
            .summary
            .as_deref()
            .is_some_and(|value| value != locked.summary)
        || command
            .description
            .as_deref()
            .is_some_and(|value| value != locked.description)
        || command
            .icon_ref
            .as_deref()
            .is_some_and(|value| value != locked.icon_ref)
        || command
            .tags
            .as_ref()
            .is_some_and(|value| value != &locked.tags);
    let reset_to_draft = content_changed && locked.publish_status != "draft";
    let tags = command
        .tags
        .as_ref()
        .map(|tags| serde_json::to_string(tags))
        .transpose()
        .map_err(|error| DomainError::new(format!("collection tags are invalid: {error}")))?;
    let (update_category, category_value) = match category_id {
        Some(value) => (true, value),
        None => (false, None),
    };
    if let Some(category_value) = category_value {
        ensure_category_kind(
            &mut transaction,
            command.subject,
            category_value,
            &locked.collection_kind,
        )
        .await?;
    }
    sqlx::query(
        r#"
        UPDATE ai_collection
        SET name = COALESCE($3, name),
            summary = COALESCE($4, summary),
            description = COALESCE($5, description),
            icon_ref = COALESCE($6, icon_ref),
            category_id = CASE WHEN $7::boolean THEN $8::bigint ELSE category_id END,
            visibility = COALESCE($9, visibility),
            tags = COALESCE($10::jsonb, tags),
            featured = COALESCE($11, featured),
            sort_order = COALESCE($12, sort_order),
            status = COALESCE($13, status),
            updated_by = $14,
            publish_status = CASE WHEN $15::boolean THEN 'draft' ELSE publish_status END,
            updated_at = CURRENT_TIMESTAMP,
            version = version + 1
        WHERE id = $1
          AND tenant_id = $2
          AND deleted_at IS NULL
        "#,
    )
    .bind(collection_id)
    .bind(command.subject.tenant_id)
    .bind(command.name)
    .bind(command.summary)
    .bind(command.description)
    .bind(command.icon_ref)
    .bind(update_category)
    .bind(category_value)
    .bind(command.visibility)
    .bind(tags)
    .bind(command.featured)
    .bind(command.sort_order)
    .bind(status)
    .bind(command.subject.operator_id)
    .bind(reset_to_draft)
    .execute(&mut *transaction)
    .await
    .map_err(|error| redacted_store_error("failed to update collection", error))?;
    transaction
        .commit()
        .await
        .map_err(|error| redacted_store_error("failed to commit collection update", error))?;
    load_collection(pool, command.subject, &collection_id.to_string()).await
}

async fn delete_collection(
    pool: &PgPool,
    command: DeleteAdminCollectionCommand,
) -> DomainResult<AdminCollectionDeleteOutcome> {
    let collection_id = parse_id(&command.collection_id, "collectionId")?;
    let result = sqlx::query(
        r#"
        UPDATE ai_collection
        SET deleted_at = CURRENT_TIMESTAMP,
            deleted_by = $3,
            status = 0,
            collection_key = LEFT(collection_key, 100) || $4 || id::text,
            updated_at = CURRENT_TIMESTAMP,
            version = version + 1
        WHERE id = $1
          AND tenant_id = $2
          AND (organization_id = $5 OR organization_id = 0)
          AND deleted_at IS NULL
        "#,
    )
    .bind(collection_id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.operator_id)
    .bind(DELETED_TAG)
    .bind(command.subject.organization_id)
    .execute(pool)
    .await
    .map_err(|error| redacted_store_error("failed to delete collection", error))?;
    if result.rows_affected() == 0 {
        return Ok(AdminCollectionDeleteOutcome { deleted: false });
    }
    Ok(AdminCollectionDeleteOutcome { deleted: true })
}

async fn replace_collection_items(
    pool: &PgPool,
    command: ReplaceAdminCollectionItemsCommand,
) -> DomainResult<AdminCollectionRecord> {
    let collection_id = parse_id(&command.collection_id, "collectionId")?;
    let mut transaction = pool
        .begin()
        .await
        .map_err(|error| redacted_store_error("failed to begin collection items replace", error))?;
    let locked =
        load_collection_scope_for_update(&mut transaction, command.subject, collection_id).await?;
    validate_items_for_kind(&locked.collection_kind, &command.items)?;
    sqlx::query("DELETE FROM ai_collection_item WHERE collection_id = $1 AND tenant_id = $2")
        .bind(collection_id)
        .bind(command.subject.tenant_id)
        .execute(&mut *transaction)
        .await
        .map_err(|error| redacted_store_error("failed to clear collection items", error))?;
    insert_items(
        &mut transaction,
        command.subject,
        collection_id,
        &locked.collection_kind,
        &command.items,
    )
    .await?;
    sqlx::query(
        r#"
        UPDATE ai_collection
        SET item_count = $3,
            publish_status = 'draft',
            updated_by = $4,
            updated_at = CURRENT_TIMESTAMP,
            version = version + 1
        WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
        "#,
    )
    .bind(collection_id)
    .bind(command.subject.tenant_id)
    .bind(i64::try_from(command.items.len()).unwrap_or(i64::MAX))
    .bind(command.subject.operator_id)
    .execute(&mut *transaction)
    .await
    .map_err(|error| redacted_store_error("failed to update collection item count", error))?;
    transaction.commit().await.map_err(|error| {
        redacted_store_error("failed to commit collection items replace", error)
    })?;
    load_collection(pool, command.subject, &collection_id.to_string()).await
}

async fn update_collection_status(
    pool: &PgPool,
    command: UpdateAdminCollectionStatusCommand,
) -> DomainResult<AdminCollectionRecord> {
    let collection_id = parse_id(&command.collection_id, "collectionId")?;
    let mut transaction = pool
        .begin()
        .await
        .map_err(|error| redacted_store_error("failed to begin collection status update", error))?;
    let locked =
        load_collection_scope_for_update(&mut transaction, command.subject, collection_id).await?;
    match command.publish_status.as_str() {
        "published" => {
            if locked.status != 1 {
                return Err(DomainError::bad_request(
                    "a disabled collection cannot be published",
                ));
            }
            let items =
                load_items_for_update(&mut transaction, command.subject, collection_id).await?;
            let enabled_count = items.iter().filter(|item| item.enabled).count();
            if enabled_count == 0 {
                return Err(DomainError::bad_request(
                    "a collection must contain at least one enabled capability before it can be published",
                ));
            }
            // Only enabled items belong to the active release; disabled items
            // stay in the draft and are excluded from the snapshot.
            let publishable_items = items.iter().filter(|item| item.enabled).collect::<Vec<_>>();
            let snapshot = serde_json::to_string(
                &publishable_items
                    .iter()
                    .map(|item| item_snapshot(item))
                    .collect::<Vec<serde_json::Value>>(),
            )
            .map_err(|error| {
                DomainError::new(format!("collection snapshot is invalid: {error}"))
            })?;
            let release_no = sqlx::query(
                r#"
                SELECT COALESCE(MAX(release_no), 0) + 1 AS next_release_no
                FROM ai_collection_release
                WHERE collection_id = $1
                "#,
            )
            .bind(collection_id)
            .fetch_one(&mut *transaction)
            .await
            .map_err(|error| redacted_store_error("failed to read next collection release", error))?
            .try_get::<i32, _>("next_release_no")
            .map_err(|error| {
                redacted_store_error("failed to decode collection release no", error)
            })?;
            let release_id = next_cloud_runtime_id("ai_collection_release")?;
            sqlx::query(
                r#"
                INSERT INTO ai_collection_release (
                    id, uuid, tenant_id, organization_id, data_scope, status, created_at, updated_at,
                    version, deleted_at, deleted_by, metadata, collection_id, release_no, name,
                    item_count, item_snapshot, release_status, notes, published_by, published_at
                )
                VALUES (
                    $1, $2, $3, $4, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
                    1, NULL, NULL, '{}'::jsonb, $5, $6, $7,
                    $8, $9::jsonb, 'published', $10, $11, CURRENT_TIMESTAMP
                )
                "#,
            )
            .bind(release_id)
            .bind(format!("collection-release-{release_id}"))
            .bind(command.subject.tenant_id)
            .bind(command.subject.organization_id)
            .bind(collection_id)
            .bind(release_no)
            .bind(&locked.name)
            .bind(i64::try_from(publishable_items.len()).unwrap_or(i64::MAX))
            .bind(&snapshot)
            .bind(&command.notes)
            .bind(command.subject.operator_id)
            .execute(&mut *transaction)
            .await
            .map_err(|error| redacted_store_error("failed to write collection release", error))?;
            sqlx::query(
                r#"
                UPDATE ai_collection
                SET publish_status = 'published',
                    published_at = CURRENT_TIMESTAMP,
                    updated_by = $3,
                    updated_at = CURRENT_TIMESTAMP,
                    version = version + 1
                WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
                "#,
            )
            .bind(collection_id)
            .bind(command.subject.tenant_id)
            .bind(command.subject.operator_id)
            .execute(&mut *transaction)
            .await
            .map_err(|error| redacted_store_error("failed to publish collection", error))?;
        }
        "archived" => {
            sqlx::query(
                r#"
                UPDATE ai_collection
                SET publish_status = 'archived',
                    updated_by = $3,
                    updated_at = CURRENT_TIMESTAMP,
                    version = version + 1
                WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
                "#,
            )
            .bind(collection_id)
            .bind(command.subject.tenant_id)
            .bind(command.subject.operator_id)
            .execute(&mut *transaction)
            .await
            .map_err(|error| redacted_store_error("failed to archive collection", error))?;
        }
        other => {
            return Err(DomainError::bad_request(format!(
                "unsupported collection publish status: {other}"
            )));
        }
    }
    transaction.commit().await.map_err(|error| {
        redacted_store_error("failed to commit collection status update", error)
    })?;
    load_collection(pool, command.subject, &collection_id.to_string()).await
}

async fn list_collection_releases(
    pool: &PgPool,
    query: ListAdminCollectionReleasesQuery,
) -> DomainResult<AdminCollectionReleaseListPage> {
    let collection_id = parse_id(&query.collection_id, "collectionId")?;
    let page_size = query.page_size.clamp(1, MAX_LIST_PAGE_SIZE);
    let collection_exists = sqlx::query_scalar::<_, bool>(
        r#"
        SELECT EXISTS (
            SELECT 1
            FROM ai_collection
            WHERE id = $1
              AND tenant_id = $2
              AND (organization_id = $3 OR organization_id = 0)
              AND deleted_at IS NULL
        )
        "#,
    )
    .bind(collection_id)
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .fetch_one(pool)
    .await
    .map_err(|error| redacted_store_error("failed to check collection existence", error))?;
    if !collection_exists {
        return Err(DomainError::not_found("collection was not found"));
    }
    let rows = sqlx::query(RELEASE_LIST_SQL)
        .bind(collection_id)
        .bind(query.subject.tenant_id)
        .bind(query.subject.organization_id)
        .bind(page_size)
        .bind(query.offset.max(0))
        .fetch_all(pool)
        .await
        .map_err(|error| redacted_store_error("failed to list collection releases", error))?;
    let total = rows
        .first()
        .and_then(|row| row.try_get::<i64, _>("total").ok())
        .unwrap_or(0);
    let items = rows
        .into_iter()
        .map(release_from_row)
        .collect::<DomainResult<Vec<_>>>()?;
    Ok(AdminCollectionReleaseListPage {
        items,
        total,
        page_no: query.page_no,
        page_size,
    })
}

const RELEASE_LIST_SQL: &str = r#"
SELECT
    r.id::text AS release_id,
    r.release_no,
    r.name,
    CAST(r.item_count AS TEXT) AS item_count_text,
    r.release_status,
    r.notes,
    r.published_by::text AS published_by,
    COALESCE(r.published_at::text, '') AS published_at,
    COALESCE(r.created_at::text, '') AS created_at,
    COUNT(*) OVER() AS total
FROM ai_collection_release r
JOIN ai_collection c ON c.id = r.collection_id AND c.deleted_at IS NULL
WHERE r.collection_id = $1
  AND r.deleted_at IS NULL
  AND c.tenant_id = $2
  AND (c.organization_id = $3 OR c.organization_id = 0)
ORDER BY r.release_no DESC, r.id DESC
LIMIT $4 OFFSET $5
"#;

fn release_from_row(row: sqlx::postgres::PgRow) -> DomainResult<AdminCollectionReleaseRecord> {
    Ok(AdminCollectionReleaseRecord {
        id: cell::<String>(&row, "release_id")?,
        release_no: cell::<i32>(&row, "release_no")?,
        name: cell::<String>(&row, "name")?,
        item_count: cell::<String>(&row, "item_count_text")?,
        release_status: cell::<String>(&row, "release_status")?,
        notes: cell::<String>(&row, "notes")?,
        published_by: cell::<String>(&row, "published_by")?,
        published_at: cell::<String>(&row, "published_at")?,
        created_at: cell::<String>(&row, "created_at")?,
    })
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

async fn insert_items(
    transaction: &mut Transaction<'_, Postgres>,
    subject: AdminCollectionSubject,
    collection_id: i64,
    collection_kind: &str,
    items: &[AdminCollectionItemInput],
) -> DomainResult<()> {
    for item in items {
        let id = next_cloud_runtime_id("ai_collection_item")?;
        let config = serde_json::to_string(&item.config).map_err(|error| {
            DomainError::bad_request(format!("collection item config is invalid: {error}"))
        })?;
        sqlx::query(
            r#"
            INSERT INTO ai_collection_item (
                id, uuid, tenant_id, organization_id, data_scope, status, created_at, updated_at,
                version, deleted_at, deleted_by, metadata, collection_id, collection_kind,
                capability_type, capability_key, capability_name, capability_version,
                capability_icon_ref, config, sort_order, enabled
            )
            VALUES (
                $1, $2, $3, $4, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
                1, NULL, NULL, '{}'::jsonb, $5, $6,
                $7, $8, $9, $10,
                $11, $12::jsonb, $13, $14
            )
            "#,
        )
        .bind(id)
        .bind(format!("collection-item-{id}"))
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(collection_id)
        .bind(collection_kind)
        .bind(&item.capability_type)
        .bind(&item.capability_key)
        .bind(&item.capability_name)
        .bind(&item.capability_version)
        .bind(&item.capability_icon_ref)
        .bind(&config)
        .bind(item.sort_order)
        .bind(item.enabled)
        .execute(&mut **transaction)
        .await
        .map_err(|error| redacted_store_error("failed to write collection item", error))?;
    }
    Ok(())
}

/// Validates that a category parent exists in the caller's workspace, keeps the
/// same collection kind, and does not close a cycle on `moved_category_id`.
async fn ensure_category_parent<'e, E>(
    executor: E,
    subject: AdminCollectionSubject,
    parent_id: i64,
    collection_kind: &str,
    moved_category_id: Option<i64>,
) -> DomainResult<()>
where
    E: sqlx::Executor<'e, Database = Postgres>,
{
    let row = sqlx::query(
        r#"
        WITH RECURSIVE ancestors AS (
            SELECT id, parent_id
            FROM ai_collection_category
            WHERE id = $1 AND deleted_at IS NULL
            UNION ALL
            SELECT c.id, c.parent_id
            FROM ai_collection_category c
            JOIN ancestors a ON c.id = a.parent_id
            WHERE c.deleted_at IS NULL
        )
        SELECT
            (SELECT collection_kind
             FROM ai_collection_category
             WHERE id = $1
               AND tenant_id = $2
               AND (organization_id = $3 OR organization_id = 0)
               AND deleted_at IS NULL
               AND status = 1
             LIMIT 1) AS parent_kind,
            (SELECT CAST(COUNT(*) AS BIGINT) FROM ancestors WHERE id = $4) AS cycle_count
        "#,
    )
    .bind(parent_id)
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(moved_category_id)
    .fetch_one(executor)
    .await
    .map_err(|error| {
        redacted_store_error("failed to validate collection category parent", error)
    })?;
    let parent_kind = row
        .try_get::<Option<String>, _>("parent_kind")
        .map_err(|error| {
            redacted_store_error("failed to decode collection category parent", error)
        })?
        .ok_or_else(|| {
            DomainError::bad_request("parentId must identify an existing collection category")
        })?;
    if parent_kind != collection_kind {
        return Err(DomainError::bad_request(
            "parentId must identify a collection category of the same collection kind",
        ));
    }
    let cycle_count = row.try_get::<i64, _>("cycle_count").map_err(|error| {
        redacted_store_error("failed to decode collection category cycle", error)
    })?;
    if cycle_count > 0 {
        return Err(DomainError::bad_request(
            "parentId must not create a collection category cycle",
        ));
    }
    Ok(())
}

async fn ensure_category_kind(
    transaction: &mut Transaction<'_, Postgres>,
    subject: AdminCollectionSubject,
    category_id: i64,
    collection_kind: &str,
) -> DomainResult<()> {
    let row = sqlx::query(
        r#"
        SELECT collection_kind
        FROM ai_collection_category
        WHERE id = $1
          AND tenant_id = $2
          AND (organization_id = $3 OR organization_id = 0)
          AND deleted_at IS NULL
          AND status = 1
        LIMIT 1
        FOR SHARE
        "#,
    )
    .bind(category_id)
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .fetch_optional(&mut **transaction)
    .await
    .map_err(|error| redacted_store_error("failed to load collection category kind", error))?
    .ok_or_else(|| {
        DomainError::bad_request("categoryId must identify an existing collection category")
    })?;
    let category_kind = row
        .try_get::<String, _>("collection_kind")
        .map_err(|error| {
            redacted_store_error("failed to decode collection category kind", error)
        })?;
    if category_kind != collection_kind {
        return Err(DomainError::bad_request(
            "categoryId must identify a collection category of the same collection kind",
        ));
    }
    Ok(())
}

fn validate_items_for_kind(
    collection_kind: &str,
    items: &[AdminCollectionItemInput],
) -> DomainResult<()> {
    if collection_kind != "mixed" {
        if items
            .iter()
            .any(|item| item.capability_type != collection_kind)
        {
            return Err(DomainError::bad_request(format!(
                "a {} collection can only contain {} capabilities",
                collection_kind, collection_kind
            )));
        }
    }
    Ok(())
}

async fn load_collection_scope_for_update(
    transaction: &mut Transaction<'_, Postgres>,
    subject: AdminCollectionSubject,
    collection_id: i64,
) -> DomainResult<LockedCollection> {
    let row = sqlx::query(
        r#"
        SELECT collection_kind, category_id, name, summary, description, icon_ref,
               tags::text AS tags, publish_status, status
        FROM ai_collection
        WHERE id = $1
          AND tenant_id = $2
          AND (organization_id = $3 OR organization_id = 0)
          AND deleted_at IS NULL
        LIMIT 1
        FOR UPDATE
        "#,
    )
    .bind(collection_id)
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .fetch_optional(&mut **transaction)
    .await
    .map_err(|error| redacted_store_error("failed to lock collection", error))?
    .ok_or_else(|| DomainError::not_found("collection was not found"))?;
    Ok(LockedCollection {
        collection_kind: row
            .try_get::<String, _>("collection_kind")
            .map_err(|error| redacted_store_error("failed to decode collection kind", error))?,
        name: row
            .try_get::<String, _>("name")
            .map_err(|error| redacted_store_error("failed to decode collection name", error))?,
        summary: row
            .try_get::<String, _>("summary")
            .map_err(|error| redacted_store_error("failed to decode collection summary", error))?,
        description: row.try_get::<String, _>("description").map_err(|error| {
            redacted_store_error("failed to decode collection description", error)
        })?,
        icon_ref: row
            .try_get::<String, _>("icon_ref")
            .map_err(|error| redacted_store_error("failed to decode collection icon", error))?,
        tags: parse_tags(
            &row.try_get::<String, _>("tags")
                .map_err(|error| redacted_store_error("failed to decode collection tags", error))?,
        )?,
        publish_status: row
            .try_get::<String, _>("publish_status")
            .map_err(|error| {
                redacted_store_error("failed to decode collection publish status", error)
            })?,
        status: row
            .try_get::<i32, _>("status")
            .map_err(|error| redacted_store_error("failed to decode collection status", error))?
            .into(),
    })
}

struct LockedCollection {
    collection_kind: String,
    name: String,
    summary: String,
    description: String,
    icon_ref: String,
    tags: Vec<String>,
    publish_status: String,
    status: i64,
}

async fn load_items_for_update(
    transaction: &mut Transaction<'_, Postgres>,
    subject: AdminCollectionSubject,
    collection_id: i64,
) -> DomainResult<Vec<AdminCollectionItemRecord>> {
    let rows = sqlx::query(COLLECTION_ITEMS_SQL)
        .bind(vec![collection_id])
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .fetch_all(&mut **transaction)
        .await
        .map_err(|error| redacted_store_error("failed to load collection items", error))?;
    rows.iter().map(item_from_row).collect()
}

fn item_snapshot(item: &AdminCollectionItemRecord) -> serde_json::Value {
    serde_json::json!({
        "id": item.id,
        "capabilityType": item.capability_type,
        "capabilityKey": item.capability_key,
        "capabilityName": item.capability_name,
        "capabilityVersion": item.capability_version,
        "enabled": item.enabled,
        "sortOrder": item.sort_order,
        "config": item.config,
    })
}

fn generated_collection_key(name: &str, id: i64) -> String {
    let slug = name
        .chars()
        .map(|ch| {
            if ch.is_ascii_alphanumeric() {
                ch.to_ascii_lowercase()
            } else {
                '-'
            }
        })
        .collect::<String>()
        .trim_matches('-')
        .chars()
        .take(60)
        .collect::<String>();
    if slug.is_empty() {
        format!("collection-{id}")
    } else {
        format!("{slug}-{id}")
    }
}

fn optional_status_int(status: Option<&str>) -> DomainResult<Option<i64>> {
    status.map(status_int).transpose()
}

fn status_int(status: &str) -> DomainResult<i64> {
    match status {
        "enabled" => Ok(1),
        "disabled" => Ok(0),
        other => Err(DomainError::bad_request(format!(
            "unsupported collection status: {other}"
        ))),
    }
}

fn parse_id(value: &str, field_name: &str) -> DomainResult<i64> {
    value
        .trim()
        .parse::<i64>()
        .map_err(|_| DomainError::bad_request(format!("{field_name} must be an int64 identifier")))
}

fn parse_tags(value: &str) -> DomainResult<Vec<String>> {
    if value.trim().is_empty() {
        return Ok(Vec::new());
    }
    serde_json::from_str::<Vec<String>>(value).map_err(|error| {
        tracing::error!(error = %error, "collection tags are not valid JSON");
        DomainError::new("collection tags could not be decoded")
    })
}

fn cell<T>(row: &sqlx::postgres::PgRow, column: &str) -> DomainResult<T>
where
    T: for<'r> sqlx::Decode<'r, Postgres> + sqlx::Type<Postgres>,
{
    row.try_get::<T, _>(column).map_err(|error| {
        tracing::error!(column, error = %error, "failed to decode collection column");
        DomainError::new(format!("collection {column} could not be decoded"))
    })
}

fn optional_cell<T>(row: &sqlx::postgres::PgRow, column: &str) -> DomainResult<Option<T>>
where
    T: for<'r> sqlx::Decode<'r, Postgres> + sqlx::Type<Postgres>,
{
    row.try_get::<Option<T>, _>(column).map_err(|error| {
        tracing::error!(column, error = %error, "failed to decode collection column");
        DomainError::new(format!("collection {column} could not be decoded"))
    })
}

use std::collections::{BTreeMap, HashSet};

use serde_json::{json, Map, Value};
use sqlx::{PgPool, Row};

use crate::application::c_category_type_scope;
use crate::domain::{DomainError, DomainResult};
use crate::infrastructure::sql::sql_admin_product_center::{
    drive_uri_from_resource, is_missing_table_error, is_unique_constraint_error, sql_error_message,
    stable_product_center_id,
};
use crate::ports::{
    AdminAttributeMutationCommand, AdminCatalogCollection, AdminCatalogFuture,
    AdminCatalogJsonRecord, AdminCatalogStore, AdminCatalogSubject,
    AdminCategoryAttributeMutationCommand, AdminCategoryMutationCommand, AdminCategorySeedBundle,
    AdminCategorySeedInitializeCommand, AdminCategorySeedInitializeSummary, AdminCategorySeedItem,
    AdminPriceListMutationCommand, AdminProductMutationCommand, AdminSkuMutationCommand,
    DeleteAdminCategoryAttributeCommand, DeleteAdminCategoryCommand, DeleteAdminProductCommand,
    DeleteAdminSkuCommand, ListAdminCatalogRecordsQuery,
};

#[derive(Debug, Clone)]
pub struct PostgresAdminCatalogStore {
    pool: PgPool,
}

impl PostgresAdminCatalogStore {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

impl AdminCatalogStore for PostgresAdminCatalogStore {
    fn list_categories<'a>(
        &'a self,
        query: ListAdminCatalogRecordsQuery,
    ) -> AdminCatalogFuture<'a, AdminCatalogCollection> {
        Box::pin(async move { list_categories(&self.pool, query).await })
    }

    fn create_category<'a>(
        &'a self,
        command: AdminCategoryMutationCommand,
    ) -> AdminCatalogFuture<'a, AdminCatalogJsonRecord> {
        Box::pin(async move { upsert_category(&self.pool, command, false).await })
    }

    fn update_category<'a>(
        &'a self,
        command: AdminCategoryMutationCommand,
    ) -> AdminCatalogFuture<'a, AdminCatalogJsonRecord> {
        Box::pin(async move { upsert_category(&self.pool, command, true).await })
    }

    fn delete_category<'a>(
        &'a self,
        command: DeleteAdminCategoryCommand,
    ) -> AdminCatalogFuture<'a, bool> {
        Box::pin(async move { delete_category(&self.pool, command).await })
    }

    fn initialize_category_seeds<'a>(
        &'a self,
        command: AdminCategorySeedInitializeCommand,
    ) -> AdminCatalogFuture<'a, Vec<AdminCategorySeedInitializeSummary>> {
        Box::pin(async move { initialize_category_seeds(&self.pool, command).await })
    }

    fn list_products<'a>(
        &'a self,
        query: ListAdminCatalogRecordsQuery,
    ) -> AdminCatalogFuture<'a, AdminCatalogCollection> {
        Box::pin(async move { list_products(&self.pool, query).await })
    }

    fn create_product<'a>(
        &'a self,
        command: AdminProductMutationCommand,
    ) -> AdminCatalogFuture<'a, AdminCatalogJsonRecord> {
        Box::pin(async move { upsert_product(&self.pool, command, false).await })
    }

    fn update_product<'a>(
        &'a self,
        command: AdminProductMutationCommand,
    ) -> AdminCatalogFuture<'a, AdminCatalogJsonRecord> {
        Box::pin(async move { upsert_product(&self.pool, command, true).await })
    }

    fn delete_product<'a>(
        &'a self,
        command: DeleteAdminProductCommand,
    ) -> AdminCatalogFuture<'a, bool> {
        Box::pin(async move { delete_product(&self.pool, command).await })
    }

    fn list_skus<'a>(
        &'a self,
        query: ListAdminCatalogRecordsQuery,
    ) -> AdminCatalogFuture<'a, AdminCatalogCollection> {
        Box::pin(async move { list_skus(&self.pool, query).await })
    }

    fn create_sku<'a>(
        &'a self,
        command: AdminSkuMutationCommand,
    ) -> AdminCatalogFuture<'a, AdminCatalogJsonRecord> {
        Box::pin(async move { upsert_sku(&self.pool, command, false).await })
    }

    fn update_sku<'a>(
        &'a self,
        command: AdminSkuMutationCommand,
    ) -> AdminCatalogFuture<'a, AdminCatalogJsonRecord> {
        Box::pin(async move { upsert_sku(&self.pool, command, true).await })
    }

    fn delete_sku<'a>(&'a self, command: DeleteAdminSkuCommand) -> AdminCatalogFuture<'a, bool> {
        Box::pin(async move { delete_sku(&self.pool, command).await })
    }

    fn list_attributes<'a>(
        &'a self,
        query: ListAdminCatalogRecordsQuery,
    ) -> AdminCatalogFuture<'a, AdminCatalogCollection> {
        Box::pin(async move { list_attributes(&self.pool, query).await })
    }

    fn create_attribute<'a>(
        &'a self,
        command: AdminAttributeMutationCommand,
    ) -> AdminCatalogFuture<'a, AdminCatalogJsonRecord> {
        Box::pin(async move { create_attribute(&self.pool, command).await })
    }

    fn list_category_attributes<'a>(
        &'a self,
        query: ListAdminCatalogRecordsQuery,
    ) -> AdminCatalogFuture<'a, AdminCatalogCollection> {
        Box::pin(async move { list_category_attributes(&self.pool, query).await })
    }

    fn create_category_attribute<'a>(
        &'a self,
        command: AdminCategoryAttributeMutationCommand,
    ) -> AdminCatalogFuture<'a, AdminCatalogJsonRecord> {
        Box::pin(async move { upsert_category_attribute(&self.pool, command, false).await })
    }

    fn update_category_attribute<'a>(
        &'a self,
        command: AdminCategoryAttributeMutationCommand,
    ) -> AdminCatalogFuture<'a, AdminCatalogJsonRecord> {
        Box::pin(async move { upsert_category_attribute(&self.pool, command, true).await })
    }

    fn delete_category_attribute<'a>(
        &'a self,
        command: DeleteAdminCategoryAttributeCommand,
    ) -> AdminCatalogFuture<'a, bool> {
        Box::pin(async move { delete_category_attribute(&self.pool, command).await })
    }

    fn list_price_lists<'a>(
        &'a self,
        query: ListAdminCatalogRecordsQuery,
    ) -> AdminCatalogFuture<'a, AdminCatalogCollection> {
        Box::pin(async move { list_price_lists(&self.pool, query).await })
    }

    fn create_price_list<'a>(
        &'a self,
        command: AdminPriceListMutationCommand,
    ) -> AdminCatalogFuture<'a, AdminCatalogJsonRecord> {
        Box::pin(async move { create_price_list(&self.pool, command).await })
    }
}

async fn list_categories(
    pool: &PgPool,
    query: ListAdminCatalogRecordsQuery,
) -> DomainResult<AdminCatalogCollection> {
    let rows = fetch_category_rows(pool, query.subject).await?;
    let rows_by_id = category_rows_by_id(&rows);
    let search = query
        .query_text
        .as_ref()
        .map(|value| value.to_ascii_lowercase());
    let mut filtered = rows
        .iter()
        .filter(|row| {
            query
                .parent_id
                .as_deref()
                .is_none_or(|parent_id| row.parent_id.as_deref() == Some(parent_id))
        })
        .filter(|row| {
            query
                .status
                .as_deref()
                .is_none_or(|status| row.status == status)
        })
        .filter(|row| {
            search.as_deref().is_none_or(|search| {
                row.category_no.to_ascii_lowercase().contains(search)
                    || row.name.to_ascii_lowercase().contains(search)
            })
        })
        .collect::<Vec<_>>();
    filtered.sort_by(|left, right| {
        left.sort_order
            .cmp(&right.sort_order)
            .then_with(|| left.category_no.cmp(&right.category_no))
    });
    let total = filtered.len() as i64;
    let items = filtered
        .into_iter()
        .skip(query.offset.max(0) as usize)
        .take(query.page_size.max(0) as usize)
        .map(|row| category_record(row, &rows_by_id))
        .collect::<DomainResult<Vec<_>>>()?;
    Ok(collection(items, total, &query))
}

#[derive(Debug, Clone)]
struct CategoryListRow {
    id: String,
    category_no: String,
    parent_id: Option<String>,
    name: String,
    status: String,
    sort_order: i64,
    created_at: String,
    updated_at: String,
}

async fn fetch_category_rows(
    pool: &PgPool,
    subject: AdminCatalogSubject,
) -> DomainResult<Vec<CategoryListRow>> {
    let rows = sqlx::query(
        r#"
        SELECT
            id,
            category_no,
            parent_category_id,
            name,
            status,
            sort_weight,
            created_at,
            updated_at
        FROM commerce_product_category
        WHERE tenant_id = $1::text
          AND (organization_id = $2::text OR organization_id IS NULL)
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .fetch_all(pool)
    .await
    .map_err(store_error)?;

    rows.iter()
        .map(|row| {
            Ok(CategoryListRow {
                id: string_cell(row, "id")?,
                category_no: string_cell(row, "category_no")?,
                parent_id: optional_string_cell(row, "parent_category_id")?,
                name: string_cell(row, "name")?,
                status: string_cell(row, "status")?,
                sort_order: integer_cell(row, "sort_weight")?,
                created_at: string_cell(row, "created_at")?,
                updated_at: string_cell(row, "updated_at")?,
            })
        })
        .collect()
}

fn category_rows_by_id(rows: &[CategoryListRow]) -> BTreeMap<String, CategoryListRow> {
    rows.iter()
        .map(|row| (row.id.clone(), row.clone()))
        .collect::<BTreeMap<_, _>>()
}

fn category_record(
    row: &CategoryListRow,
    rows_by_id: &BTreeMap<String, CategoryListRow>,
) -> DomainResult<AdminCatalogJsonRecord> {
    let (path, level_no) = category_path(row, rows_by_id)?;
    let mut item = Map::new();
    insert_string(&mut item, "id", row.id.clone());
    insert_string(&mut item, "categoryNo", row.category_no.clone());
    insert_optional_string(&mut item, "parentId", row.parent_id.clone());
    insert_string(&mut item, "name", row.name.clone());
    insert_string(&mut item, "path", path);
    insert_integer(&mut item, "levelNo", level_no);
    insert_string(&mut item, "status", row.status.clone());
    insert_integer(&mut item, "sortOrder", row.sort_order);
    insert_string(&mut item, "createdAt", row.created_at.clone());
    insert_string(&mut item, "updatedAt", row.updated_at.clone());
    Ok(item)
}

fn category_path(
    row: &CategoryListRow,
    rows_by_id: &BTreeMap<String, CategoryListRow>,
) -> DomainResult<(String, i64)> {
    let mut category_numbers = vec![row.category_no.clone()];
    let mut current_parent = row.parent_id.as_deref();
    let mut visited = HashSet::new();
    visited.insert(row.id.as_str());
    while let Some(parent_id) = current_parent {
        if !visited.insert(parent_id) {
            return Err(DomainError::conflict(
                "product category parent cycle was detected",
            ));
        }
        let Some(parent) = rows_by_id.get(parent_id) else {
            break;
        };
        category_numbers.push(parent.category_no.clone());
        current_parent = parent.parent_id.as_deref();
    }
    category_numbers.reverse();
    let level_no = category_numbers.len().saturating_sub(1) as i64;
    Ok((category_numbers.join("/"), level_no))
}

async fn upsert_category(
    pool: &PgPool,
    command: AdminCategoryMutationCommand,
    is_update: bool,
) -> DomainResult<AdminCatalogJsonRecord> {
    let category_id = command.category_id.clone().unwrap_or_else(|| {
        stable_product_center_id(
            "catalog-category",
            &[
                &command.subject.tenant_id.to_string(),
                &command.subject.organization_id.to_string(),
                &command.category_no,
            ],
        )
    });
    ensure_category_parent_allowed(pool, &command, &category_id).await?;
    if is_update {
        let result = sqlx::query(
            r#"
            UPDATE commerce_product_category
            SET category_no = $1,
                parent_category_id = $2,
                name = $3,
                sort_weight = $4,
                status = $5,
                updated_at = $6
            WHERE id = $7
              AND tenant_id = $8::text
              AND (organization_id = $9::text OR organization_id IS NULL)
            "#,
        )
        .bind(&command.category_no)
        .bind(command.parent_id.as_deref())
        .bind(&command.name)
        .bind(command.sort_order)
        .bind(&command.status)
        .bind(&command.requested_at)
        .bind(&category_id)
        .bind(command.subject.tenant_id)
        .bind(command.subject.organization_id)
        .execute(pool)
        .await
        .map_err(|error| write_error("failed to update product category", error))?;
        if result.rows_affected() == 0 {
            return Err(DomainError::not_found("product category was not found"));
        }
    } else {
        sqlx::query(
            r#"
            INSERT INTO commerce_product_category
                (id, tenant_id, organization_id, category_no, parent_category_id, name, sort_weight, status, created_at, updated_at)
            VALUES
                ($1, $2::text, $3::text, $4, $5, $6, $7, $8, $9, $9)
            ON CONFLICT (tenant_id, category_no) DO UPDATE SET
                parent_category_id = EXCLUDED.parent_category_id,
                name = EXCLUDED.name,
                sort_weight = EXCLUDED.sort_weight,
                status = EXCLUDED.status,
                updated_at = EXCLUDED.updated_at
            "#,
        )
        .bind(&category_id)
        .bind(command.subject.tenant_id)
        .bind(command.subject.organization_id)
        .bind(&command.category_no)
        .bind(command.parent_id.as_deref())
        .bind(&command.name)
        .bind(command.sort_order)
        .bind(&command.status)
        .bind(&command.requested_at)
        .execute(pool)
        .await
        .map_err(|error| write_error("failed to create product category", error))?;
    }
    load_category(pool, command.subject, &category_id).await
}

async fn ensure_category_parent_allowed(
    pool: &PgPool,
    command: &AdminCategoryMutationCommand,
    category_id: &str,
) -> DomainResult<()> {
    let Some(parent_id) = command.parent_id.as_deref() else {
        return Ok(());
    };
    if parent_id == category_id {
        return Err(DomainError::conflict(
            "product category cannot use itself as parent",
        ));
    }
    let rows = fetch_category_rows(pool, command.subject).await?;
    let rows_by_id = category_rows_by_id(&rows);
    if !rows_by_id.contains_key(parent_id) {
        return Err(DomainError::conflict(
            "product category parent was not found",
        ));
    }
    let mut visited = HashSet::new();
    let mut current = Some(parent_id);
    while let Some(id) = current {
        if id == category_id {
            return Err(DomainError::conflict(
                "product category parent would create a cycle",
            ));
        }
        if !visited.insert(id) {
            return Err(DomainError::conflict(
                "product category parent cycle was detected",
            ));
        }
        current = rows_by_id.get(id).and_then(|row| row.parent_id.as_deref());
    }
    Ok(())
}

async fn delete_category(pool: &PgPool, command: DeleteAdminCategoryCommand) -> DomainResult<bool> {
    let child_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM commerce_product_category
        WHERE tenant_id = $1::text
          AND (organization_id = $2::text OR organization_id IS NULL)
          AND parent_category_id = $3
          AND status <> 'archived'
        "#,
    )
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(&command.category_id)
    .fetch_one(pool)
    .await
    .map_err(store_error)?;
    if child_count > 0 {
        return Err(DomainError::conflict(
            "product category still has child categories",
        ));
    }
    let product_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM commerce_product_spu_category pc
        JOIN commerce_product_spu p
          ON p.tenant_id = pc.tenant_id
         AND p.id = pc.spu_id
        WHERE pc.tenant_id = $1::text
          AND (pc.organization_id = $2::text OR pc.organization_id IS NULL)
          AND pc.category_id = $3
          AND pc.status = 'active'
          AND p.sales_status <> 'archived'
        "#,
    )
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(&command.category_id)
    .fetch_one(pool)
    .await
    .map_err(store_error)?;
    if product_count > 0 {
        return Err(DomainError::conflict(
            "product category still has active products",
        ));
    }
    let result = sqlx::query(
        r#"
        UPDATE commerce_product_category
        SET status = 'archived',
            updated_at = $1
        WHERE id = $2
          AND tenant_id = $3::text
          AND (organization_id = $4::text OR organization_id IS NULL)
        "#,
    )
    .bind(&command.requested_at)
    .bind(&command.category_id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .execute(pool)
    .await
    .map_err(store_error)?;
    if result.rows_affected() == 0 {
        return Err(DomainError::not_found("product category was not found"));
    }
    Ok(true)
}

async fn initialize_category_seeds(
    pool: &PgPool,
    command: AdminCategorySeedInitializeCommand,
) -> DomainResult<Vec<AdminCategorySeedInitializeSummary>> {
    let _request_context = (
        command.datasets.as_slice(),
        command.mode.as_str(),
        command.idempotency_key.as_str(),
        command.request_id.as_str(),
    );
    let mut summaries = Vec::with_capacity(command.bundles.len());
    for bundle in command.bundles {
        let summary = match bundle.target.as_str() {
            "commerce_product_category" => {
                import_product_category_seed(pool, command.subject, &command.requested_at, &bundle)
                    .await?
            }
            "c_category" => import_c_category_seed(pool, &command.requested_at, &bundle).await?,
            target => {
                return Err(DomainError::new(format!(
                    "unsupported category seed target {target}"
                )))
            }
        };
        summaries.push(summary);
    }
    Ok(summaries)
}

async fn import_product_category_seed(
    pool: &PgPool,
    subject: AdminCatalogSubject,
    requested_at: &str,
    bundle: &AdminCategorySeedBundle,
) -> DomainResult<AdminCategorySeedInitializeSummary> {
    let category_ids = bundle
        .categories
        .iter()
        .map(|item| {
            let category_no = required_seed_text(item.category_no.as_deref(), "categoryNo")?;
            Ok((
                category_no.to_owned(),
                stable_product_center_id(
                    "catalog-category",
                    &[
                        &subject.tenant_id.to_string(),
                        &subject.organization_id.to_string(),
                        category_no,
                    ],
                ),
            ))
        })
        .collect::<DomainResult<BTreeMap<_, _>>>()?;

    let mut upserted = 0_i64;
    for item in &bundle.categories {
        let category_no = required_seed_text(item.category_no.as_deref(), "categoryNo")?;
        let category_id = category_ids
            .get(category_no)
            .cloned()
            .ok_or_else(|| DomainError::new("category seed id map is incomplete"))?;
        let parent_id = item
            .parent_category_no
            .as_deref()
            .map(|parent_no| {
                category_ids.get(parent_no).cloned().ok_or_else(|| {
                    DomainError::new(format!(
                        "category seed parentCategoryNo {parent_no} was not found"
                    ))
                })
            })
            .transpose()?;
        let status = seed_status_text(item, "active");
        sqlx::query(
            r#"
            INSERT INTO commerce_product_category
                (id, tenant_id, organization_id, category_no, parent_category_id, name, sort_weight, status, created_at, updated_at)
            VALUES
                ($1, $2::text, $3::text, $4, $5, $6, $7, $8, $9, $9)
            ON CONFLICT (tenant_id, category_no) DO UPDATE SET
                parent_category_id = EXCLUDED.parent_category_id,
                name = EXCLUDED.name,
                sort_weight = EXCLUDED.sort_weight,
                status = EXCLUDED.status,
                updated_at = EXCLUDED.updated_at
            "#,
        )
        .bind(&category_id)
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(category_no)
        .bind(parent_id.as_deref())
        .bind(&item.name)
        .bind(item.sort_order.or(item.sort_weight).unwrap_or(0))
        .bind(status)
        .bind(requested_at)
        .execute(pool)
        .await
        .map_err(|error| write_error("failed to import product category seed", error))?;
        upserted += 1;
    }
    Ok(seed_summary(bundle, upserted, 0))
}

async fn import_c_category_seed(
    pool: &PgPool,
    requested_at: &str,
    bundle: &AdminCategorySeedBundle,
) -> DomainResult<AdminCategorySeedInitializeSummary> {
    let legacy_category_type = bundle
        .category_type
        .ok_or_else(|| DomainError::new("c_category seed requires categoryType"))?;
    let category_type = c_category_type_scope(
        legacy_category_type,
        bundle.dataset.as_str(),
        bundle.group_name.as_deref(),
    )?;
    let id_by_code = bundle
        .categories
        .iter()
        .map(|item| {
            let id = seed_item_id(item)?;
            let code = required_seed_text(item.code.as_deref(), "code")?;
            Ok((code.to_owned(), id))
        })
        .collect::<DomainResult<BTreeMap<_, _>>>()?;

    let mut upserted = 0_i64;
    for item in &bundle.categories {
        let id = seed_item_id(item)?;
        let uuid = required_seed_text(item.uuid.as_deref(), "uuid")?;
        let code = required_seed_text(item.code.as_deref(), "code")?;
        let parent_id = item
            .parent_code
            .as_deref()
            .map(|parent_code| {
                id_by_code.get(parent_code).copied().ok_or_else(|| {
                    DomainError::new(format!(
                        "category seed parentCode {parent_code} was not found"
                    ))
                })
            })
            .transpose()?;
        let description = item.description.as_deref().unwrap_or_default();
        let tags = json_string(&item.tags);
        let path = item
            .path
            .clone()
            .unwrap_or_else(|| format!("/{}/{}", bundle.dataset, code));
        sqlx::query(
            r#"
            INSERT INTO c_category
                (id, uuid, tenant_id, organization_id, data_scope, category_type, name, description, code, tags, icon_drive_uri, icon_resource_snapshot, sort_weight, parent_id, path, visible, status, created_at, updated_at)
            VALUES
                ($1, $2, 0, 0, 0, $3, $4, $5, $6, $7::jsonb, NULL, NULL, $8, $9, $10, $11, $12, $13, $13)
            ON CONFLICT (id) DO UPDATE SET
                uuid = EXCLUDED.uuid,
                category_type = EXCLUDED.category_type,
                name = EXCLUDED.name,
                description = EXCLUDED.description,
                code = EXCLUDED.code,
                tags = EXCLUDED.tags,
                sort_weight = EXCLUDED.sort_weight,
                parent_id = EXCLUDED.parent_id,
                path = EXCLUDED.path,
                visible = EXCLUDED.visible,
                status = EXCLUDED.status,
                updated_at = EXCLUDED.updated_at
            "#,
        )
        .bind(id)
        .bind(uuid)
        .bind(category_type)
        .bind(&item.name)
        .bind(description)
        .bind(code)
        .bind(tags)
        .bind(item.sort_weight.or(item.sort_order).unwrap_or(0))
        .bind(parent_id)
        .bind(path)
        .bind(item.visible.unwrap_or(true))
        .bind(seed_status_i64(item, 1))
        .bind(requested_at)
        .execute(pool)
        .await
        .map_err(|error| write_error("failed to import c_category seed", error))?;
        upserted += 1;
    }
    Ok(seed_summary(bundle, upserted, 0))
}

fn seed_summary(
    bundle: &AdminCategorySeedBundle,
    upserted: i64,
    skipped: i64,
) -> AdminCategorySeedInitializeSummary {
    AdminCategorySeedInitializeSummary {
        dataset: bundle.dataset.clone(),
        target_table: bundle.target.clone(),
        requested: bundle.categories.len() as i64,
        upserted,
        skipped,
        install_default_enabled: bundle.install_policy.default_enabled,
        config_key: bundle.install_policy.config_key.clone(),
    }
}

fn required_seed_text<'a>(value: Option<&'a str>, field_name: &str) -> DomainResult<&'a str> {
    value
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| DomainError::new(format!("category seed {field_name} is required")))
}

fn seed_item_id(item: &AdminCategorySeedItem) -> DomainResult<i64> {
    item.id
        .as_ref()
        .and_then(|value| match value {
            Value::Number(number) => number.as_i64(),
            Value::String(text) => text.trim().parse::<i64>().ok(),
            _ => None,
        })
        .ok_or_else(|| DomainError::new("category seed id is required"))
}

fn seed_status_text(item: &AdminCategorySeedItem, fallback: &str) -> String {
    item.status
        .as_ref()
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or(fallback)
        .to_owned()
}

fn seed_status_i64(item: &AdminCategorySeedItem, fallback: i64) -> i64 {
    item.status
        .as_ref()
        .and_then(|value| match value {
            Value::Number(number) => number.as_i64(),
            Value::String(text) => text.trim().parse::<i64>().ok(),
            _ => None,
        })
        .unwrap_or(fallback)
}

async fn list_products(
    pool: &PgPool,
    query: ListAdminCatalogRecordsQuery,
) -> DomainResult<AdminCatalogCollection> {
    let search = query.query_text.as_ref().map(|value| format!("%{value}%"));
    let rows = sqlx::query(
        r#"
        SELECT
            p.id,
            p.spu_no,
            p.product_type,
            p.title,
            p.subtitle,
            p.description,
            (
                SELECT STRING_AGG(pc.category_id, ',' ORDER BY pc.primary_flag DESC, pc.sort_order ASC, pc.category_id ASC)
                FROM commerce_product_spu_category pc
                WHERE pc.tenant_id = p.tenant_id
                  AND pc.spu_id = p.id
                  AND (pc.organization_id = p.organization_id OR pc.organization_id IS NULL OR p.organization_id IS NULL)
                  AND pc.status = 'active'
            ) AS category_ids,
            p.sales_status,
            p.created_at,
            p.updated_at,
            (SELECT s.id FROM commerce_product_sku s WHERE s.tenant_id = p.tenant_id AND s.spu_id = p.id ORDER BY s.price_amount::numeric ASC, s.id ASC LIMIT 1) AS default_sku_id,
            (SELECT s.price_amount FROM commerce_product_sku s WHERE s.tenant_id = p.tenant_id AND s.spu_id = p.id ORDER BY s.price_amount::numeric ASC, s.id ASC LIMIT 1) AS min_price_amount,
            (SELECT s.currency_code FROM commerce_product_sku s WHERE s.tenant_id = p.tenant_id AND s.spu_id = p.id ORDER BY s.price_amount::numeric ASC, s.id ASC LIMIT 1) AS currency_code,
            COUNT(*) OVER() AS total
        FROM commerce_product_spu p
        WHERE p.tenant_id = $1::text
          AND (p.organization_id = $2::text OR p.organization_id IS NULL)
          AND ($3 IS NULL OR p.sales_status = $3)
          AND ($4 IS NULL OR EXISTS (
              SELECT 1
              FROM commerce_product_spu_category pc
              WHERE pc.tenant_id = p.tenant_id
                AND pc.spu_id = p.id
                AND (pc.organization_id = p.organization_id OR pc.organization_id IS NULL OR p.organization_id IS NULL)
                AND pc.category_id = $4
                AND pc.status = 'active'
          ))
          AND ($5 IS NULL OR p.product_type = $5)
          AND ($6 IS NULL OR p.id LIKE $6 OR p.title LIKE $6 OR p.spu_no LIKE $6)
        ORDER BY p.updated_at DESC, p.id DESC
        LIMIT $7 OFFSET $8
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.status.as_deref())
    .bind(query.category_id.as_deref())
    .bind(query.product_type.as_deref())
    .bind(search.as_deref())
    .bind(query.page_size)
    .bind(query.offset)
    .fetch_all(pool)
    .await
    .map_err(store_error)?;
    let total = rows
        .first()
        .map(|row| integer_cell(row, "total"))
        .transpose()?
        .unwrap_or(0);
    let mut items = Vec::with_capacity(rows.len());
    for row in rows {
        items.push(product_record_from_row(&row)?);
    }
    Ok(collection(items, total, &query))
}

async fn upsert_product(
    pool: &PgPool,
    command: AdminProductMutationCommand,
    is_update: bool,
) -> DomainResult<AdminCatalogJsonRecord> {
    let product_id = command.product_id.clone().unwrap_or_else(|| {
        stable_product_center_id(
            "catalog-product",
            &[
                &command.subject.tenant_id.to_string(),
                &command.subject.organization_id.to_string(),
                &command.spu_no,
            ],
        )
    });
    let mut tx = pool.begin().await.map_err(store_error)?;
    if is_update {
        let result = sqlx::query(
            r#"
            UPDATE commerce_product_spu
            SET spu_no = $1,
                title = $2,
                subtitle = $3,
                description = $4,
                product_type = $5,
                sales_status = $6,
                updated_at = $7
            WHERE id = $8
              AND tenant_id = $9::text
              AND (organization_id = $10::text OR organization_id IS NULL)
            "#,
        )
        .bind(&command.spu_no)
        .bind(&command.title)
        .bind(command.subtitle.as_deref())
        .bind(command.description.as_deref())
        .bind(&command.product_type)
        .bind(&command.status)
        .bind(&command.requested_at)
        .bind(&product_id)
        .bind(command.subject.tenant_id)
        .bind(command.subject.organization_id)
        .execute(&mut *tx)
        .await
        .map_err(|error| write_error("failed to update product", error))?;
        if result.rows_affected() == 0 {
            return Err(DomainError::not_found("product was not found"));
        }
    } else {
        sqlx::query(
            r#"
            INSERT INTO commerce_product_spu
                (id, tenant_id, organization_id, spu_no, title, subtitle, description, product_type, sales_status, visible_surfaces, created_at, updated_at)
            VALUES
                ($1, $2::text, $3::text, $4, $5, $6, $7, $8, $9, '["backend","app"]', $10, $10)
            ON CONFLICT (tenant_id, spu_no) DO UPDATE SET
                title = EXCLUDED.title,
                subtitle = EXCLUDED.subtitle,
                description = EXCLUDED.description,
                product_type = EXCLUDED.product_type,
                sales_status = EXCLUDED.sales_status,
                updated_at = EXCLUDED.updated_at
            "#,
        )
        .bind(&product_id)
        .bind(command.subject.tenant_id)
        .bind(command.subject.organization_id)
        .bind(&command.spu_no)
        .bind(&command.title)
        .bind(command.subtitle.as_deref())
        .bind(command.description.as_deref())
        .bind(&command.product_type)
        .bind(&command.status)
        .bind(&command.requested_at)
        .execute(&mut *tx)
        .await
        .map_err(|error| write_error("failed to create product", error))?;
    }
    replace_product_categories(&mut tx, &product_id, &command).await?;
    tx.commit().await.map_err(store_error)?;
    load_product(pool, command.subject, &product_id).await
}

async fn replace_product_categories(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    product_id: &str,
    command: &AdminProductMutationCommand,
) -> DomainResult<()> {
    sqlx::query(
        r#"
        DELETE FROM commerce_product_spu_category
        WHERE tenant_id = $1::text
          AND spu_id = $2
        "#,
    )
    .bind(command.subject.tenant_id)
    .bind(product_id)
    .execute(&mut **tx)
    .await
    .map_err(store_error)?;

    for (index, category_id) in command.category_ids.iter().enumerate() {
        let row_id = stable_product_center_id(
            "spu-category",
            &[
                &command.subject.tenant_id.to_string(),
                product_id,
                category_id,
            ],
        );
        sqlx::query(
            r#"
            INSERT INTO commerce_product_spu_category
                (id, tenant_id, organization_id, spu_id, category_id, primary_flag, sort_order, status, created_at, updated_at)
            VALUES
                ($1, $2::text, $3::text, $4, $5, $6, $7, 'active', $8, $8)
            ON CONFLICT (tenant_id, spu_id, category_id) DO UPDATE SET
                organization_id = EXCLUDED.organization_id,
                primary_flag = EXCLUDED.primary_flag,
                sort_order = EXCLUDED.sort_order,
                status = EXCLUDED.status,
                updated_at = EXCLUDED.updated_at
            "#,
        )
        .bind(row_id)
        .bind(command.subject.tenant_id)
        .bind(command.subject.organization_id)
        .bind(product_id)
        .bind(category_id)
        .bind(if index == 0 { 1 } else { 0 })
        .bind(index as i64)
        .bind(&command.requested_at)
        .execute(&mut **tx)
        .await
        .map_err(|error| write_error("failed to update product categories", error))?;
    }
    Ok(())
}

async fn delete_product(pool: &PgPool, command: DeleteAdminProductCommand) -> DomainResult<bool> {
    let mut tx = pool.begin().await.map_err(store_error)?;
    let product_result = sqlx::query(
        r#"
        UPDATE commerce_product_spu
        SET sales_status = 'archived',
            updated_at = $1
        WHERE id = $2
          AND tenant_id = $3::text
          AND (organization_id = $4::text OR organization_id IS NULL)
        "#,
    )
    .bind(&command.requested_at)
    .bind(&command.product_id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .execute(&mut *tx)
    .await
    .map_err(store_error)?;
    if product_result.rows_affected() == 0 {
        return Err(DomainError::not_found("product was not found"));
    }
    sqlx::query(
        r#"
        UPDATE commerce_product_sku
        SET sales_status = 'archived',
            updated_at = $1
        WHERE spu_id = $2
          AND tenant_id = $3::text
          AND (organization_id = $4::text OR organization_id IS NULL)
        "#,
    )
    .bind(&command.requested_at)
    .bind(&command.product_id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .execute(&mut *tx)
    .await
    .map_err(store_error)?;
    tx.commit().await.map_err(store_error)?;
    Ok(true)
}

async fn list_skus(
    pool: &PgPool,
    query: ListAdminCatalogRecordsQuery,
) -> DomainResult<AdminCatalogCollection> {
    let rows = sqlx::query(
        r#"
        SELECT
            s.id,
            s.sku_no,
            s.spu_id,
            s.title,
            s.delivery_mode,
            s.price_amount,
            s.currency_code,
            s.sales_status,
            s.spec_json,
            s.created_at,
            s.updated_at,
            COUNT(*) OVER() AS total
        FROM commerce_product_sku s
        JOIN commerce_product_spu p
          ON p.tenant_id = s.tenant_id
         AND p.id = s.spu_id
        WHERE s.tenant_id = $1::text
          AND (s.organization_id = $2::text OR s.organization_id IS NULL)
          AND ($3 IS NULL OR s.spu_id = $3)
          AND ($4 IS NULL OR s.delivery_mode = $4)
          AND ($5 IS NULL OR s.sales_status = $5)
        ORDER BY s.updated_at DESC, s.id DESC
        LIMIT $6 OFFSET $7
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.product_id.as_deref())
    .bind(query.fulfillment_type.as_deref())
    .bind(query.status.as_deref())
    .bind(query.page_size)
    .bind(query.offset)
    .fetch_all(pool)
    .await
    .map_err(store_error)?;
    let total = rows
        .first()
        .map(|row| integer_cell(row, "total"))
        .transpose()?
        .unwrap_or(0);
    let mut items = Vec::with_capacity(rows.len());
    for row in rows {
        items.push(sku_record_from_row(pool, query.subject, &row).await?);
    }
    Ok(collection(items, total, &query))
}

async fn upsert_sku(
    pool: &PgPool,
    command: AdminSkuMutationCommand,
    is_update: bool,
) -> DomainResult<AdminCatalogJsonRecord> {
    let sku_id = command.sku_id.clone().unwrap_or_else(|| {
        stable_product_center_id(
            "catalog-sku",
            &[
                &command.subject.tenant_id.to_string(),
                &command.subject.organization_id.to_string(),
                &command.sku_no,
            ],
        )
    });
    let price_amount = command.default_price_amount.as_deref().unwrap_or("0");
    let currency_code = command.default_currency_code.as_deref().unwrap_or("USD");
    let spec_json = json!({
        "taxCategory": command.tax_category,
        "salesUnit": command.sales_unit,
        "barcode": command.barcode,
    })
    .to_string();
    let mut tx = pool.begin().await.map_err(store_error)?;
    if is_update {
        let result = sqlx::query(
            r#"
            UPDATE commerce_product_sku
            SET sku_no = $1,
                spu_id = $2,
                name = $3,
                title = $3,
                price_amount = $4,
                currency_code = $5,
                delivery_mode = $6,
                inventory_tracking = $7,
                sales_status = $8,
                spec_json = $9,
                updated_at = $10
            WHERE id = $11
              AND tenant_id = $12::text
              AND (organization_id = $13::text OR organization_id IS NULL)
            "#,
        )
        .bind(&command.sku_no)
        .bind(&command.product_id)
        .bind(&command.title)
        .bind(price_amount)
        .bind(currency_code)
        .bind(&command.fulfillment_type)
        .bind(inventory_tracking(&command.fulfillment_type))
        .bind(&command.status)
        .bind(&spec_json)
        .bind(&command.requested_at)
        .bind(&sku_id)
        .bind(command.subject.tenant_id)
        .bind(command.subject.organization_id)
        .execute(&mut *tx)
        .await
        .map_err(|error| write_error("failed to update sku", error))?;
        if result.rows_affected() == 0 {
            return Err(DomainError::not_found("sku was not found"));
        }
    } else {
        sqlx::query(
            r#"
            INSERT INTO commerce_product_sku
                (id, tenant_id, organization_id, spu_id, sku_no, name, title, price_amount, original_price_amount, currency_code, delivery_mode, inventory_tracking, sales_status, spec_json, created_at, updated_at)
            VALUES
                ($1, $2::text, $3::text, $4, $5, $6, $6, $7, NULL, $8, $9, $10, $11, $12, $13, $13)
            ON CONFLICT (tenant_id, sku_no) DO UPDATE SET
                spu_id = EXCLUDED.spu_id,
                name = EXCLUDED.name,
                title = EXCLUDED.title,
                price_amount = EXCLUDED.price_amount,
                currency_code = EXCLUDED.currency_code,
                delivery_mode = EXCLUDED.delivery_mode,
                inventory_tracking = EXCLUDED.inventory_tracking,
                sales_status = EXCLUDED.sales_status,
                spec_json = EXCLUDED.spec_json,
                updated_at = EXCLUDED.updated_at
            "#,
        )
        .bind(&sku_id)
        .bind(command.subject.tenant_id)
        .bind(command.subject.organization_id)
        .bind(&command.product_id)
        .bind(&command.sku_no)
        .bind(&command.title)
        .bind(price_amount)
        .bind(currency_code)
        .bind(&command.fulfillment_type)
        .bind(inventory_tracking(&command.fulfillment_type))
        .bind(&command.status)
        .bind(&spec_json)
        .bind(&command.requested_at)
        .execute(&mut *tx)
        .await
        .map_err(|error| write_error("failed to create sku", error))?;
    }
    replace_sku_attributes(&mut tx, &sku_id, &command).await?;
    replace_sku_image(&mut tx, &sku_id, &command).await?;
    tx.commit().await.map_err(store_error)?;
    load_sku(pool, command.subject, &sku_id).await
}

async fn delete_sku(pool: &PgPool, command: DeleteAdminSkuCommand) -> DomainResult<bool> {
    let result = sqlx::query(
        r#"
        UPDATE commerce_product_sku
        SET sales_status = 'archived',
            updated_at = $1
        WHERE id = $2
          AND tenant_id = $3::text
          AND (organization_id = $4::text OR organization_id IS NULL)
        "#,
    )
    .bind(&command.requested_at)
    .bind(&command.sku_id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .execute(pool)
    .await
    .map_err(store_error)?;
    if result.rows_affected() == 0 {
        return Err(DomainError::not_found("sku was not found"));
    }
    Ok(true)
}

async fn replace_sku_attributes(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    sku_id: &str,
    command: &AdminSkuMutationCommand,
) -> DomainResult<()> {
    sqlx::query(
        r#"
        DELETE FROM commerce_product_sku_attribute
        WHERE tenant_id = $1::text
          AND sku_id = $2
        "#,
    )
    .bind(command.subject.tenant_id)
    .bind(sku_id)
    .execute(&mut **tx)
    .await
    .map_err(store_error)?;

    for attribute in &command.attributes {
        let attribute_value_id = attribute.attribute_value_id.as_deref();
        if attribute_value_id.is_none() && attribute.custom_value.is_none() {
            continue;
        }
        let row_id = stable_product_center_id(
            "sku-attribute",
            &[
                &command.subject.tenant_id.to_string(),
                sku_id,
                &attribute.attribute_id,
            ],
        );
        sqlx::query(
            r#"
            INSERT INTO commerce_product_sku_attribute
                (id, tenant_id, organization_id, sku_id, attribute_id, attribute_value_id, custom_value, created_at, updated_at)
            VALUES
                ($1, $2::text, $3::text, $4, $5, $6, $7, $8, $8)
            ON CONFLICT (tenant_id, sku_id, attribute_id) DO UPDATE SET
                organization_id = EXCLUDED.organization_id,
                attribute_value_id = EXCLUDED.attribute_value_id,
                custom_value = EXCLUDED.custom_value,
                updated_at = EXCLUDED.updated_at
            "#,
        )
        .bind(row_id)
        .bind(command.subject.tenant_id)
        .bind(command.subject.organization_id)
        .bind(sku_id)
        .bind(&attribute.attribute_id)
        .bind(attribute_value_id)
        .bind(attribute.custom_value.as_deref())
        .bind(&command.requested_at)
        .execute(&mut **tx)
        .await
        .map_err(|error| write_error("failed to update sku attributes", error))?;
    }
    Ok(())
}

async fn replace_sku_image(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    sku_id: &str,
    command: &AdminSkuMutationCommand,
) -> DomainResult<()> {
    sqlx::query(
        r#"
        DELETE FROM commerce_product_media
        WHERE tenant_id = $1::text
          AND owner_type = 'sku'
          AND owner_id = $2
          AND media_role = 'sku_image'
        "#,
    )
    .bind(command.subject.tenant_id)
    .bind(sku_id)
    .execute(&mut **tx)
    .await
    .map_err(store_error)?;

    let Some(image) = &command.image else {
        return Ok(());
    };
    let media_id = stable_product_center_id(
        "product-media",
        &[
            &command.subject.tenant_id.to_string(),
            "sku",
            sku_id,
            "sku_image",
        ],
    );
    let drive_uri = drive_uri_from_resource(image);
    let alt_text = image
        .get("altText")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty());
    sqlx::query(
        r#"
        INSERT INTO commerce_product_media
            (id, tenant_id, organization_id, owner_type, owner_id, media_role, drive_uri, resource_snapshot, alt_text, sort_order, status, created_at, updated_at)
        VALUES
            ($1, $2::text, $3::text, 'sku', $4, 'sku_image', $5, $6, $7, 0, 'active', $8, $8)
        ON CONFLICT (tenant_id, owner_type, owner_id, media_role, sort_order) DO UPDATE SET
            drive_uri = EXCLUDED.drive_uri,
            resource_snapshot = EXCLUDED.resource_snapshot,
            alt_text = EXCLUDED.alt_text,
            status = EXCLUDED.status,
            updated_at = EXCLUDED.updated_at
        "#,
    )
    .bind(media_id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(sku_id)
    .bind(drive_uri)
    .bind(image)
    .bind(alt_text)
    .bind(&command.requested_at)
    .execute(&mut **tx)
    .await
    .map_err(|error| write_error("failed to update sku image", error))?;
    Ok(())
}

async fn list_attributes(
    pool: &PgPool,
    query: ListAdminCatalogRecordsQuery,
) -> DomainResult<AdminCatalogCollection> {
    let rows = sqlx::query(
        r#"
        SELECT
            id,
            attribute_no,
            name,
            value_type,
            status,
            COUNT(*) OVER() AS total
        FROM commerce_product_attribute
        WHERE tenant_id = $1::text
          AND (organization_id = $2::text OR organization_id IS NULL)
          AND ($3 IS NULL OR status = $3)
        ORDER BY sort_weight ASC, attribute_no ASC
        LIMIT $4 OFFSET $5
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.status.as_deref())
    .bind(query.page_size)
    .bind(query.offset)
    .fetch_all(pool)
    .await
    .map_err(store_error)?;
    let total = rows
        .first()
        .map(|row| integer_cell(row, "total"))
        .transpose()?
        .unwrap_or(0);
    let mut items = Vec::with_capacity(rows.len());
    for row in rows {
        let mut item = Map::new();
        insert_string(&mut item, "id", string_cell(&row, "id")?);
        insert_string(&mut item, "attributeNo", string_cell(&row, "attribute_no")?);
        insert_string(&mut item, "name", string_cell(&row, "name")?);
        insert_string(&mut item, "valueType", string_cell(&row, "value_type")?);
        insert_string(&mut item, "scope", "both");
        insert_bool(&mut item, "required", false);
        insert_bool(&mut item, "searchable", true);
        insert_bool(&mut item, "filterable", true);
        insert_string(&mut item, "status", string_cell(&row, "status")?);
        items.push(item);
    }
    Ok(collection(items, total, &query))
}

async fn create_attribute(
    pool: &PgPool,
    command: AdminAttributeMutationCommand,
) -> DomainResult<AdminCatalogJsonRecord> {
    let attribute_id = stable_product_center_id(
        "catalog-attribute",
        &[
            &command.subject.tenant_id.to_string(),
            &command.subject.organization_id.to_string(),
            &command.attribute_no,
        ],
    );
    let _requested_metadata = (
        command.scope.as_str(),
        command.required,
        command.searchable,
        command.filterable,
    );
    sqlx::query(
        r#"
        INSERT INTO commerce_product_attribute
            (id, tenant_id, organization_id, attribute_no, name, value_type, status, sort_weight, created_at, updated_at)
        VALUES
            ($1, $2::text, $3::text, $4, $5, $6, $7, 0, $8, $8)
        ON CONFLICT (tenant_id, attribute_no) DO UPDATE SET
            name = EXCLUDED.name,
            value_type = EXCLUDED.value_type,
            status = EXCLUDED.status,
            updated_at = EXCLUDED.updated_at
        "#,
    )
    .bind(&attribute_id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(&command.attribute_no)
    .bind(&command.name)
    .bind(&command.value_type)
    .bind(&command.status)
    .bind(&command.requested_at)
    .execute(pool)
    .await
    .map_err(|error| write_error("failed to create product attribute", error))?;
    load_attribute(pool, command.subject, &attribute_id).await
}

async fn list_category_attributes(
    pool: &PgPool,
    query: ListAdminCatalogRecordsQuery,
) -> DomainResult<AdminCatalogCollection> {
    let rows = sqlx::query(
        r#"
        SELECT
            ca.id,
            ca.category_id,
            c.name AS category_name,
            c.category_no AS category_no,
            ca.attribute_id,
            a.attribute_no,
            a.name AS attribute_name,
            a.value_type,
            ca.required,
            ca.searchable,
            ca.filterable,
            ca.sort_order,
            ca.status,
            ca.created_at,
            ca.updated_at,
            COUNT(*) OVER() AS total
        FROM commerce_product_category_attribute ca
        JOIN commerce_product_category c
          ON c.tenant_id = ca.tenant_id
         AND c.id = ca.category_id
        JOIN commerce_product_attribute a
          ON a.tenant_id = ca.tenant_id
         AND a.id = ca.attribute_id
        WHERE ca.tenant_id = $1::text
          AND (ca.organization_id = $2::text OR ca.organization_id IS NULL)
          AND ($3 IS NULL OR ca.category_id = $3)
          AND ($4 IS NULL OR ca.attribute_id = $4)
          AND ($5 IS NULL OR ca.status = $5)
        ORDER BY ca.sort_order ASC, a.attribute_no ASC, ca.id ASC
        LIMIT $6 OFFSET $7
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.category_id.as_deref())
    .bind(query.attribute_id.as_deref())
    .bind(query.status.as_deref())
    .bind(query.page_size)
    .bind(query.offset)
    .fetch_all(pool)
    .await
    .map_err(store_error)?;
    let total = rows
        .first()
        .map(|row| integer_cell(row, "total"))
        .transpose()?
        .unwrap_or(0);
    let mut items = Vec::with_capacity(rows.len());
    for row in rows {
        items.push(category_attribute_record_from_row(&row)?);
    }
    Ok(collection(items, total, &query))
}

async fn upsert_category_attribute(
    pool: &PgPool,
    command: AdminCategoryAttributeMutationCommand,
    is_update: bool,
) -> DomainResult<AdminCatalogJsonRecord> {
    ensure_category_attribute_refs(pool, &command).await?;
    let binding_id = command.binding_id.clone().unwrap_or_else(|| {
        stable_product_center_id(
            "catalog-category-attribute",
            &[
                &command.subject.tenant_id.to_string(),
                &command.subject.organization_id.to_string(),
                &command.category_id,
                &command.attribute_id,
            ],
        )
    });
    if is_update {
        let result = sqlx::query(
            r#"
            UPDATE commerce_product_category_attribute
            SET category_id = $1,
                attribute_id = $2,
                required = $3,
                searchable = $4,
                filterable = $5,
                sort_order = $6,
                status = $7,
                updated_at = $8
            WHERE id = $9
              AND tenant_id = $10::text
              AND (organization_id = $11::text OR organization_id IS NULL)
            "#,
        )
        .bind(&command.category_id)
        .bind(&command.attribute_id)
        .bind(command.required)
        .bind(command.searchable)
        .bind(command.filterable)
        .bind(command.sort_order)
        .bind(&command.status)
        .bind(&command.requested_at)
        .bind(&binding_id)
        .bind(command.subject.tenant_id)
        .bind(command.subject.organization_id)
        .execute(pool)
        .await
        .map_err(|error| {
            write_error("failed to update product category attribute binding", error)
        })?;
        if result.rows_affected() == 0 {
            return Err(DomainError::not_found(
                "product category attribute binding was not found",
            ));
        }
    } else {
        sqlx::query(
            r#"
            INSERT INTO commerce_product_category_attribute
                (id, tenant_id, organization_id, category_id, attribute_id, required, searchable, filterable, sort_order, status, created_at, updated_at)
            VALUES
                ($1, $2::text, $3::text, $4, $5, $6, $7, $8, $9, $10, $11, $11)
            ON CONFLICT (tenant_id, category_id, attribute_id) DO UPDATE SET
                required = EXCLUDED.required,
                searchable = EXCLUDED.searchable,
                filterable = EXCLUDED.filterable,
                sort_order = EXCLUDED.sort_order,
                status = EXCLUDED.status,
                updated_at = EXCLUDED.updated_at
            "#,
        )
        .bind(&binding_id)
        .bind(command.subject.tenant_id)
        .bind(command.subject.organization_id)
        .bind(&command.category_id)
        .bind(&command.attribute_id)
        .bind(command.required)
        .bind(command.searchable)
        .bind(command.filterable)
        .bind(command.sort_order)
        .bind(&command.status)
        .bind(&command.requested_at)
        .execute(pool)
        .await
        .map_err(|error| write_error("failed to create product category attribute binding", error))?;
    }
    load_category_attribute(pool, command.subject, &binding_id).await
}

async fn ensure_category_attribute_refs(
    pool: &PgPool,
    command: &AdminCategoryAttributeMutationCommand,
) -> DomainResult<()> {
    let category_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM commerce_product_category
        WHERE tenant_id = $1::text
          AND (organization_id = $2::text OR organization_id IS NULL)
          AND id = $3
          AND status <> 'archived'
        "#,
    )
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(&command.category_id)
    .fetch_one(pool)
    .await
    .map_err(store_error)?;
    if category_count == 0 {
        return Err(DomainError::conflict("product category was not found"));
    }
    let attribute_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM commerce_product_attribute
        WHERE tenant_id = $1::text
          AND (organization_id = $2::text OR organization_id IS NULL)
          AND id = $3
          AND status <> 'archived'
        "#,
    )
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(&command.attribute_id)
    .fetch_one(pool)
    .await
    .map_err(store_error)?;
    if attribute_count == 0 {
        return Err(DomainError::conflict("product attribute was not found"));
    }
    Ok(())
}

async fn delete_category_attribute(
    pool: &PgPool,
    command: DeleteAdminCategoryAttributeCommand,
) -> DomainResult<bool> {
    let result = sqlx::query(
        r#"
        UPDATE commerce_product_category_attribute
        SET status = 'archived',
            updated_at = $1
        WHERE id = $2
          AND tenant_id = $3::text
          AND (organization_id = $4::text OR organization_id IS NULL)
        "#,
    )
    .bind(&command.requested_at)
    .bind(&command.binding_id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .execute(pool)
    .await
    .map_err(store_error)?;
    if result.rows_affected() == 0 {
        return Err(DomainError::not_found(
            "product category attribute binding was not found",
        ));
    }
    Ok(true)
}

async fn list_price_lists(
    pool: &PgPool,
    query: ListAdminCatalogRecordsQuery,
) -> DomainResult<AdminCatalogCollection> {
    let result = sqlx::query(
        r#"
        SELECT
            id,
            price_list_no,
            currency_code,
            market_code,
            customer_segment,
            starts_at,
            ends_at,
            status,
            created_at,
            updated_at,
            COUNT(*) OVER() AS total
        FROM commerce_price_list
        WHERE tenant_id = $1::text
          AND (organization_id = $2::text OR organization_id IS NULL)
          AND ($3 IS NULL OR currency_code = $3)
          AND ($4 IS NULL OR market_code = $4)
          AND ($5 IS NULL OR status = $5)
        ORDER BY created_at DESC, id DESC
        LIMIT $6 OFFSET $7
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.currency_code.as_deref())
    .bind(query.market_code.as_deref())
    .bind(query.status.as_deref())
    .bind(query.page_size)
    .bind(query.offset)
    .fetch_all(pool)
    .await;
    let rows = match result {
        Ok(rows) => rows,
        Err(error) if is_missing_table_error(&error) => {
            return Ok(collection(Vec::new(), 0, &query))
        }
        Err(error) => return Err(store_error(error)),
    };
    let total = rows
        .first()
        .map(|row| integer_cell(row, "total"))
        .transpose()?
        .unwrap_or(0);
    let mut items = Vec::with_capacity(rows.len());
    for row in rows {
        items.push(price_list_record_from_row(&row)?);
    }
    Ok(collection(items, total, &query))
}

async fn create_price_list(
    pool: &PgPool,
    command: AdminPriceListMutationCommand,
) -> DomainResult<AdminCatalogJsonRecord> {
    let price_list_id = stable_product_center_id(
        "catalog-price-list",
        &[
            &command.subject.tenant_id.to_string(),
            &command.subject.organization_id.to_string(),
            &command.price_list_no,
        ],
    );
    let result = sqlx::query(
        r#"
        INSERT INTO commerce_price_list
            (id, tenant_id, organization_id, price_list_no, currency_code, market_code, customer_segment, starts_at, ends_at, status, created_at, updated_at)
        VALUES
            ($1, $2::text, $3::text, $4, $5, $6, $7, $8, $9, $10, $11, $11)
        ON CONFLICT (tenant_id, organization_id, price_list_no) DO UPDATE SET
            currency_code = EXCLUDED.currency_code,
            market_code = EXCLUDED.market_code,
            customer_segment = EXCLUDED.customer_segment,
            starts_at = EXCLUDED.starts_at,
            ends_at = EXCLUDED.ends_at,
            status = EXCLUDED.status,
            updated_at = EXCLUDED.updated_at
        "#,
    )
    .bind(&price_list_id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(&command.price_list_no)
    .bind(&command.currency_code)
    .bind(command.market_code.as_deref())
    .bind(command.customer_segment.as_deref())
    .bind(command.starts_at.as_deref())
    .bind(command.ends_at.as_deref())
    .bind(&command.status)
    .bind(&command.requested_at)
    .execute(pool)
    .await;
    match result {
        Ok(_) => load_price_list(pool, command.subject, &price_list_id).await,
        Err(error) if is_missing_table_error(&error) => Err(DomainError::new(
            "commerce_price_list table is not installed; run the commerce schema migration before creating price lists",
        )),
        Err(error) => Err(write_error("failed to create price list", error)),
    }
}

async fn load_category(
    pool: &PgPool,
    subject: AdminCatalogSubject,
    category_id: &str,
) -> DomainResult<AdminCatalogJsonRecord> {
    let mut query = base_query(subject);
    query.parent_id = None;
    let page = list_categories(pool, query).await?;
    page.items
        .into_iter()
        .find(|item| item.get("id").and_then(Value::as_str) == Some(category_id))
        .ok_or_else(|| DomainError::not_found("product category was not found"))
}

async fn load_product(
    pool: &PgPool,
    subject: AdminCatalogSubject,
    product_id: &str,
) -> DomainResult<AdminCatalogJsonRecord> {
    let row = sqlx::query(
        r#"
        SELECT
            p.id,
            p.spu_no,
            p.product_type,
            p.title,
            p.subtitle,
            p.description,
            (
                SELECT STRING_AGG(pc.category_id, ',' ORDER BY pc.primary_flag DESC, pc.sort_order ASC, pc.category_id ASC)
                FROM commerce_product_spu_category pc
                WHERE pc.tenant_id = p.tenant_id
                  AND pc.spu_id = p.id
                  AND (pc.organization_id = p.organization_id OR pc.organization_id IS NULL OR p.organization_id IS NULL)
                  AND pc.status = 'active'
            ) AS category_ids,
            p.sales_status,
            p.created_at,
            p.updated_at,
            (SELECT s.id FROM commerce_product_sku s WHERE s.tenant_id = p.tenant_id AND s.spu_id = p.id ORDER BY s.price_amount::numeric, s.id LIMIT 1) AS default_sku_id,
            (SELECT s.price_amount FROM commerce_product_sku s WHERE s.tenant_id = p.tenant_id AND s.spu_id = p.id ORDER BY s.price_amount::numeric, s.id LIMIT 1) AS min_price_amount,
            (SELECT s.currency_code FROM commerce_product_sku s WHERE s.tenant_id = p.tenant_id AND s.spu_id = p.id ORDER BY s.price_amount::numeric, s.id LIMIT 1) AS currency_code
        FROM commerce_product_spu p
        WHERE p.id = $1
          AND p.tenant_id = $2::text
          AND (p.organization_id = $3::text OR p.organization_id IS NULL)
        "#,
    )
    .bind(product_id)
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .fetch_optional(pool)
    .await
    .map_err(store_error)?;
    row.map(|row| product_record_from_row(&row))
        .transpose()?
        .ok_or_else(|| DomainError::not_found("product was not found"))
}

async fn load_sku(
    pool: &PgPool,
    subject: AdminCatalogSubject,
    sku_id: &str,
) -> DomainResult<AdminCatalogJsonRecord> {
    let row = sqlx::query(
        r#"
        SELECT id, sku_no, spu_id, title, delivery_mode, price_amount, currency_code, sales_status, spec_json, created_at, updated_at
        FROM commerce_product_sku
        WHERE id = $1
          AND tenant_id = $2::text
          AND (organization_id = $3::text OR organization_id IS NULL)
        "#,
    )
    .bind(sku_id)
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .fetch_optional(pool)
    .await
    .map_err(store_error)?;
    match row {
        Some(row) => sku_record_from_row(pool, subject, &row).await,
        None => Err(DomainError::not_found("sku was not found")),
    }
}

async fn load_attribute(
    pool: &PgPool,
    subject: AdminCatalogSubject,
    attribute_id: &str,
) -> DomainResult<AdminCatalogJsonRecord> {
    let row = sqlx::query(
        r#"
        SELECT id, attribute_no, name, value_type, status
        FROM commerce_product_attribute
        WHERE id = $1
          AND tenant_id = $2::text
          AND (organization_id = $3::text OR organization_id IS NULL)
        "#,
    )
    .bind(attribute_id)
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .fetch_optional(pool)
    .await
    .map_err(store_error)?;
    let Some(row) = row else {
        return Err(DomainError::not_found("product attribute was not found"));
    };
    let mut item = Map::new();
    insert_string(&mut item, "id", string_cell(&row, "id")?);
    insert_string(&mut item, "attributeNo", string_cell(&row, "attribute_no")?);
    insert_string(&mut item, "name", string_cell(&row, "name")?);
    insert_string(&mut item, "valueType", string_cell(&row, "value_type")?);
    insert_string(&mut item, "scope", "both");
    insert_bool(&mut item, "required", false);
    insert_bool(&mut item, "searchable", true);
    insert_bool(&mut item, "filterable", true);
    insert_string(&mut item, "status", string_cell(&row, "status")?);
    Ok(item)
}

async fn load_category_attribute(
    pool: &PgPool,
    subject: AdminCatalogSubject,
    binding_id: &str,
) -> DomainResult<AdminCatalogJsonRecord> {
    let row = sqlx::query(
        r#"
        SELECT
            ca.id,
            ca.category_id,
            c.name AS category_name,
            c.category_no AS category_no,
            ca.attribute_id,
            a.attribute_no,
            a.name AS attribute_name,
            a.value_type,
            ca.required,
            ca.searchable,
            ca.filterable,
            ca.sort_order,
            ca.status,
            ca.created_at,
            ca.updated_at
        FROM commerce_product_category_attribute ca
        JOIN commerce_product_category c
          ON c.tenant_id = ca.tenant_id
         AND c.id = ca.category_id
        JOIN commerce_product_attribute a
          ON a.tenant_id = ca.tenant_id
         AND a.id = ca.attribute_id
        WHERE ca.id = $1
          AND ca.tenant_id = $2::text
          AND (ca.organization_id = $3::text OR ca.organization_id IS NULL)
        "#,
    )
    .bind(binding_id)
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .fetch_optional(pool)
    .await
    .map_err(store_error)?;
    row.map(|row| category_attribute_record_from_row(&row))
        .transpose()?
        .ok_or_else(|| DomainError::not_found("product category attribute binding was not found"))
}

async fn load_price_list(
    pool: &PgPool,
    subject: AdminCatalogSubject,
    price_list_id: &str,
) -> DomainResult<AdminCatalogJsonRecord> {
    let row = sqlx::query(
        r#"
        SELECT id, price_list_no, currency_code, market_code, customer_segment, starts_at, ends_at, status, created_at, updated_at
        FROM commerce_price_list
        WHERE id = $1
          AND tenant_id = $2::text
          AND (organization_id = $3::text OR organization_id IS NULL)
        "#,
    )
    .bind(price_list_id)
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .fetch_optional(pool)
    .await
    .map_err(store_error)?;
    row.map(|row| price_list_record_from_row(&row))
        .transpose()?
        .ok_or_else(|| DomainError::not_found("price list was not found"))
}

fn product_record_from_row(row: &sqlx::postgres::PgRow) -> DomainResult<AdminCatalogJsonRecord> {
    let mut item = Map::new();
    insert_string(&mut item, "id", string_cell(row, "id")?);
    insert_string(&mut item, "spuNo", string_cell(row, "spu_no")?);
    insert_string(&mut item, "productType", string_cell(row, "product_type")?);
    insert_string(&mut item, "title", string_cell(row, "title")?);
    insert_optional_string(
        &mut item,
        "subtitle",
        optional_string_cell(row, "subtitle")?,
    );
    insert_optional_string(
        &mut item,
        "description",
        optional_string_cell(row, "description")?,
    );
    item.insert(
        "categoryIds".to_owned(),
        Value::Array(csv_string_array_cell(row, "category_ids")?),
    );
    insert_optional_string(&mut item, "brand", None);
    insert_string(&mut item, "status", string_cell(row, "sales_status")?);
    insert_optional_string(&mut item, "publishedAt", None);
    insert_optional_string(
        &mut item,
        "defaultSkuId",
        optional_string_cell(row, "default_sku_id")?,
    );
    insert_optional_string(
        &mut item,
        "minPriceAmount",
        optional_string_cell(row, "min_price_amount")?,
    );
    insert_optional_string(
        &mut item,
        "currencyCode",
        optional_string_cell(row, "currency_code")?,
    );
    item.insert("media".to_owned(), Value::Array(Vec::new()));
    insert_string(&mut item, "createdAt", string_cell(row, "created_at")?);
    insert_string(&mut item, "updatedAt", string_cell(row, "updated_at")?);
    Ok(item)
}

fn category_attribute_record_from_row(
    row: &sqlx::postgres::PgRow,
) -> DomainResult<AdminCatalogJsonRecord> {
    let mut item = Map::new();
    insert_string(&mut item, "id", string_cell(row, "id")?);
    insert_string(&mut item, "categoryId", string_cell(row, "category_id")?);
    insert_string(
        &mut item,
        "categoryName",
        string_cell(row, "category_name")?,
    );
    insert_string(&mut item, "categoryPath", string_cell(row, "category_no")?);
    insert_string(&mut item, "attributeId", string_cell(row, "attribute_id")?);
    insert_string(&mut item, "attributeNo", string_cell(row, "attribute_no")?);
    insert_string(
        &mut item,
        "attributeName",
        string_cell(row, "attribute_name")?,
    );
    insert_string(&mut item, "valueType", string_cell(row, "value_type")?);
    insert_string(&mut item, "scope", "both");
    insert_bool(&mut item, "required", bool_cell(row, "required")?);
    insert_bool(&mut item, "searchable", bool_cell(row, "searchable")?);
    insert_bool(&mut item, "filterable", bool_cell(row, "filterable")?);
    insert_integer(&mut item, "sortOrder", integer_cell(row, "sort_order")?);
    insert_string(&mut item, "status", string_cell(row, "status")?);
    insert_string(&mut item, "createdAt", string_cell(row, "created_at")?);
    insert_string(&mut item, "updatedAt", string_cell(row, "updated_at")?);
    Ok(item)
}

async fn sku_record_from_row(
    pool: &PgPool,
    subject: AdminCatalogSubject,
    row: &sqlx::postgres::PgRow,
) -> DomainResult<AdminCatalogJsonRecord> {
    let sku_id = string_cell(row, "id")?;
    let spec_json = optional_string_cell(row, "spec_json")?
        .and_then(|value| serde_json::from_str::<Value>(&value).ok())
        .unwrap_or(Value::Null);
    let mut item = Map::new();
    insert_string(&mut item, "id", sku_id.as_str());
    insert_string(&mut item, "skuNo", string_cell(row, "sku_no")?);
    insert_string(&mut item, "productId", string_cell(row, "spu_id")?);
    insert_string(&mut item, "title", string_cell(row, "title")?);
    insert_string(
        &mut item,
        "fulfillmentType",
        string_cell(row, "delivery_mode")?,
    );
    insert_optional_string(
        &mut item,
        "taxCategory",
        json_text(&spec_json, "taxCategory"),
    );
    insert_optional_string(&mut item, "salesUnit", json_text(&spec_json, "salesUnit"));
    insert_optional_string(&mut item, "barcode", json_text(&spec_json, "barcode"));
    item.insert(
        "image".to_owned(),
        sku_image_resource(pool, subject, &sku_id)
            .await?
            .unwrap_or(Value::Null),
    );
    insert_optional_string(
        &mut item,
        "defaultPriceAmount",
        optional_string_cell(row, "price_amount")?,
    );
    insert_optional_string(
        &mut item,
        "defaultCurrencyCode",
        optional_string_cell(row, "currency_code")?,
    );
    insert_string(&mut item, "status", string_cell(row, "sales_status")?);
    insert_optional_string(&mut item, "publishedAt", None);
    item.insert(
        "attributes".to_owned(),
        Value::Array(sku_attributes(pool, subject, &sku_id).await?),
    );
    insert_string(&mut item, "createdAt", string_cell(row, "created_at")?);
    insert_string(&mut item, "updatedAt", string_cell(row, "updated_at")?);
    Ok(item)
}

async fn sku_attributes(
    pool: &PgPool,
    subject: AdminCatalogSubject,
    sku_id: &str,
) -> DomainResult<Vec<Value>> {
    let rows = sqlx::query(
        r#"
        SELECT
            a.id AS attribute_id,
            a.name AS attribute_name,
            av.id AS attribute_value_id,
            av.value_code,
            av.display_value,
            sav.custom_value
        FROM commerce_product_sku_attribute sav
        JOIN commerce_product_attribute a
          ON a.tenant_id = sav.tenant_id
         AND a.id = sav.attribute_id
        LEFT JOIN commerce_product_attribute_value av
          ON av.tenant_id = sav.tenant_id
         AND av.id = sav.attribute_value_id
        WHERE sav.tenant_id = $1::text
          AND sav.sku_id = $2
        ORDER BY a.sort_weight ASC, a.attribute_no ASC
        "#,
    )
    .bind(subject.tenant_id)
    .bind(sku_id)
    .fetch_all(pool)
    .await
    .map_err(store_error)?;
    let mut attributes = Vec::with_capacity(rows.len());
    for row in rows {
        attributes.push(json!({
            "attributeId": string_cell(&row, "attribute_id")?,
            "attributeName": string_cell(&row, "attribute_name")?,
            "attributeValueId": optional_string_cell(&row, "attribute_value_id")?,
            "valueCode": optional_string_cell(&row, "value_code")?,
            "displayValue": optional_string_cell(&row, "display_value")?,
            "customValue": optional_string_cell(&row, "custom_value")?,
        }));
    }
    Ok(attributes)
}

async fn sku_image_resource(
    pool: &PgPool,
    subject: AdminCatalogSubject,
    sku_id: &str,
) -> DomainResult<Option<Value>> {
    let row = sqlx::query(
        r#"
        SELECT resource_snapshot
        FROM commerce_product_media
        WHERE tenant_id = $1::text
          AND (organization_id = $2::text OR organization_id IS NULL)
          AND owner_type = 'sku'
          AND owner_id = $3
          AND media_role = 'sku_image'
          AND status = 'active'
        ORDER BY sort_order ASC, updated_at DESC
        LIMIT 1
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(sku_id)
    .fetch_optional(pool)
    .await
    .map_err(store_error)?;
    let Some(row) = row else {
        return Ok(None);
    };
    let raw = optional_string_cell(&row, "resource_snapshot")?;
    Ok(raw.and_then(|value| serde_json::from_str::<Value>(&value).ok()))
}

fn price_list_record_from_row(row: &sqlx::postgres::PgRow) -> DomainResult<AdminCatalogJsonRecord> {
    let mut item = Map::new();
    insert_string(&mut item, "id", string_cell(row, "id")?);
    insert_string(&mut item, "priceListNo", string_cell(row, "price_list_no")?);
    insert_string(
        &mut item,
        "currencyCode",
        string_cell(row, "currency_code")?,
    );
    insert_optional_string(
        &mut item,
        "marketCode",
        optional_string_cell(row, "market_code")?,
    );
    insert_optional_string(
        &mut item,
        "customerSegment",
        optional_string_cell(row, "customer_segment")?,
    );
    insert_optional_string(
        &mut item,
        "startsAt",
        optional_string_cell(row, "starts_at")?,
    );
    insert_optional_string(&mut item, "endsAt", optional_string_cell(row, "ends_at")?);
    insert_string(&mut item, "status", string_cell(row, "status")?);
    insert_string(&mut item, "createdAt", string_cell(row, "created_at")?);
    insert_string(&mut item, "updatedAt", string_cell(row, "updated_at")?);
    Ok(item)
}

fn base_query(subject: AdminCatalogSubject) -> ListAdminCatalogRecordsQuery {
    ListAdminCatalogRecordsQuery {
        subject,
        page_no: 1,
        page_size: 200,
        offset: 0,
        status: None,
        parent_id: None,
        query_text: None,
        category_id: None,
        attribute_id: None,
        product_type: None,
        product_id: None,
        fulfillment_type: None,
        scope: None,
        currency_code: None,
        market_code: None,
    }
}

fn collection(
    items: Vec<AdminCatalogJsonRecord>,
    total: i64,
    query: &ListAdminCatalogRecordsQuery,
) -> AdminCatalogCollection {
    AdminCatalogCollection {
        items,
        total,
        page_no: query.page_no,
        page_size: query.page_size,
    }
}

fn inventory_tracking(fulfillment_type: &str) -> &'static str {
    if fulfillment_type == "physical_shipment" {
        "tracked"
    } else {
        "untracked"
    }
}

fn json_text(value: &Value, field: &str) -> Option<String> {
    value
        .get(field)
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned)
}

fn json_string(value: &impl serde::Serialize) -> String {
    serde_json::to_string(value).unwrap_or_else(|_| "[]".to_owned())
}

fn insert_string(record: &mut AdminCatalogJsonRecord, key: &str, value: impl Into<String>) {
    record.insert(key.to_owned(), Value::String(value.into()));
}

fn insert_optional_string(record: &mut AdminCatalogJsonRecord, key: &str, value: Option<String>) {
    record.insert(
        key.to_owned(),
        value.map(Value::String).unwrap_or(Value::Null),
    );
}

fn insert_integer(record: &mut AdminCatalogJsonRecord, key: &str, value: i64) {
    record.insert(key.to_owned(), Value::from(value));
}

fn insert_bool(record: &mut AdminCatalogJsonRecord, key: &str, value: bool) {
    record.insert(key.to_owned(), Value::Bool(value));
}

fn string_cell(row: &sqlx::postgres::PgRow, column: &str) -> DomainResult<String> {
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
    if let Ok(value) = row.try_get::<Option<i32>, _>(column) {
        return Ok(value.map(|value| value.to_string()).unwrap_or_default());
    }
    if let Ok(value) = row.try_get::<i32, _>(column) {
        return Ok(value.to_string());
    }
    Err(DomainError::new(format!(
        "catalog row column {column} is not readable as text"
    )))
}

fn optional_string_cell(row: &sqlx::postgres::PgRow, column: &str) -> DomainResult<Option<String>> {
    let value = string_cell(row, column)?;
    Ok((!value.trim().is_empty()).then_some(value))
}

fn csv_string_array_cell(row: &sqlx::postgres::PgRow, column: &str) -> DomainResult<Vec<Value>> {
    Ok(optional_string_cell(row, column)?
        .map(|value| {
            value
                .split(',')
                .map(str::trim)
                .filter(|item| !item.is_empty())
                .map(|item| Value::String(item.to_owned()))
                .collect()
        })
        .unwrap_or_default())
}

fn integer_cell(row: &sqlx::postgres::PgRow, column: &str) -> DomainResult<i64> {
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
        .map_err(|error| DomainError::new(format!("invalid catalog integer {column}: {error}")))
}

fn bool_cell(row: &sqlx::postgres::PgRow, column: &str) -> DomainResult<bool> {
    if let Ok(value) = row.try_get::<bool, _>(column) {
        return Ok(value);
    }
    if let Ok(value) = row.try_get::<Option<bool>, _>(column) {
        return Ok(value.unwrap_or(false));
    }
    Ok(integer_cell(row, column)? != 0)
}

fn write_error(context: &str, error: sqlx::Error) -> DomainError {
    if is_unique_constraint_error(&error) {
        return DomainError::conflict(format!("{context}: record already exists"));
    }
    DomainError::new(format!("{context}: {}", sql_error_message(&error)))
}

fn store_error(error: sqlx::Error) -> DomainError {
    DomainError::new(sql_error_message(&error))
}

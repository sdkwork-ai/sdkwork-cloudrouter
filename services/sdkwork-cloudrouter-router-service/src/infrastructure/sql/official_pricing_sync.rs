use std::collections::{BTreeMap, BTreeSet};
use std::fmt::{Display, Formatter};

use sdkwork_models::{
    BillingMeter, ModelCatalog, ModelPrice, PriceFormula, PriceFormulaTerm, PriceRateTier,
};
use serde_json::Value;
use sha2::{Digest, Sha256};
use sqlx::{PgPool, Postgres, Row, Transaction};

use crate::domain::DomainError;
use crate::infrastructure::sql::account_rate_card::sync_legacy_account_group_rate_cards;
use crate::infrastructure::sql::model_catalog_import::stable_uuid;
use crate::infrastructure::sql::runtime_id::next_cloud_runtime_id;

const SOURCE_SYSTEM: &str = "sdkwork_models";

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct OfficialPricingSyncReport {
    pub source_hash: String,
    pub product_count: usize,
    pub operation_count: usize,
    pub meter_count: usize,
    pub price_book_count: usize,
    pub binding_count: usize,
    pub rate_binding_count: usize,
    pub rate_count: usize,
    pub condition_count: usize,
    pub tier_count: usize,
    pub formula_count: usize,
    pub formula_term_count: usize,
    pub pricing_plan_count: usize,
    pub pricing_rule_count: usize,
    pub account_rate_card_count: usize,
}

#[derive(Debug)]
pub(crate) enum OfficialPricingSyncError {
    Database(sqlx::Error),
    Domain(DomainError),
    InvalidCatalog(String),
}

impl Display for OfficialPricingSyncError {
    fn fmt(&self, formatter: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Database(error) => write!(formatter, "official pricing sync failed: {error}"),
            Self::Domain(error) => write!(formatter, "official pricing sync failed: {error}"),
            Self::InvalidCatalog(message) => {
                write!(formatter, "official pricing catalog is invalid: {message}")
            }
        }
    }
}

impl std::error::Error for OfficialPricingSyncError {}

impl From<sqlx::Error> for OfficialPricingSyncError {
    fn from(value: sqlx::Error) -> Self {
        Self::Database(value)
    }
}

impl From<DomainError> for OfficialPricingSyncError {
    fn from(value: DomainError) -> Self {
        Self::Domain(value)
    }
}

#[derive(Debug, Clone)]
struct ProductProjection {
    product_code: String,
    product_kind: String,
    owner_system: String,
    display_name: String,
}

#[derive(Debug, Clone)]
struct OperationProjection {
    operation_code: String,
    operation_kind: String,
    display_name: String,
}

#[derive(Debug, Clone)]
struct MeterProjection {
    meter_code: String,
    quantity_kind: String,
    unit_code: String,
    aggregation_mode: String,
    default_unit_size: String,
    quantity_precision: i32,
    display_name: String,
}

#[derive(Debug, Clone)]
struct PriceBookProjection {
    price_book_code: String,
    vendor_code: String,
    region_code: String,
    price_side: String,
    source_hash: String,
    currency_code: String,
    effective_from: String,
}

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord)]
struct PriceBookKey {
    price_book_code: String,
    vendor_code: String,
    region_code: String,
}

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord)]
struct BindingProjection {
    product_code: String,
    operation_code: String,
    vendor_code: String,
    provider_code: String,
    region_code: String,
    resource_code: String,
    catalog_key: String,
    api_format: String,
}

#[derive(Debug, Clone)]
struct RateProjection {
    binding: BindingProjection,
    price_book_key: PriceBookKey,
    product_code: String,
    operation_code: String,
    meter_code: String,
    rate_code: String,
    rate_hash: String,
    billability: String,
    charge_timing: String,
    calculation_mode: String,
    quantity_aggregation: String,
    unit_size: String,
    unit_price: String,
    minimum_quantity: String,
    quantity_step: Option<String>,
    currency_code: String,
    effective_from: String,
    effective_to: Option<String>,
    source_url: String,
    source_observed_at: String,
    conditions: Vec<ConditionProjection>,
    tiers: Vec<PriceRateTier>,
    formula: Option<PriceFormula>,
}

#[derive(Debug, Clone)]
struct ConditionProjection {
    dimension_code: String,
    operator_code: String,
    value: Value,
}

#[derive(Debug, Clone)]
struct OfficialPricingProjection {
    source_hash: String,
    products: BTreeMap<String, ProductProjection>,
    operations: BTreeMap<String, OperationProjection>,
    meters: BTreeMap<String, MeterProjection>,
    price_books: BTreeMap<PriceBookKey, PriceBookProjection>,
    bindings: BTreeSet<BindingProjection>,
    rates: Vec<RateProjection>,
}

pub(crate) async fn sync_official_pricing_catalog(
    pool: &PgPool,
    catalog: &ModelCatalog,
) -> Result<OfficialPricingSyncReport, OfficialPricingSyncError> {
    let projection = project_catalog(catalog)?;
    let mut transaction = pool.begin().await?;
    let import_id = stage_import_run(&mut transaction, catalog, &projection).await?;

    let mut product_ids = BTreeMap::new();
    for product in projection.products.values() {
        let id = ensure_product(&mut transaction, product).await?;
        product_ids.insert(product.product_code.clone(), id);
    }

    let mut operation_ids = BTreeMap::new();
    for operation in projection.operations.values() {
        let id = ensure_operation(&mut transaction, operation).await?;
        operation_ids.insert(operation.operation_code.clone(), id);
    }

    let mut meter_ids = BTreeMap::new();
    for meter in projection.meters.values() {
        let id = ensure_meter(&mut transaction, meter).await?;
        meter_ids.insert(meter.meter_code.clone(), id);
    }

    let mut price_book_ids = BTreeMap::new();
    for (price_book_key, price_book) in &projection.price_books {
        let id = ensure_price_book(&mut transaction, import_id, catalog, price_book).await?;
        price_book_ids.insert(price_book_key.clone(), id);
    }

    let mut binding_ids = BTreeMap::new();
    for binding in &projection.bindings {
        let product_id = required_id(&product_ids, &binding.product_code, "product")?;
        let operation_id = required_id(&operation_ids, &binding.operation_code, "operation")?;
        let binding_id =
            ensure_product_binding(&mut transaction, binding, product_id, operation_id).await?;
        binding_ids.insert(binding.clone(), binding_id);
    }

    let mut condition_count = 0;
    let mut tier_count = 0;
    let mut formula_count = 0;
    let mut formula_term_count = 0;
    for rate in &projection.rates {
        let price_book_id = price_book_ids
            .get(&rate.price_book_key)
            .copied()
            .ok_or_else(|| {
                OfficialPricingSyncError::InvalidCatalog(format!(
                    "rate {} references a missing price book {}/{}/{}",
                    rate.rate_code,
                    rate.price_book_key.vendor_code,
                    rate.price_book_key.region_code,
                    rate.price_book_key.price_book_code
                ))
            })?;
        let product_id = required_id(&product_ids, &rate.product_code, "product")?;
        let operation_id = required_id(&operation_ids, &rate.operation_code, "operation")?;
        let meter_id = required_id(&meter_ids, &rate.meter_code, "meter")?;
        let rate_id = ensure_rate(
            &mut transaction,
            rate,
            price_book_id,
            product_id,
            operation_id,
            meter_id,
        )
        .await?;
        let product_binding_id = binding_ids.get(&rate.binding).copied().ok_or_else(|| {
            OfficialPricingSyncError::InvalidCatalog(format!(
                "rate {} references a missing product binding",
                rate.rate_code
            ))
        })?;
        ensure_rate_binding(&mut transaction, rate_id, product_binding_id).await?;
        for (sort_order, condition) in rate.conditions.iter().enumerate() {
            ensure_rate_condition(
                &mut transaction,
                rate_id,
                condition,
                i32::try_from(sort_order).unwrap_or(i32::MAX),
            )
            .await?;
            condition_count += 1;
        }
        for (tier_index, tier) in rate.tiers.iter().enumerate() {
            ensure_rate_tier(
                &mut transaction,
                rate_id,
                tier,
                i32::try_from(tier_index).unwrap_or(i32::MAX),
                &rate.currency_code,
            )
            .await?;
            tier_count += 1;
        }
        if let Some(formula) = rate.formula.as_ref() {
            ensure_rate_formula(&mut transaction, rate_id, formula).await?;
            formula_count += 1;
            formula_term_count += formula.terms.len();
        }
    }

    activate_price_books(&mut transaction, &price_book_ids).await?;
    let (pricing_plan_count, pricing_rule_count) =
        bootstrap_default_pricing_plans(&mut transaction).await?;
    let rate_card_effective_at = sqlx::query_scalar::<_, String>("SELECT CURRENT_TIMESTAMP::text")
        .fetch_one(&mut *transaction)
        .await?;
    let account_rate_card_count =
        sync_legacy_account_group_rate_cards(&mut transaction, &rate_card_effective_at).await?;
    sqlx::query(
        "UPDATE pricing_import_run SET import_state = 'activated', accepted_count = row_count, activated_at = CURRENT_TIMESTAMP WHERE id = $1",
    )
    .bind(import_id)
    .execute(&mut *transaction)
    .await?;
    transaction.commit().await?;

    Ok(OfficialPricingSyncReport {
        source_hash: projection.source_hash,
        product_count: projection.products.len(),
        operation_count: projection.operations.len(),
        meter_count: projection.meters.len(),
        price_book_count: projection.price_books.len(),
        binding_count: projection.bindings.len(),
        rate_binding_count: projection.rates.len(),
        rate_count: projection.rates.len(),
        condition_count,
        tier_count,
        formula_count,
        formula_term_count,
        pricing_plan_count,
        pricing_rule_count,
        account_rate_card_count,
    })
}

fn project_catalog(
    catalog: &ModelCatalog,
) -> Result<OfficialPricingProjection, OfficialPricingSyncError> {
    let mut products = BTreeMap::new();
    let mut operations = BTreeMap::new();
    let mut meters = BTreeMap::new();
    let mut bindings = BTreeSet::new();
    let mut rates = Vec::new();
    let mut book_rate_hashes = BTreeMap::<PriceBookKey, Vec<String>>::new();
    let mut book_metadata = BTreeMap::<PriceBookKey, (String, String, String)>::new();

    for meter in &catalog.meters {
        meters.insert(meter.meter_code.clone(), project_meter(meter));
    }

    for vendor in &catalog.vendors {
        let models = vendor
            .models
            .iter()
            .map(|model| (model.model_id.as_str(), model))
            .collect::<BTreeMap<_, _>>();
        for pricing in &vendor.pricing {
            let model = models.get(pricing.model_id.as_str()).ok_or_else(|| {
                OfficialPricingSyncError::InvalidCatalog(format!(
                    "{} has pricing but no model definition in {}/{}",
                    pricing.catalog_key, pricing.vendor_code, pricing.region_code
                ))
            })?;
            for price in &pricing.prices {
                validate_rate_identity(pricing.catalog_key.as_str(), price)?;
                let product = ProductProjection {
                    product_code: price.product_code.clone(),
                    product_kind: "model_api".to_owned(),
                    owner_system: "sdkwork-models".to_owned(),
                    display_name: format!(
                        "{} {}",
                        vendor.vendor.display_name, model.primary_capability
                    ),
                };
                products
                    .entry(product.product_code.clone())
                    .or_insert(product);
                let operation = OperationProjection {
                    operation_code: price.operation_code.clone(),
                    operation_kind: operation_kind(&price.operation_code),
                    display_name: operation_display_name(&price.operation_code),
                };
                operations
                    .entry(operation.operation_code.clone())
                    .or_insert(operation);
                let binding = BindingProjection {
                    product_code: price.product_code.clone(),
                    operation_code: price.operation_code.clone(),
                    vendor_code: pricing.vendor_code.clone(),
                    provider_code: pricing.vendor_code.clone(),
                    region_code: pricing.region_code.clone(),
                    resource_code: pricing.model_id.clone(),
                    catalog_key: pricing.catalog_key.clone(),
                    api_format: model.api_format.clone(),
                };
                bindings.insert(binding.clone());
                let currency = price
                    .currency
                    .clone()
                    .unwrap_or_else(|| pricing.currency.clone());
                let rate_code = format!("{}#{}", pricing.catalog_key, price.price_id);
                let price_book_key = PriceBookKey {
                    price_book_code: price.price_book_code.clone(),
                    vendor_code: pricing.vendor_code.clone(),
                    region_code: pricing.region_code.clone(),
                };
                let conditions = price
                    .conditions
                    .iter()
                    .map(|condition| ConditionProjection {
                        dimension_code: condition.dimension_code.clone(),
                        operator_code: condition.operator.clone(),
                        value: condition.value.clone(),
                    })
                    .collect::<Vec<_>>();
                rates.push(RateProjection {
                    binding,
                    price_book_key: price_book_key.clone(),
                    product_code: price.product_code.clone(),
                    operation_code: price.operation_code.clone(),
                    meter_code: price.meter_code.clone(),
                    rate_code,
                    rate_hash: price.rate_hash.clone(),
                    billability: price.billability.clone(),
                    charge_timing: price.charge_timing.clone(),
                    calculation_mode: price.calculation_mode.clone(),
                    quantity_aggregation: price.quantity_aggregation.clone(),
                    unit_size: price.unit_size.clone(),
                    unit_price: price.unit_price.clone(),
                    minimum_quantity: price.minimum_quantity.clone(),
                    quantity_step: price.quantity_step.clone(),
                    currency_code: currency.clone(),
                    effective_from: price.effective_from.clone(),
                    effective_to: price.effective_to.clone(),
                    source_url: price.source.source_url.clone(),
                    source_observed_at: price.source.observed_at.clone(),
                    conditions,
                    tiers: price.tiers.clone(),
                    formula: price.formula.clone(),
                });
                book_rate_hashes
                    .entry(price_book_key.clone())
                    .or_default()
                    .push(price.rate_hash.clone());
                let price_side = normalize_price_side(&price.price_side)?;
                let metadata = book_metadata.entry(price_book_key).or_insert_with(|| {
                    (
                        price_side.clone(),
                        currency.clone(),
                        price.effective_from.clone(),
                    )
                });
                if metadata.0 != price_side || metadata.1 != currency {
                    return Err(OfficialPricingSyncError::InvalidCatalog(format!(
                        "price book {} mixes price sides or currencies",
                        price.price_book_code
                    )));
                }
                if price.effective_from < metadata.2 {
                    metadata.2 = price.effective_from.clone();
                }
            }
        }
    }

    let mut price_books = BTreeMap::new();
    for (price_book_key, mut hashes) in book_rate_hashes {
        hashes.sort();
        let source_hash = hash_parts(hashes.iter().map(String::as_str));
        let (price_side, currency_code, effective_from) = book_metadata
            .remove(&price_book_key)
            .expect("book metadata is built with rate hashes");
        price_books.insert(
            price_book_key.clone(),
            PriceBookProjection {
                price_book_code: price_book_key.price_book_code,
                vendor_code: price_book_key.vendor_code,
                region_code: price_book_key.region_code,
                price_side,
                source_hash,
                currency_code,
                effective_from,
            },
        );
    }
    rates.sort_by(|left, right| {
        (&left.price_book_key, &left.rate_code).cmp(&(&right.price_book_key, &right.rate_code))
    });
    let source_hash = hash_parts(rates.iter().map(|rate| rate.rate_hash.as_str()));

    Ok(OfficialPricingProjection {
        source_hash,
        products,
        operations,
        meters,
        price_books,
        bindings,
        rates,
    })
}

fn normalize_price_side(value: &str) -> Result<String, OfficialPricingSyncError> {
    let normalized = match value {
        "official" | "official_reference" | "reference" => "official_reference",
        "upstream" | "upstream_cost" => "upstream_cost",
        "customer" | "customer_charge" => "customer_charge",
        "internal" | "internal_transfer" => "internal_transfer",
        _ => {
            return Err(OfficialPricingSyncError::InvalidCatalog(format!(
                "unsupported price side `{value}`"
            )));
        }
    };
    Ok(normalized.to_owned())
}

fn validate_rate_identity(
    catalog_key: &str,
    price: &ModelPrice,
) -> Result<(), OfficialPricingSyncError> {
    for (field, value) in [
        ("rateHash", price.rate_hash.as_str()),
        ("priceBookCode", price.price_book_code.as_str()),
        ("productCode", price.product_code.as_str()),
        ("operationCode", price.operation_code.as_str()),
    ] {
        if value.trim().is_empty() {
            return Err(OfficialPricingSyncError::InvalidCatalog(format!(
                "{catalog_key} price {} has no {field}",
                price.price_id
            )));
        }
    }
    if !matches!(
        price.billability.as_str(),
        "chargeable" | "free" | "not_applicable" | "unknown"
    ) {
        return Err(OfficialPricingSyncError::InvalidCatalog(format!(
            "{catalog_key} price {} has invalid billability",
            price.price_id
        )));
    }
    Ok(())
}

fn project_meter(meter: &BillingMeter) -> MeterProjection {
    MeterProjection {
        meter_code: meter.meter_code.clone(),
        quantity_kind: meter
            .billing_mode
            .clone()
            .unwrap_or_else(|| "custom".to_owned()),
        unit_code: meter
            .default_unit
            .clone()
            .unwrap_or_else(|| "unit".to_owned()),
        aggregation_mode: if meter.meter_code == "api_request" {
            "distinct_invocation".to_owned()
        } else {
            "sum".to_owned()
        },
        default_unit_size: meter.default_unit_size.clone(),
        quantity_precision: meter.quantity_precision.unwrap_or(0),
        display_name: meter.display_name.clone(),
    }
}

fn operation_kind(operation_code: &str) -> String {
    operation_code
        .split_once('.')
        .map(|(kind, _)| kind)
        .unwrap_or("model")
        .to_owned()
}

fn operation_display_name(operation_code: &str) -> String {
    operation_code.replace('.', " ")
}

fn hash_parts<'a>(parts: impl IntoIterator<Item = &'a str>) -> String {
    let mut hasher = Sha256::new();
    for part in parts {
        hasher.update((part.len() as u64).to_be_bytes());
        hasher.update(part.as_bytes());
    }
    hex::encode(hasher.finalize())
}

fn required_id(
    ids: &BTreeMap<String, i64>,
    code: &str,
    kind: &str,
) -> Result<i64, OfficialPricingSyncError> {
    ids.get(code).copied().ok_or_else(|| {
        OfficialPricingSyncError::InvalidCatalog(format!("rate references missing {kind} {code}"))
    })
}

async fn stage_import_run(
    transaction: &mut Transaction<'_, Postgres>,
    catalog: &ModelCatalog,
    projection: &OfficialPricingProjection,
) -> Result<i64, OfficialPricingSyncError> {
    if let Some(id) = sqlx::query_scalar::<_, i64>(
        "SELECT id FROM pricing_import_run WHERE tenant_id = 0 AND organization_id = 0 AND source_system = $1 AND source_catalog_version = $2 AND source_hash = $3",
    )
    .bind(SOURCE_SYSTEM)
    .bind(&catalog.manifest.catalog_version)
    .bind(&projection.source_hash)
    .fetch_optional(&mut **transaction)
    .await?
    {
        return Ok(id);
    }
    let id = next_cloud_runtime_id("pricing_import_run")?;
    let uuid = stable_uuid(
        "pricing-import",
        &[
            SOURCE_SYSTEM,
            &catalog.manifest.catalog_version,
            &projection.source_hash,
        ],
    );
    sqlx::query(
        r#"INSERT INTO pricing_import_run
           (id, uuid, tenant_id, organization_id, status, source_system,
            source_catalog_version, source_hash, import_state, row_count,
            accepted_count, rejected_count, staged_at)
           VALUES ($1, $2, 0, 0, 1, $3, $4, $5, 'staging', $6, 0, 0, CURRENT_TIMESTAMP)
           ON CONFLICT DO NOTHING"#,
    )
    .bind(id)
    .bind(uuid)
    .bind(SOURCE_SYSTEM)
    .bind(&catalog.manifest.catalog_version)
    .bind(&projection.source_hash)
    .bind(i64::try_from(projection.rates.len()).unwrap_or(i64::MAX))
    .execute(&mut **transaction)
    .await?;
    Ok(sqlx::query_scalar::<_, i64>(
        "SELECT id FROM pricing_import_run WHERE tenant_id = 0 AND organization_id = 0 AND source_system = $1 AND source_catalog_version = $2 AND source_hash = $3",
    )
    .bind(SOURCE_SYSTEM)
    .bind(&catalog.manifest.catalog_version)
    .bind(&projection.source_hash)
    .fetch_one(&mut **transaction)
    .await?)
}

async fn ensure_product(
    transaction: &mut Transaction<'_, Postgres>,
    product: &ProductProjection,
) -> Result<i64, OfficialPricingSyncError> {
    if let Some(id) = scoped_entity_id(
        transaction,
        "pricing_product",
        "product_code",
        &product.product_code,
    )
    .await?
    {
        return Ok(id);
    }
    let id = next_cloud_runtime_id("pricing_product")?;
    sqlx::query(
        r#"INSERT INTO pricing_product
           (id, uuid, tenant_id, organization_id, namespace_code, product_code,
            product_kind, owner_system, display_name)
           VALUES ($1, $2, 0, 0, 'models', $3, $4, $5, $6)
           ON CONFLICT DO NOTHING"#,
    )
    .bind(id)
    .bind(stable_uuid("pricing-product", &[&product.product_code]))
    .bind(&product.product_code)
    .bind(&product.product_kind)
    .bind(&product.owner_system)
    .bind(&product.display_name)
    .execute(&mut **transaction)
    .await?;
    scoped_entity_id(
        transaction,
        "pricing_product",
        "product_code",
        &product.product_code,
    )
    .await?
    .ok_or_else(|| {
        OfficialPricingSyncError::InvalidCatalog(
            "failed to resolve product after insert".to_owned(),
        )
    })
}

async fn ensure_operation(
    transaction: &mut Transaction<'_, Postgres>,
    operation: &OperationProjection,
) -> Result<i64, OfficialPricingSyncError> {
    if let Some(id) = scoped_entity_id(
        transaction,
        "pricing_operation",
        "operation_code",
        &operation.operation_code,
    )
    .await?
    {
        return Ok(id);
    }
    let id = next_cloud_runtime_id("pricing_operation")?;
    sqlx::query(
        r#"INSERT INTO pricing_operation
           (id, uuid, tenant_id, organization_id, namespace_code, operation_code,
            operation_kind, charge_timing_default, async_completion_policy,
            success_status_policy, display_name)
           VALUES ($1, $2, 0, 0, 'models', $3, $4, 'rate_defined',
                   'result_terminal', 'successful_completion', $5)
           ON CONFLICT DO NOTHING"#,
    )
    .bind(id)
    .bind(stable_uuid(
        "pricing-operation",
        &[&operation.operation_code],
    ))
    .bind(&operation.operation_code)
    .bind(&operation.operation_kind)
    .bind(&operation.display_name)
    .execute(&mut **transaction)
    .await?;
    scoped_entity_id(
        transaction,
        "pricing_operation",
        "operation_code",
        &operation.operation_code,
    )
    .await?
    .ok_or_else(|| {
        OfficialPricingSyncError::InvalidCatalog(
            "failed to resolve operation after insert".to_owned(),
        )
    })
}

async fn ensure_meter(
    transaction: &mut Transaction<'_, Postgres>,
    meter: &MeterProjection,
) -> Result<i64, OfficialPricingSyncError> {
    if let Some(id) = scoped_entity_id(
        transaction,
        "pricing_meter",
        "meter_code",
        &meter.meter_code,
    )
    .await?
    {
        return Ok(id);
    }
    let id = next_cloud_runtime_id("pricing_meter")?;
    sqlx::query(
        r#"INSERT INTO pricing_meter
           (id, uuid, tenant_id, organization_id, namespace_code, meter_code,
            quantity_kind, unit_code, aggregation_mode, default_unit_size,
            quantity_precision, display_name)
           VALUES ($1, $2, 0, 0, 'models', $3, $4, $5, $6, $7::numeric, $8, $9)
           ON CONFLICT DO NOTHING"#,
    )
    .bind(id)
    .bind(stable_uuid("pricing-meter", &[&meter.meter_code]))
    .bind(&meter.meter_code)
    .bind(&meter.quantity_kind)
    .bind(&meter.unit_code)
    .bind(&meter.aggregation_mode)
    .bind(&meter.default_unit_size)
    .bind(meter.quantity_precision)
    .bind(&meter.display_name)
    .execute(&mut **transaction)
    .await?;
    scoped_entity_id(
        transaction,
        "pricing_meter",
        "meter_code",
        &meter.meter_code,
    )
    .await?
    .ok_or_else(|| {
        OfficialPricingSyncError::InvalidCatalog("failed to resolve meter after insert".to_owned())
    })
}

async fn scoped_entity_id(
    transaction: &mut Transaction<'_, Postgres>,
    table: &'static str,
    code_column: &'static str,
    code: &str,
) -> Result<Option<i64>, OfficialPricingSyncError> {
    let query = format!(
        "SELECT id FROM {table} WHERE tenant_id = 0 AND organization_id = 0 AND {code_column} = $1 AND deleted_at IS NULL"
    );
    Ok(sqlx::query(sqlx::AssertSqlSafe(query))
        .bind(code)
        .fetch_optional(&mut **transaction)
        .await?
        .map(|row| row.get::<i64, _>("id")))
}

async fn ensure_price_book(
    transaction: &mut Transaction<'_, Postgres>,
    import_run_id: i64,
    catalog: &ModelCatalog,
    book: &PriceBookProjection,
) -> Result<i64, OfficialPricingSyncError> {
    let existing = sqlx::query(
        r#"SELECT id, source_hash FROM pricing_price_book
           WHERE tenant_id = 0 AND organization_id = 0 AND namespace_code = 'models'
             AND price_book_code = $1 AND vendor_code = $2 AND region_code = $3
             AND price_book_version = $4 AND deleted_at IS NULL"#,
    )
    .bind(&book.price_book_code)
    .bind(&book.vendor_code)
    .bind(&book.region_code)
    .bind(&catalog.manifest.catalog_version)
    .fetch_optional(&mut **transaction)
    .await?;
    if let Some(existing) = existing {
        let source_hash = existing.get::<String, _>("source_hash");
        if source_hash != book.source_hash {
            return Err(OfficialPricingSyncError::InvalidCatalog(format!(
                "price book {} version {} changed content hash",
                book.price_book_code, catalog.manifest.catalog_version
            )));
        }
        return Ok(existing.get("id"));
    }
    let id = next_cloud_runtime_id("pricing_price_book")?;
    sqlx::query(
        r#"INSERT INTO pricing_price_book
           (id, uuid, tenant_id, organization_id, import_run_id, namespace_code,
            price_book_code, price_book_version, price_side, source_system,
            vendor_code, region_code, source_catalog_version, source_hash,
            lifecycle_state, currency_code, effective_from)
           VALUES ($1, $2, 0, 0, $3, 'models', $4, $5, $6, $7, $8, $9,
                   $5, $10, 'staged', $11, $12::timestamptz)"#,
    )
    .bind(id)
    .bind(stable_uuid(
        "pricing-book",
        &[
            &book.price_book_code,
            &book.vendor_code,
            &book.region_code,
            &catalog.manifest.catalog_version,
            &book.source_hash,
        ],
    ))
    .bind(import_run_id)
    .bind(&book.price_book_code)
    .bind(&catalog.manifest.catalog_version)
    .bind(&book.price_side)
    .bind(SOURCE_SYSTEM)
    .bind(&book.vendor_code)
    .bind(&book.region_code)
    .bind(&book.source_hash)
    .bind(&book.currency_code)
    .bind(&book.effective_from)
    .execute(&mut **transaction)
    .await?;
    Ok(id)
}

async fn ensure_product_binding(
    transaction: &mut Transaction<'_, Postgres>,
    binding: &BindingProjection,
    product_id: i64,
    operation_id: i64,
) -> Result<i64, OfficialPricingSyncError> {
    if let Some(id) = sqlx::query_scalar::<_, i64>(
        r#"SELECT id FROM pricing_product_binding
           WHERE tenant_id = 0 AND organization_id = 0
             AND product_id = $1 AND operation_id = $2
             AND vendor_code = $3 AND provider_code = $4 AND region_code = $5
             AND resource_type = 'model' AND resource_code = $6
             AND deleted_at IS NULL"#,
    )
    .bind(product_id)
    .bind(operation_id)
    .bind(&binding.vendor_code)
    .bind(&binding.provider_code)
    .bind(&binding.region_code)
    .bind(&binding.resource_code)
    .fetch_optional(&mut **transaction)
    .await?
    {
        return Ok(id);
    }
    let id = next_cloud_runtime_id("pricing_product_binding")?;
    sqlx::query(
        r#"INSERT INTO pricing_product_binding
           (id, uuid, tenant_id, organization_id, product_id, operation_id,
            vendor_code, provider_code, account_id, region_code, resource_type,
            resource_code, catalog_key, api_format, endpoint_code)
           VALUES ($1, $2, 0, 0, $3, $4, $5, $6, NULL, $7, 'model', $8, $9,
                   $10, $11)
           ON CONFLICT DO NOTHING"#,
    )
    .bind(id)
    .bind(stable_uuid(
        "pricing-binding",
        &[
            &binding.product_code,
            &binding.operation_code,
            &binding.vendor_code,
            &binding.provider_code,
            &binding.region_code,
            &binding.resource_code,
        ],
    ))
    .bind(product_id)
    .bind(operation_id)
    .bind(&binding.vendor_code)
    .bind(&binding.provider_code)
    .bind(&binding.region_code)
    .bind(&binding.resource_code)
    .bind(&binding.catalog_key)
    .bind(&binding.api_format)
    .bind(&binding.operation_code)
    .execute(&mut **transaction)
    .await?;
    Ok(id)
}

async fn ensure_rate_binding(
    transaction: &mut Transaction<'_, Postgres>,
    rate_id: i64,
    product_binding_id: i64,
) -> Result<(), OfficialPricingSyncError> {
    let id = next_cloud_runtime_id("pricing_rate_binding")?;
    sqlx::query(
        r#"INSERT INTO pricing_rate_binding
           (id, uuid, tenant_id, organization_id, rate_id, product_binding_id)
           VALUES ($1, $2, 0, 0, $3, $4)
           ON CONFLICT DO NOTHING"#,
    )
    .bind(id)
    .bind(stable_uuid(
        "pricing-rate-binding",
        &[&rate_id.to_string(), &product_binding_id.to_string()],
    ))
    .bind(rate_id)
    .bind(product_binding_id)
    .execute(&mut **transaction)
    .await?;
    Ok(())
}

async fn ensure_rate(
    transaction: &mut Transaction<'_, Postgres>,
    rate: &RateProjection,
    price_book_id: i64,
    product_id: i64,
    operation_id: i64,
    meter_id: i64,
) -> Result<i64, OfficialPricingSyncError> {
    if let Some(row) = sqlx::query(
        r#"SELECT id, rate_hash FROM pricing_rate
           WHERE tenant_id = 0 AND organization_id = 0 AND price_book_id = $1
             AND rate_code = $2 AND deleted_at IS NULL"#,
    )
    .bind(price_book_id)
    .bind(&rate.rate_code)
    .fetch_optional(&mut **transaction)
    .await?
    {
        let existing_hash = row.get::<String, _>("rate_hash");
        if existing_hash != rate.rate_hash {
            return Err(OfficialPricingSyncError::InvalidCatalog(format!(
                "rate {} changed inside immutable price book",
                rate.rate_code
            )));
        }
        return Ok(row.get("id"));
    }
    let id = next_cloud_runtime_id("pricing_rate")?;
    sqlx::query(
        r#"INSERT INTO pricing_rate
           (id, uuid, tenant_id, organization_id, price_book_id, product_id,
            operation_id, meter_id, rate_code, rate_hash, billability,
            charge_timing, calculation_mode, quantity_aggregation, unit_size,
            unit_price, minimum_quantity, quantity_step, currency_code, priority,
            effective_from, effective_to, source_url, source_observed_at)
           VALUES ($1, $2, 0, 0, $3, $4, $5, $6, $7, $8, $9, $10, $11,
                   $12, $13::numeric, $14::numeric, $15::numeric, $16::numeric,
                   $17, 100, $18::timestamptz, $19::timestamptz, $20,
                   $21::timestamptz)"#,
    )
    .bind(id)
    .bind(stable_uuid(
        "pricing-rate",
        &[
            &rate.price_book_key.price_book_code,
            &rate.price_book_key.vendor_code,
            &rate.price_book_key.region_code,
            &rate.rate_code,
            &rate.rate_hash,
        ],
    ))
    .bind(price_book_id)
    .bind(product_id)
    .bind(operation_id)
    .bind(meter_id)
    .bind(&rate.rate_code)
    .bind(&rate.rate_hash)
    .bind(&rate.billability)
    .bind(&rate.charge_timing)
    .bind(&rate.calculation_mode)
    .bind(&rate.quantity_aggregation)
    .bind(&rate.unit_size)
    .bind(&rate.unit_price)
    .bind(&rate.minimum_quantity)
    .bind(rate.quantity_step.as_deref())
    .bind(&rate.currency_code)
    .bind(&rate.effective_from)
    .bind(rate.effective_to.as_deref())
    .bind(&rate.source_url)
    .bind(&rate.source_observed_at)
    .execute(&mut **transaction)
    .await?;
    Ok(id)
}

async fn ensure_rate_condition(
    transaction: &mut Transaction<'_, Postgres>,
    rate_id: i64,
    condition: &ConditionProjection,
    sort_order: i32,
) -> Result<(), OfficialPricingSyncError> {
    let (value_type, value_string, value_decimal, value_boolean, value_json) =
        condition_columns(&condition.value)?;
    let id = next_cloud_runtime_id("pricing_rate_condition")?;
    sqlx::query(
        r#"INSERT INTO pricing_rate_condition
           (id, uuid, tenant_id, organization_id, rate_id, dimension_code,
            operator_code, value_type, value_string, value_decimal,
            value_boolean, value_json, sort_order)
           VALUES ($1, $2, 0, 0, $3, $4, $5, $6, $7, $8::numeric, $9,
                   $10::jsonb, $11)
           ON CONFLICT DO NOTHING"#,
    )
    .bind(id)
    .bind(rate_condition_uuid(rate_id, condition, sort_order))
    .bind(rate_id)
    .bind(&condition.dimension_code)
    .bind(&condition.operator_code)
    .bind(value_type)
    .bind(value_string)
    .bind(value_decimal)
    .bind(value_boolean)
    .bind(value_json)
    .bind(sort_order)
    .execute(&mut **transaction)
    .await?;
    Ok(())
}

async fn ensure_rate_tier(
    transaction: &mut Transaction<'_, Postgres>,
    rate_id: i64,
    tier: &PriceRateTier,
    tier_index: i32,
    currency_code: &str,
) -> Result<(), OfficialPricingSyncError> {
    let id = next_cloud_runtime_id("pricing_rate_tier")?;
    sqlx::query(
        r#"INSERT INTO pricing_rate_tier
           (id, uuid, tenant_id, organization_id, rate_id, tier_index, tier_code,
            lower_bound, upper_bound, unit_size, unit_price, flat_amount,
            currency_code)
           VALUES ($1, $2, 0, 0, $3, $4, $5, $6::numeric, $7::numeric,
                   $8::numeric, $9::numeric, $10::numeric, $11)
           ON CONFLICT DO NOTHING"#,
    )
    .bind(id)
    .bind(stable_uuid(
        "pricing-rate-tier",
        &[
            &rate_id.to_string(),
            &tier_index.to_string(),
            &tier.tier_code,
        ],
    ))
    .bind(rate_id)
    .bind(tier_index)
    .bind(&tier.tier_code)
    .bind(&tier.lower_bound)
    .bind(tier.upper_bound.as_deref())
    .bind(&tier.unit_size)
    .bind(&tier.unit_price)
    .bind(&tier.flat_amount)
    .bind(currency_code)
    .execute(&mut **transaction)
    .await?;
    Ok(())
}

async fn ensure_rate_formula(
    transaction: &mut Transaction<'_, Postgres>,
    rate_id: i64,
    formula: &PriceFormula,
) -> Result<(), OfficialPricingSyncError> {
    let formula_id = match sqlx::query_scalar::<_, i64>(
        "SELECT id FROM pricing_rate_formula WHERE tenant_id = 0 AND organization_id = 0 AND rate_id = $1 AND deleted_at IS NULL",
    )
    .bind(rate_id)
    .fetch_optional(&mut **transaction)
    .await?
    {
        Some(id) => id,
        None => {
            let id = next_cloud_runtime_id("pricing_rate_formula")?;
            sqlx::query(
                r#"INSERT INTO pricing_rate_formula
                   (id, uuid, tenant_id, organization_id, rate_id, formula_code,
                    formula_version, constant_units, quantity_coefficient,
                    minimum_units, maximum_units)
                   VALUES ($1, $2, 0, 0, $3, $4, $5, $6::numeric, $7::numeric,
                           $8::numeric, $9::numeric)
                   ON CONFLICT DO NOTHING"#,
            )
            .bind(id)
            .bind(stable_uuid(
                "pricing-rate-formula",
                &[&rate_id.to_string(), &formula.formula_code, &formula.formula_version],
            ))
            .bind(rate_id)
            .bind(&formula.formula_code)
            .bind(&formula.formula_version)
            .bind(&formula.constant_units)
            .bind(&formula.quantity_coefficient)
            .bind(formula.minimum_units.as_deref())
            .bind(formula.maximum_units.as_deref())
            .execute(&mut **transaction)
            .await?;
            sqlx::query_scalar::<_, i64>(
                "SELECT id FROM pricing_rate_formula WHERE tenant_id = 0 AND organization_id = 0 AND rate_id = $1 AND deleted_at IS NULL",
            )
            .bind(rate_id)
            .fetch_one(&mut **transaction)
            .await?
        }
    };
    for (term_index, term) in formula.terms.iter().enumerate() {
        ensure_rate_formula_term(
            transaction,
            formula_id,
            term,
            i32::try_from(term_index).unwrap_or(i32::MAX),
        )
        .await?;
    }
    Ok(())
}

async fn ensure_rate_formula_term(
    transaction: &mut Transaction<'_, Postgres>,
    formula_id: i64,
    term: &PriceFormulaTerm,
    term_index: i32,
) -> Result<(), OfficialPricingSyncError> {
    let id = next_cloud_runtime_id("pricing_rate_formula_term")?;
    sqlx::query(
        r#"INSERT INTO pricing_rate_formula_term
           (id, uuid, tenant_id, organization_id, formula_id, term_index,
            term_code, dimension_code, coefficient)
           VALUES ($1, $2, 0, 0, $3, $4, $5, $6, $7::numeric)
           ON CONFLICT DO NOTHING"#,
    )
    .bind(id)
    .bind(stable_uuid(
        "pricing-rate-formula-term",
        &[
            &formula_id.to_string(),
            &term_index.to_string(),
            &term.term_code,
            &term.dimension_code,
        ],
    ))
    .bind(formula_id)
    .bind(term_index)
    .bind(&term.term_code)
    .bind(&term.dimension_code)
    .bind(&term.coefficient)
    .execute(&mut **transaction)
    .await?;
    Ok(())
}

fn rate_condition_uuid(rate_id: i64, condition: &ConditionProjection, sort_order: i32) -> String {
    stable_uuid(
        "pricing-condition",
        &[
            &rate_id.to_string(),
            &condition.dimension_code,
            &condition.operator_code,
            &sort_order.to_string(),
        ],
    )
}

fn condition_columns(
    value: &Value,
) -> Result<
    (
        &'static str,
        Option<String>,
        Option<String>,
        Option<bool>,
        Option<String>,
    ),
    OfficialPricingSyncError,
> {
    Ok(match value {
        Value::String(value) => ("string", Some(value.clone()), None, None, None),
        Value::Number(value) => ("decimal", None, Some(value.to_string()), None, None),
        Value::Bool(value) => ("boolean", None, None, Some(*value), None),
        Value::Null => {
            return Err(OfficialPricingSyncError::InvalidCatalog(
                "pricing conditions cannot contain null values".to_owned(),
            ));
        }
        value => ("json", None, None, None, Some(value.to_string())),
    })
}

async fn activate_price_books(
    transaction: &mut Transaction<'_, Postgres>,
    price_book_ids: &BTreeMap<PriceBookKey, i64>,
) -> Result<(), OfficialPricingSyncError> {
    for (price_book_key, id) in price_book_ids {
        sqlx::query(
            r#"UPDATE pricing_price_book
               SET lifecycle_state = 'retired', updated_at = CURRENT_TIMESTAMP,
                   version = version + 1
               WHERE tenant_id = 0 AND organization_id = 0
                 AND price_book_code = $1 AND vendor_code = $2 AND region_code = $3
                 AND lifecycle_state = 'active' AND id <> $4"#,
        )
        .bind(&price_book_key.price_book_code)
        .bind(&price_book_key.vendor_code)
        .bind(&price_book_key.region_code)
        .bind(id)
        .execute(&mut **transaction)
        .await?;
        sqlx::query(
            r#"UPDATE pricing_price_book
               SET lifecycle_state = 'active', activated_at = COALESCE(activated_at, CURRENT_TIMESTAMP),
                   updated_at = CURRENT_TIMESTAMP, version = version + 1
               WHERE id = $1 AND lifecycle_state IN ('staged', 'active')"#,
        )
        .bind(id)
        .execute(&mut **transaction)
        .await?;
    }
    Ok(())
}

/// Ensures the global `standard` pricing plan and its default rule exist in
/// `cloudrouter_pricing_plan` / `cloudrouter_pricing_rule`. The legacy
/// `ai_pricing_plan` projection source is retired: the plan chain is now fully
/// self-contained in the billing module, so account-group rate cards and
/// runtime plan resolution never depend on a table that nothing writes.
///
/// Idempotent: an existing effective plan/rule is left untouched (operator
/// managed); missing rows are created with the neutral default (official
/// reference base, multiplier 1, no markup, no minimum charge).
async fn bootstrap_default_pricing_plans(
    transaction: &mut Transaction<'_, Postgres>,
) -> Result<(usize, usize), OfficialPricingSyncError> {
    const PLAN_CODE: &str = "standard";
    const RULE_CODE: &str = "plan-default";
    const SOURCE_MARKER: &str = r#"{"source":"official_pricing_bootstrap"}"#;
    let effective_from = sqlx::query_scalar::<_, String>("SELECT CURRENT_TIMESTAMP::text")
        .fetch_one(&mut **transaction)
        .await?;

    let mut plan_count = 0;
    let mut rule_count = 0;

    let existing_plan_id = sqlx::query_scalar::<_, i64>(
        r#"SELECT id FROM cloudrouter_pricing_plan
           WHERE tenant_id = 0 AND organization_id = 0 AND plan_code = $1
             AND deleted_at IS NULL"#,
    )
    .bind(PLAN_CODE)
    .fetch_optional(&mut **transaction)
    .await?;
    let plan_id = match existing_plan_id {
        Some(id) => id,
        None => {
            let id = next_cloud_runtime_id("cloudrouter_pricing_plan")?;
            sqlx::query(
                r#"INSERT INTO cloudrouter_pricing_plan
                   (id, uuid, tenant_id, organization_id, metadata, plan_code,
                    plan_name, base_price_side, currency_code, fallback_policy,
                    rounding_mode, minimum_charge_amount, effective_from, effective_to)
                   VALUES ($1, $2, 0, 0, $3::jsonb, $4, $5, $6, $7,
                           'fail_closed', 'half_up', 0, $8::timestamptz, NULL)"#,
            )
            .bind(id)
            .bind(stable_uuid(
                "cloudrouter-pricing-plan",
                &["0", "0", PLAN_CODE],
            ))
            .bind(SOURCE_MARKER)
            .bind(PLAN_CODE)
            .bind("Standard")
            .bind("official_reference")
            .bind("USD")
            .bind(&effective_from)
            .execute(&mut **transaction)
            .await?;
            plan_count += 1;
            id
        }
    };

    let existing_rule_id = sqlx::query_scalar::<_, i64>(
        r#"SELECT id FROM cloudrouter_pricing_rule
           WHERE tenant_id = 0 AND organization_id = 0
             AND pricing_plan_id = $1 AND rule_code = $2
             AND deleted_at IS NULL"#,
    )
    .bind(plan_id)
    .bind(RULE_CODE)
    .fetch_optional(&mut **transaction)
    .await?;
    if existing_rule_id.is_none() {
        let rule_id = next_cloud_runtime_id("cloudrouter_pricing_rule")?;
        sqlx::query(
            r#"INSERT INTO cloudrouter_pricing_rule
               (id, uuid, tenant_id, organization_id, metadata, pricing_plan_id,
                rule_code, formula_mode, multiplier, markup_amount, priority,
                effective_from, effective_to)
               VALUES ($1, $2, 0, 0, $3::jsonb, $4, $5,
                       'multiplier_markup', 1, 0, 10000,
                       $6::timestamptz, NULL)"#,
        )
        .bind(rule_id)
        .bind(stable_uuid(
            "cloudrouter-pricing-rule",
            &[&plan_id.to_string(), RULE_CODE],
        ))
        .bind(SOURCE_MARKER)
        .bind(plan_id)
        .bind(RULE_CODE)
        .bind(&effective_from)
        .execute(&mut **transaction)
        .await?;
        rule_count += 1;
    }

    Ok((plan_count, rule_count))
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::{normalize_price_side, project_catalog, rate_condition_uuid, ConditionProjection};

    #[test]
    fn catalog_price_side_aliases_project_to_database_contract_values() {
        for (source, expected) in [
            ("official", "official_reference"),
            ("reference", "official_reference"),
            ("official_reference", "official_reference"),
            ("upstream", "upstream_cost"),
            ("upstream_cost", "upstream_cost"),
            ("customer", "customer_charge"),
            ("customer_charge", "customer_charge"),
            ("internal", "internal_transfer"),
            ("internal_transfer", "internal_transfer"),
        ] {
            assert_eq!(
                normalize_price_side(source).expect("supported price side"),
                expected
            );
        }
        assert!(normalize_price_side("unknown").is_err());
    }

    #[test]
    fn bundled_catalog_projects_every_rate_without_identity_collisions() {
        let catalog = sdkwork_models::load_bundled_catalog().expect("bundled model catalog");
        let projection = project_catalog(&catalog).expect("official pricing projection");

        assert_eq!(
            catalog
                .vendors
                .iter()
                .flat_map(|vendor| &vendor.pricing)
                .map(|pricing| pricing.prices.len())
                .sum::<usize>(),
            projection.rates.len()
        );
        assert!(projection
            .rates
            .iter()
            .all(|rate| !rate.rate_hash.is_empty()));
        assert!(projection
            .rates
            .iter()
            .any(|rate| rate.billability == "unknown"));
        assert!(projection
            .rates
            .iter()
            .any(|rate| !rate.conditions.is_empty()));
        assert!(projection
            .price_books
            .values()
            .all(|book| book.price_side == "official_reference"));
    }

    #[test]
    fn rate_condition_identity_preserves_multiple_bounds_for_one_dimension() {
        let lower_bound = ConditionProjection {
            dimension_code: "duration_seconds".to_owned(),
            operator_code: "gte".to_owned(),
            value: json!(5),
        };
        let upper_bound = ConditionProjection {
            dimension_code: "duration_seconds".to_owned(),
            operator_code: "lt".to_owned(),
            value: json!(10),
        };

        assert_ne!(
            rate_condition_uuid(42, &lower_bound, 0),
            rate_condition_uuid(42, &upper_bound, 1)
        );
        assert_ne!(
            rate_condition_uuid(42, &lower_bound, 0),
            rate_condition_uuid(42, &lower_bound, 1)
        );
    }
}

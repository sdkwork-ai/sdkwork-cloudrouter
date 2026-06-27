use sdkwork_clawrouter_router_service::infrastructure::sql::sqlite::SqliteAdminMarketingStore;
use sdkwork_clawrouter_router_service::ports::{
    AdminMarketingStore, AdminMarketingSubject, CreatePromotionOfferCommand,
    GeneratePromotionCouponStockCommand, ListPromotionCodesQuery, ListPromotionCouponStocksQuery,
    ListPromotionOffersQuery, UpdatePromotionOfferCommand,
};
use sqlx::sqlite::SqlitePoolOptions;
use sqlx::{Row, SqlitePool};

#[tokio::test]
async fn sqlite_admin_marketing_coupon_flow_uses_appbase_promotion_tables() {
    let pool = migrated_pool().await;
    let store = SqliteAdminMarketingStore::new(pool.clone());

    let coupon = store
        .create_promotion_offer(CreatePromotionOfferCommand {
            subject: admin_subject(),
            offer_uuid: "coupon-launch".to_owned(),
            audit_log_uuid: "audit-coupon-launch".to_owned(),
            name: "Launch credit".to_owned(),
            discount_type: "amount".to_owned(),
            value: "$8.50".to_owned(),
            amount_cents: 850,
            discount_value: None,
            status: "active".to_owned(),
            request_id: "req-coupon-launch".to_owned(),
            requested_at: "2026-05-24T10:00:00Z".to_owned(),
        })
        .await
        .unwrap();

    assert_eq!("coupon-launch", coupon.id);
    assert_eq!("Launch credit", coupon.name);
    assert_eq!("amount", coupon.discount_type);
    assert_eq!("$8.50", coupon.value);
    assert_eq!("active", coupon.status);

    let offer = sqlx::query(
        r#"
        SELECT o.offer_no, o.offer_code, o.name, o.offer_type, o.audience_scope,
               o.combinability, o.status, v.version_no, v.lifecycle_status,
               v.discount_type, v.discount_value, v.minimum_amount, v.rule_json
        FROM promotion_offer o
        JOIN promotion_offer_version v
          ON v.tenant_id = o.tenant_id
         AND v.offer_id = o.id
        WHERE o.id = 'coupon-launch'
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!("offer-coupon-launch", string_cell(&offer, "offer_no"));
    assert_eq!("coupon-launch", string_cell(&offer, "offer_code"));
    assert_eq!("Launch credit", string_cell(&offer, "name"));
    assert_eq!("coupon", string_cell(&offer, "offer_type"));
    assert_eq!("all", string_cell(&offer, "audience_scope"));
    assert_eq!("exclusive", string_cell(&offer, "combinability"));
    assert_eq!("active", string_cell(&offer, "status"));
    assert_eq!("v1", string_cell(&offer, "version_no"));
    assert_eq!("published", string_cell(&offer, "lifecycle_status"));
    assert_eq!("fixed_amount", string_cell(&offer, "discount_type"));
    assert_eq!("8.50", string_cell(&offer, "discount_value"));
    assert_eq!("0", string_cell(&offer, "minimum_amount"));
    assert_eq!("{}", string_cell(&offer, "rule_json"));

    let (stock, codes) = store
        .generate_promotion_coupon_stock(GeneratePromotionCouponStockCommand {
            subject: admin_subject(),
            stock_uuid: "stock-launch".to_owned(),
            audit_log_uuid: "audit-stock-launch".to_owned(),
            offer_id: "coupon-launch".to_owned(),
            name: "Launch public codes".to_owned(),
            total_quantity: 2,
            code_prefix: "LAUNCH".to_owned(),
            request_id: "req-stock-launch".to_owned(),
            requested_at: "2026-05-24T10:05:00Z".to_owned(),
        })
        .await
        .unwrap();

    assert_eq!("stock-launch", stock.id);
    assert_eq!("coupon-launch", stock.offer_id);
    assert_eq!("Launch public codes", stock.name);
    assert_eq!(2, stock.total_quantity);
    assert_eq!("LAUNCH", stock.code_prefix);
    assert_eq!(2, codes.len());
    assert_eq!("LAUNCH-0001", codes[0].promotion_code);
    assert_eq!("LAUNCH-0002", codes[1].promotion_code);

    let stock = sqlx::query(
        r#"
        SELECT name, stock_no, offer_id, stock_type, total_quantity, available_quantity,
               claimed_quantity, redeemed_quantity, locked_quantity, status
        FROM promotion_coupon_stock
        WHERE id = 'stock-launch'
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!("Launch public codes", string_cell(&stock, "name"));
    assert_eq!("stock-LAUNCH-stock-launch", string_cell(&stock, "stock_no"));
    assert_eq!("coupon-launch", string_cell(&stock, "offer_id"));
    assert_eq!("code_claim", string_cell(&stock, "stock_type"));
    assert_eq!(2, integer_cell(&stock, "total_quantity"));
    assert_eq!(2, integer_cell(&stock, "available_quantity"));
    assert_eq!(0, integer_cell(&stock, "claimed_quantity"));
    assert_eq!(0, integer_cell(&stock, "redeemed_quantity"));
    assert_eq!(0, integer_cell(&stock, "locked_quantity"));
    assert_eq!("active", string_cell(&stock, "status"));

    let promotion_code_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM promotion_code WHERE stock_id = 'stock-launch' AND offer_version_id = 'coupon-launch-version-v1'",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(2, promotion_code_count);

    let coupons = store
        .list_promotion_offers(ListPromotionOffersQuery {
            subject: admin_subject(),
        })
        .await
        .unwrap();
    assert_eq!(1, coupons.len());
    assert_eq!("coupon-launch", coupons[0].id);

    let batches = store
        .list_promotion_coupon_stocks(ListPromotionCouponStocksQuery {
            subject: admin_subject(),
        })
        .await
        .unwrap();
    assert_eq!(1, batches.len());
    assert_eq!("Launch public codes", batches[0].name);

    let listed_codes = store
        .list_promotion_codes(ListPromotionCodesQuery {
            subject: admin_subject(),
        })
        .await
        .unwrap();
    assert_eq!(2, listed_codes.len());
    assert_eq!("available", listed_codes[0].status);
    assert_eq!("available", listed_codes[1].status);
}

#[tokio::test]
async fn sqlite_admin_marketing_coupon_update_publishes_immutable_offer_versions() {
    let pool = migrated_pool().await;
    let store = SqliteAdminMarketingStore::new(pool.clone());

    store
        .create_promotion_offer(CreatePromotionOfferCommand {
            subject: admin_subject(),
            offer_uuid: "coupon-versioned".to_owned(),
            audit_log_uuid: "audit-coupon-versioned-create".to_owned(),
            name: "Versioned coupon".to_owned(),
            discount_type: "amount".to_owned(),
            value: "$5.00".to_owned(),
            amount_cents: 500,
            discount_value: None,
            status: "active".to_owned(),
            request_id: "req-coupon-versioned-create".to_owned(),
            requested_at: "2026-05-24T11:00:00Z".to_owned(),
        })
        .await
        .unwrap();

    let (v1_stock, _) = store
        .generate_promotion_coupon_stock(GeneratePromotionCouponStockCommand {
            subject: admin_subject(),
            stock_uuid: "stock-versioned-v1".to_owned(),
            audit_log_uuid: "audit-stock-versioned-v1".to_owned(),
            offer_id: "coupon-versioned".to_owned(),
            name: "Versioned v1 public codes".to_owned(),
            total_quantity: 1,
            code_prefix: "VER1".to_owned(),
            request_id: "req-stock-versioned-v1".to_owned(),
            requested_at: "2026-05-24T11:05:00Z".to_owned(),
        })
        .await
        .unwrap();
    assert_eq!("stock-versioned-v1", v1_stock.id);

    let updated = store
        .update_promotion_offer(UpdatePromotionOfferCommand {
            subject: admin_subject(),
            offer_id: "coupon-versioned".to_owned(),
            audit_log_uuid: "audit-coupon-versioned-update".to_owned(),
            name: "Versioned coupon updated".to_owned(),
            discount_type: "discount".to_owned(),
            value: "15.00%".to_owned(),
            amount_cents: 0,
            discount_value: Some("15.0000".to_owned()),
            status: "active".to_owned(),
            request_id: "req-coupon-versioned-update".to_owned(),
            requested_at: "2026-05-24T11:10:00Z".to_owned(),
        })
        .await
        .unwrap();
    assert_eq!("coupon-versioned", updated.id);
    assert_eq!("Versioned coupon updated", updated.name);
    assert_eq!("discount", updated.discount_type);
    assert_eq!("15.00%", updated.value);

    let versions = sqlx::query(
        r#"
        SELECT id, version_no, lifecycle_status, discount_type, discount_value
        FROM promotion_offer_version
        WHERE offer_id = 'coupon-versioned'
        ORDER BY CAST(SUBSTR(version_no, 2) AS INTEGER)
        "#,
    )
    .fetch_all(&pool)
    .await
    .unwrap();
    assert_eq!(2, versions.len());
    assert_eq!(
        "coupon-versioned-version-v1",
        string_cell(&versions[0], "id")
    );
    assert_eq!("v1", string_cell(&versions[0], "version_no"));
    assert_eq!("published", string_cell(&versions[0], "lifecycle_status"));
    assert_eq!("fixed_amount", string_cell(&versions[0], "discount_type"));
    assert_eq!("5.00", string_cell(&versions[0], "discount_value"));
    assert_eq!(
        "coupon-versioned-version-v2",
        string_cell(&versions[1], "id")
    );
    assert_eq!("v2", string_cell(&versions[1], "version_no"));
    assert_eq!("published", string_cell(&versions[1], "lifecycle_status"));
    assert_eq!("percent_off", string_cell(&versions[1], "discount_type"));
    assert_eq!("15.0000", string_cell(&versions[1], "discount_value"));

    let current_version_id: String = sqlx::query_scalar(
        "SELECT current_offer_version_id FROM promotion_offer WHERE id = 'coupon-versioned'",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!("coupon-versioned-version-v2", current_version_id);

    let v1_stock_version: String = sqlx::query_scalar(
        "SELECT offer_version_id FROM promotion_coupon_stock WHERE id = 'stock-versioned-v1'",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!("coupon-versioned-version-v1", v1_stock_version);
    let v1_code_version: String = sqlx::query_scalar(
        "SELECT offer_version_id FROM promotion_code WHERE stock_id = 'stock-versioned-v1'",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!("coupon-versioned-version-v1", v1_code_version);

    let (v2_stock, _) = store
        .generate_promotion_coupon_stock(GeneratePromotionCouponStockCommand {
            subject: admin_subject(),
            stock_uuid: "stock-versioned-v2".to_owned(),
            audit_log_uuid: "audit-stock-versioned-v2".to_owned(),
            offer_id: "coupon-versioned".to_owned(),
            name: "Versioned v2 public codes".to_owned(),
            total_quantity: 1,
            code_prefix: "VER2".to_owned(),
            request_id: "req-stock-versioned-v2".to_owned(),
            requested_at: "2026-05-24T11:15:00Z".to_owned(),
        })
        .await
        .unwrap();
    assert_eq!("stock-versioned-v2", v2_stock.id);

    let v2_stock_version: String = sqlx::query_scalar(
        "SELECT offer_version_id FROM promotion_coupon_stock WHERE id = 'stock-versioned-v2'",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!("coupon-versioned-version-v2", v2_stock_version);
    let v2_code_version: String = sqlx::query_scalar(
        "SELECT offer_version_id FROM promotion_code WHERE stock_id = 'stock-versioned-v2'",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!("coupon-versioned-version-v2", v2_code_version);

    let coupons = store
        .list_promotion_offers(ListPromotionOffersQuery {
            subject: admin_subject(),
        })
        .await
        .unwrap();
    assert_eq!(1, coupons.len());
    assert_eq!("coupon-versioned", coupons[0].id);
    assert_eq!("discount", coupons[0].discount_type);
    assert_eq!("15.00%", coupons[0].value);
}

async fn migrated_pool() -> SqlitePool {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    sqlx::query(sdkwork_commerce_storage_sqlx::commerce_initial_migration_sql())
        .execute(&pool)
        .await
        .unwrap();
    for statement in [
        r#"
        CREATE TABLE iam_user (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            username TEXT,
            email TEXT
        )
        "#,
        r#"
        CREATE TABLE ops_audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL,
            tenant_id INTEGER,
            organization_id INTEGER,
            request_id TEXT,
            trace_id TEXT,
            operator_id INTEGER,
            action TEXT,
            target_type INTEGER,
            target_id INTEGER,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            metadata TEXT NOT NULL DEFAULT '{}',
            operator_type INTEGER,
            target_uuid TEXT,
            change_summary TEXT
        )
        "#,
    ] {
        sqlx::query(statement).execute(&pool).await.unwrap();
    }
    pool
}

fn admin_subject() -> AdminMarketingSubject {
    AdminMarketingSubject {
        tenant_id: 100001,
        organization_id: 0,
        operator_id: 30,
        operator_type: 1,
    }
}

fn string_cell(row: &sqlx::sqlite::SqliteRow, column: &str) -> String {
    row.try_get::<String, _>(column)
        .or_else(|_| {
            row.try_get::<Option<String>, _>(column)
                .map(|value| value.unwrap_or_default())
        })
        .unwrap()
}

fn integer_cell(row: &sqlx::sqlite::SqliteRow, column: &str) -> i64 {
    row.try_get::<i64, _>(column)
        .or_else(|_| row.try_get::<i32, _>(column).map(i64::from))
        .unwrap()
}

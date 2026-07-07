use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_claw_http::TrustedRequestSubject;
use sdkwork_claw_test_support::{
    app_session_dual_token_headers, seeded_sqlite_catalog, trusted_request_subject,
};
use serde_json::{json, Value};
use sqlx::SqlitePool;
use std::time::{SystemTime, UNIX_EPOCH};
use tower::ServiceExt;

#[tokio::test]
async fn product_center_backend_routes_use_real_catalog_and_inventory_handlers() {
    let catalog = seeded_sqlite_catalog().await.unwrap();
    let pool = catalog.open_pool().await.unwrap();
    create_product_center_schema(&pool).await;
    seed_product_center_data(&pool).await;
    let router = sdkwork_clawrouter_admin_gateway::router_with_sqlite_product_catalog(pool.clone())
        .await
        .unwrap();

    let products = request_json(
        router.clone(),
        signed_request(
            "GET",
            "/backend/v3/api/catalog/products?q=Oxford",
            Body::empty(),
        ),
    )
    .await;
    assert_eq!("2000", products["code"]);
    assert_ne!("Not implemented", products["msg"]);
    assert_eq!(
        "spu-product-center-shirt",
        products["data"]["items"][0]["id"]
    );
    assert_eq!("PC-SPU-OXFORD-SHIRT", products["data"]["items"][0]["spuNo"]);
    assert_eq!("physical_good", products["data"]["items"][0]["productType"]);
    assert_eq!(
        json!(["category-product-center-apparel"]),
        products["data"]["items"][0]["categoryIds"]
    );
    assert_eq!(
        "sku-product-center-shirt-red-s",
        products["data"]["items"][0]["defaultSkuId"]
    );
    assert_eq!("199.00", products["data"]["items"][0]["minPriceAmount"]);
    assert_eq!("USD", products["data"]["items"][0]["currencyCode"]);

    let product_by_id = request_json(
        router.clone(),
        signed_request(
            "GET",
            "/backend/v3/api/catalog/products?q=spu-product-center-shirt",
            Body::empty(),
        ),
    )
    .await;
    assert_eq!("2000", product_by_id["code"]);
    assert_eq!(
        "spu-product-center-shirt", product_by_id["data"]["items"][0]["id"],
        "product edit URLs must be able to hydrate a product draft by product id"
    );

    let skus = request_json(
        router.clone(),
        signed_request(
            "GET",
            "/backend/v3/api/catalog/skus?product_id=spu-product-center-shirt",
            Body::empty(),
        ),
    )
    .await;
    assert_eq!("2000", skus["code"]);
    assert_eq!("PC-SKU-OXFORD-RED-S", skus["data"]["items"][0]["skuNo"]);
    assert_eq!(
        "physical_shipment",
        skus["data"]["items"][0]["fulfillmentType"]
    );
    assert_eq!("199.00", skus["data"]["items"][0]["defaultPriceAmount"]);
    assert_eq!(
        "Color",
        skus["data"]["items"][0]["attributes"][0]["attributeName"]
    );
    assert_eq!(
        "Red",
        skus["data"]["items"][0]["attributes"][0]["displayValue"]
    );

    let sku_create_body = Body::from(
        json!({
            "skuNo": "PC-SKU-OXFORD-BLUE-M",
            "productId": "spu-product-center-shirt",
            "title": "Oxford Shirt Blue M",
            "fulfillmentType": "physical_shipment",
            "taxCategory": "standard",
            "salesUnit": "piece",
            "barcode": "BAR-PC-SKU-OXFORD-BLUE-M",
            "defaultPriceAmount": "209.00",
            "defaultCurrencyCode": "USD",
            "status": "active",
            "image": {
                "kind": "image",
                "source": "external_url",
                "url": "https://cdn.example.test/products/oxford-blue-m.png",
                "publicUrl": "https://cdn.example.test/products/oxford-blue-m.png",
                "altText": "Oxford Shirt Blue M"
            },
            "attributes": [
                {
                    "attributeId": "attribute-product-center-color",
                    "attributeValueId": "attribute-value-product-center-red",
                    "attributeName": "Color",
                    "displayValue": "Blue",
                    "valueCode": "blue"
                }
            ]
        })
        .to_string(),
    );
    let created_sku = request_json(
        router.clone(),
        signed_request_builder(
            "POST",
            "/backend/v3/api/catalog/skus",
            bootstrap_admin_subject(),
        )
        .header("idempotency-key", "catalog-sku-create-media-test")
        .body(sku_create_body)
        .unwrap(),
    )
    .await;
    assert_eq!("2000", created_sku["code"]);
    assert_eq!(
        "BAR-PC-SKU-OXFORD-BLUE-M",
        created_sku["data"]["item"]["barcode"]
    );
    assert_eq!("image", created_sku["data"]["item"]["image"]["kind"]);
    assert_eq!(
        "https://cdn.example.test/products/oxford-blue-m.png",
        created_sku["data"]["item"]["image"]["publicUrl"]
    );
    let media_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM commerce_product_media WHERE owner_type = 'sku' AND owner_id = ? AND media_role = 'sku_image'",
    )
    .bind(created_sku["data"]["item"]["id"].as_str().unwrap())
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(1, media_count);

    let stocks = request_json(
        router.clone(),
        signed_request(
            "GET",
            "/backend/v3/api/inventory/stocks?sku_id=sku-product-center-shirt-red-s",
            Body::empty(),
        ),
    )
    .await;
    assert_eq!("2000", stocks["code"]);
    assert_eq!(
        "stock-product-center-shirt-main",
        stocks["data"]["items"][0]["id"]
    );
    assert_eq!(12, stocks["data"]["items"][0]["availableQuantity"]);
    assert_eq!(2, stocks["data"]["items"][0]["reservedQuantity"]);
    assert_eq!(2, stocks["data"]["items"][0]["version"]);

    let update_body = Body::from(
        json!({
            "availableQuantity": 15,
            "reservedQuantity": 2,
            "status": "active",
            "version": 2,
            "reasonCode": "cycle_count"
        })
        .to_string(),
    );
    let updated = request_json(
        router.clone(),
        signed_request_builder(
            "PATCH",
            "/backend/v3/api/inventory/stocks/stock-product-center-shirt-main",
            bootstrap_admin_subject(),
        )
        .header("idempotency-key", "inventory-stock-update-test-1")
        .body(update_body)
        .unwrap(),
    )
    .await;
    assert_eq!("2000", updated["code"]);
    assert_eq!(15, updated["data"]["item"]["availableQuantity"]);
    assert_eq!(3, updated["data"]["item"]["version"]);

    let stale_update = router
        .clone()
        .oneshot(
            signed_request_builder(
                "PATCH",
                "/backend/v3/api/inventory/stocks/stock-product-center-shirt-main",
                bootstrap_admin_subject(),
            )
            .header("idempotency-key", "inventory-stock-update-stale")
            .body(Body::from(
                json!({
                    "availableQuantity": 16,
                    "version": 2,
                    "reasonCode": "stale_write"
                })
                .to_string(),
            ))
            .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(StatusCode::CONFLICT, stale_update.status());

    let ledger = request_json(
        router,
        signed_request(
            "GET",
            "/backend/v3/api/inventory/ledger_entries?source_id=stock-product-center-shirt-main",
            Body::empty(),
        ),
    )
    .await;
    assert_eq!("2000", ledger["code"]);
    assert_eq!("in", ledger["data"]["items"][0]["direction"]);
    assert_eq!(3, ledger["data"]["items"][0]["quantity"]);
    assert_eq!(15, ledger["data"]["items"][0]["balanceAfter"]);
    assert_eq!("cycle_count", ledger["data"]["items"][0]["businessType"]);
    assert_eq!("stock_adjustment", ledger["data"]["items"][0]["sourceType"]);

    pool.close().await;
}

#[tokio::test]
async fn product_center_sku_delete_route_archives_only_the_sku() {
    let catalog = seeded_sqlite_catalog().await.unwrap();
    let pool = catalog.open_pool().await.unwrap();
    create_product_center_schema(&pool).await;
    seed_product_center_data(&pool).await;
    let router = sdkwork_clawrouter_admin_gateway::router_with_sqlite_product_catalog(pool.clone())
        .await
        .unwrap();

    let deleted = request_json(
        router.clone(),
        signed_request(
            "DELETE",
            "/backend/v3/api/catalog/skus/sku-product-center-shirt-red-s",
            Body::empty(),
        ),
    )
    .await;
    assert_eq!("2000", deleted["code"]);
    assert_eq!(true, deleted["data"]["deleted"]);

    let sku_status: String =
        sqlx::query_scalar("SELECT sales_status FROM commerce_product_sku WHERE id = ?")
            .bind("sku-product-center-shirt-red-s")
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!("archived", sku_status);

    let product_status: String =
        sqlx::query_scalar("SELECT sales_status FROM commerce_product_spu WHERE id = ?")
            .bind("spu-product-center-shirt")
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!("active", product_status);

    pool.close().await;
}

#[tokio::test]
async fn product_center_product_create_route_persists_multiple_leaf_categories() {
    let catalog = seeded_sqlite_catalog().await.unwrap();
    let pool = catalog.open_pool().await.unwrap();
    create_product_center_schema(&pool).await;
    seed_product_center_data(&pool).await;
    sqlx::query(
        r#"INSERT INTO commerce_product_category
            (id, tenant_id, organization_id, category_no, parent_category_id, name, sort_weight, status, created_at, updated_at)
            VALUES ('category-product-center-clearance', '100001', '0', 'PC-CAT-CLEARANCE', NULL, 'Clearance', 20, 'active', '2026-05-31 09:00:00', '2026-05-31 09:00:00')"#,
    )
    .execute(&pool)
    .await
    .unwrap();
    let router = sdkwork_clawrouter_admin_gateway::router_with_sqlite_product_catalog(pool.clone())
        .await
        .unwrap();

    let created = request_json(
        router.clone(),
        signed_request_builder(
            "POST",
            "/backend/v3/api/catalog/products",
            bootstrap_admin_subject(),
        )
        .header("idempotency-key", "catalog-product-create-multi-category-test")
        .body(Body::from(
            json!({
                "spuNo": "PC-SPU-MULTI-CATEGORY",
                "productType": "physical_good",
                "title": "Multi Category Shirt",
                "subtitle": "Category binding test",
                "description": "A product assigned to two leaf categories.",
                "categoryIds": ["category-product-center-apparel", "category-product-center-clearance"],
                "brand": "SdkWork",
                "status": "active"
            })
            .to_string(),
        ))
        .unwrap(),
    )
    .await;
    assert_eq!("2000", created["code"]);
    assert_eq!(
        json!([
            "category-product-center-apparel",
            "category-product-center-clearance"
        ]),
        created["data"]["item"]["categoryIds"]
    );

    let binding_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(1) FROM commerce_product_spu_category WHERE spu_id = ? AND status = 'active'",
    )
    .bind(created["data"]["item"]["id"].as_str().unwrap())
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(2, binding_count);

    let filtered = request_json(
        router,
        signed_request(
            "GET",
            "/backend/v3/api/catalog/products?category_id=category-product-center-clearance&q=Multi",
            Body::empty(),
        ),
    )
    .await;
    assert_eq!("2000", filtered["code"]);
    assert_eq!(
        created["data"]["item"]["id"],
        filtered["data"]["items"][0]["id"]
    );

    pool.close().await;
}

#[tokio::test]
async fn product_center_product_delete_route_archives_product_and_child_skus() {
    let catalog = seeded_sqlite_catalog().await.unwrap();
    let pool = catalog.open_pool().await.unwrap();
    create_product_center_schema(&pool).await;
    seed_product_center_data(&pool).await;
    let router = sdkwork_clawrouter_admin_gateway::router_with_sqlite_product_catalog(pool.clone())
        .await
        .unwrap();

    let deleted = request_json(
        router.clone(),
        signed_request(
            "DELETE",
            "/backend/v3/api/catalog/products/spu-product-center-shirt",
            Body::empty(),
        ),
    )
    .await;
    assert_eq!("2000", deleted["code"]);
    assert_eq!(true, deleted["data"]["deleted"]);

    let product_status: String =
        sqlx::query_scalar("SELECT sales_status FROM commerce_product_spu WHERE id = ?")
            .bind("spu-product-center-shirt")
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!("archived", product_status);

    let sku_status: String =
        sqlx::query_scalar("SELECT sales_status FROM commerce_product_sku WHERE id = ?")
            .bind("sku-product-center-shirt-red-s")
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!("archived", sku_status);

    pool.close().await;
}

#[tokio::test]
async fn product_center_category_routes_support_unicode_multi_level_crud_guards() {
    let catalog = seeded_sqlite_catalog().await.unwrap();
    let pool = catalog.open_pool().await.unwrap();
    create_product_center_schema(&pool).await;
    create_category_seed_schema(&pool).await;
    let router = sdkwork_clawrouter_admin_gateway::router_with_sqlite_product_catalog(pool.clone())
        .await
        .unwrap();

    let root = request_json(
        router.clone(),
        signed_request_builder(
            "POST",
            "/backend/v3/api/catalog/categories",
            bootstrap_admin_subject(),
        )
        .header("idempotency-key", "catalog-category-unicode-root")
        .body(Body::from(
            json!({
                "categoryNo": "WX-FOOD",
                "name": "食品饮料",
                "status": "active",
                "sortOrder": 10
            })
            .to_string(),
        ))
        .unwrap(),
    )
    .await;
    assert_eq!("食品饮料", root["data"]["item"]["name"]);

    let root_id = root["data"]["item"]["id"].as_str().unwrap();
    let child = request_json(
        router.clone(),
        signed_request_builder(
            "POST",
            "/backend/v3/api/catalog/categories",
            bootstrap_admin_subject(),
        )
        .header("idempotency-key", "catalog-category-unicode-child")
        .body(Body::from(
            json!({
                "categoryNo": "WX-FOOD-SNACKS",
                "parentId": root_id,
                "name": "休闲零食",
                "status": "active",
                "sortOrder": 20
            })
            .to_string(),
        ))
        .unwrap(),
    )
    .await;
    let child_id = child["data"]["item"]["id"].as_str().unwrap();

    let grandchild = request_json(
        router.clone(),
        signed_request_builder(
            "POST",
            "/backend/v3/api/catalog/categories",
            bootstrap_admin_subject(),
        )
        .header("idempotency-key", "catalog-category-unicode-grandchild")
        .body(Body::from(
            json!({
                "categoryNo": "WX-FOOD-SNACKS-NUTS",
                "parentId": child_id,
                "name": "坚果炒货",
                "status": "active",
                "sortOrder": 30
            })
            .to_string(),
        ))
        .unwrap(),
    )
    .await;
    let grandchild_id = grandchild["data"]["item"]["id"].as_str().unwrap();

    let categories = request_json(
        router.clone(),
        signed_request(
            "GET",
            "/backend/v3/api/catalog/categories?page=1&page_size=20",
            Body::empty(),
        ),
    )
    .await;
    let items = categories["data"]["items"].as_array().unwrap();
    let leaf = items
        .iter()
        .find(|item| item["id"].as_str() == Some(grandchild_id))
        .unwrap();
    assert_eq!(2, leaf["levelNo"]);
    assert_eq!("WX-FOOD/WX-FOOD-SNACKS/WX-FOOD-SNACKS-NUTS", leaf["path"]);

    let cycle_response = router
        .clone()
        .oneshot(
            signed_request_builder(
                "PATCH",
                &format!("/backend/v3/api/catalog/categories/{root_id}"),
                bootstrap_admin_subject(),
            )
            .header("idempotency-key", "catalog-category-cycle-guard")
            .body(Body::from(
                json!({
                    "categoryNo": "WX-FOOD",
                    "parentId": grandchild_id,
                    "name": "食品饮料",
                    "status": "active",
                    "sortOrder": 10
                })
                .to_string(),
            ))
            .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(StatusCode::CONFLICT, cycle_response.status());

    let delete_parent_response = router
        .clone()
        .oneshot(signed_request(
            "DELETE",
            &format!("/backend/v3/api/catalog/categories/{root_id}"),
            Body::empty(),
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::CONFLICT, delete_parent_response.status());

    sqlx::query(
        r#"INSERT INTO commerce_product_spu
            (id, tenant_id, organization_id, spu_no, title, subtitle, description, product_type, sales_status, visible_surfaces, created_at, updated_at)
            VALUES ('spu-category-delete-guard', '100001', '0', 'SPU-CATEGORY-DELETE-GUARD', 'Category Delete Guard', NULL, NULL, 'physical_good', 'active', '["backend"]', '2026-06-01 00:00:00', '2026-06-01 00:00:00')"#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"INSERT INTO commerce_product_spu_category
            (id, tenant_id, organization_id, spu_id, category_id, primary_flag, sort_order, status, created_at, updated_at)
            VALUES ('spu-category-delete-guard-binding', '100001', '0', 'spu-category-delete-guard', ?, 1, 0, 'active', '2026-06-01 00:00:00', '2026-06-01 00:00:00')"#,
    )
    .bind(grandchild_id)
    .execute(&pool)
    .await
    .unwrap();

    let delete_used_leaf_response = router
        .clone()
        .oneshot(signed_request(
            "DELETE",
            &format!("/backend/v3/api/catalog/categories/{grandchild_id}"),
            Body::empty(),
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::CONFLICT, delete_used_leaf_response.status());

    pool.close().await;
}

#[tokio::test]
async fn product_center_category_attribute_routes_manage_binding_lifecycle() {
    let catalog = seeded_sqlite_catalog().await.unwrap();
    let pool = catalog.open_pool().await.unwrap();
    create_product_center_schema(&pool).await;
    seed_product_center_data(&pool).await;
    let router = sdkwork_clawrouter_admin_gateway::router_with_sqlite_product_catalog(pool.clone())
        .await
        .unwrap();

    let created = request_json(
        router.clone(),
        signed_request_builder(
            "POST",
            "/backend/v3/api/catalog/category_attributes",
            bootstrap_admin_subject(),
        )
        .header("idempotency-key", "catalog-category-attribute-create-test")
        .body(Body::from(
            json!({
                "categoryId": "category-product-center-apparel",
                "attributeId": "attribute-product-center-color",
                "required": true,
                "searchable": true,
                "filterable": true,
                "sortOrder": 12,
                "status": "active"
            })
            .to_string(),
        ))
        .unwrap(),
    )
    .await;
    assert_eq!("2000", created["code"]);
    let binding_id = created["data"]["item"]["id"].as_str().unwrap();
    assert_eq!(
        "category-product-center-apparel",
        created["data"]["item"]["categoryId"]
    );
    assert_eq!(
        "attribute-product-center-color",
        created["data"]["item"]["attributeId"]
    );
    assert_eq!("Apparel", created["data"]["item"]["categoryName"]);
    assert_eq!("PC-CAT-APPAREL", created["data"]["item"]["categoryPath"]);
    assert_eq!("PC-ATTR-COLOR", created["data"]["item"]["attributeNo"]);
    assert_eq!("Color", created["data"]["item"]["attributeName"]);
    assert_eq!("enum", created["data"]["item"]["valueType"]);
    assert_eq!("both", created["data"]["item"]["scope"]);
    assert_eq!(true, created["data"]["item"]["required"]);
    assert_eq!(12, created["data"]["item"]["sortOrder"]);

    let persisted_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(1) FROM commerce_product_category_attribute WHERE category_id = ? AND attribute_id = ? AND status = 'active'",
    )
    .bind("category-product-center-apparel")
    .bind("attribute-product-center-color")
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(1, persisted_count);

    let listed = request_json(
        router.clone(),
        signed_request(
            "GET",
            "/backend/v3/api/catalog/category_attributes?category_id=category-product-center-apparel&page=1&page_size=20",
            Body::empty(),
        ),
    )
    .await;
    assert_eq!("2000", listed["code"]);
    assert_eq!(1, listed["data"]["total"]);
    assert_eq!(binding_id, listed["data"]["items"][0]["id"]);

    let updated = request_json(
        router.clone(),
        signed_request_builder(
            "PATCH",
            &format!("/backend/v3/api/catalog/category_attributes/{binding_id}"),
            bootstrap_admin_subject(),
        )
        .header("idempotency-key", "catalog-category-attribute-update-test")
        .body(Body::from(
            json!({
                "categoryId": "category-product-center-apparel",
                "attributeId": "attribute-product-center-color",
                "required": false,
                "searchable": true,
                "filterable": false,
                "sortOrder": 30,
                "status": "inactive"
            })
            .to_string(),
        ))
        .unwrap(),
    )
    .await;
    assert_eq!("2000", updated["code"]);
    assert_eq!(false, updated["data"]["item"]["required"]);
    assert_eq!(false, updated["data"]["item"]["filterable"]);
    assert_eq!(30, updated["data"]["item"]["sortOrder"]);
    assert_eq!("inactive", updated["data"]["item"]["status"]);

    let deleted = request_json(
        router.clone(),
        signed_request(
            "DELETE",
            &format!("/backend/v3/api/catalog/category_attributes/{binding_id}"),
            Body::empty(),
        ),
    )
    .await;
    assert_eq!("2000", deleted["code"]);
    assert_eq!(true, deleted["data"]["deleted"]);

    let status: String =
        sqlx::query_scalar("SELECT status FROM commerce_product_category_attribute WHERE id = ?")
            .bind(binding_id)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!("archived", status);

    pool.close().await;
}

#[tokio::test]
async fn product_center_category_seed_initializer_imports_data_directories_idempotently() {
    let catalog = seeded_sqlite_catalog().await.unwrap();
    let pool = catalog.open_pool().await.unwrap();
    create_product_center_schema(&pool).await;
    create_category_seed_schema(&pool).await;
    let router = sdkwork_clawrouter_admin_gateway::router_with_sqlite_product_catalog(pool.clone())
        .await
        .unwrap();

    let first = request_json(
        router.clone(),
        signed_request_builder(
            "POST",
            "/backend/v3/api/catalog/category_seeds/initialize",
            bootstrap_admin_subject(),
        )
        .header("idempotency-key", "category-seed-initialize-first")
        .body(Body::from(
            json!({
                "datasets": ["product", "agents", "agent-skills", "mcp"],
                "mode": "admin_button"
            })
            .to_string(),
        ))
        .unwrap(),
    )
    .await;
    assert_eq!("2000", first["code"]);
    let summaries = first["data"]["items"].as_array().unwrap();
    assert_eq!(4, summaries.len());
    assert!(summaries.iter().any(|item| {
        item["dataset"] == "product"
            && item["targetTable"] == "commerce_product_category"
            && item["upserted"].as_i64().unwrap_or_default() >= 2900
    }));
    assert!(summaries.iter().any(|item| {
        item["dataset"] == "agent-skills"
            && item["targetTable"] == "c_category"
            && item["upserted"].as_i64().unwrap_or_default() >= 8
    }));

    let product_count_after_first: i64 =
        sqlx::query_scalar("SELECT COUNT(1) FROM commerce_product_category")
            .fetch_one(&pool)
            .await
            .unwrap();
    let plus_count_after_first: i64 = sqlx::query_scalar(
        "SELECT COUNT(1) FROM c_category WHERE category_type IN ('agent', 'skill_market', 'mcp')",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert!(product_count_after_first >= 2900);
    assert!(plus_count_after_first >= 30);

    let product_top_level_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(1) FROM commerce_product_category WHERE parent_category_id IS NULL",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert!(
        product_top_level_count >= 35,
        "product seed must cover the public WeChat Shop first-level category surface"
    );

    let product_four_level_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM commerce_product_category c
        JOIN commerce_product_category p1 ON c.parent_category_id = p1.id
        JOIN commerce_product_category p2 ON p1.parent_category_id = p2.id
        JOIN commerce_product_category p3 ON p2.parent_category_id = p3.id
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert!(
        product_four_level_count >= 2200,
        "product seed must include enough fourth-level leaves for store operations"
    );

    let templated_leaf_query = format!(
        r#"
        SELECT COUNT(1)
        FROM commerce_product_category c
        LEFT JOIN commerce_product_category child ON child.parent_category_id = c.id
        WHERE child.id IS NULL
          AND (
            c.name LIKE '%{featured}'
            OR c.name LIKE '%{entry}'
            OR c.name LIKE '%{professional}'
            OR c.name LIKE '%{bundle}'
          )
        "#,
        featured = "\u{7cbe}\u{9009}",
        entry = "\u{5165}\u{95e8}",
        professional = "\u{4e13}\u{4e1a}",
        bundle = "\u{5957}\u{88c5}",
    );
    let templated_leaf_count: i64 = sqlx::query_scalar(&templated_leaf_query)
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(
        0, templated_leaf_count,
        "product seed leaves must be concrete category names, not generic template suffixes"
    );

    let product_root_names: Vec<String> = sqlx::query_scalar(
        "SELECT name FROM commerce_product_category WHERE parent_category_id IS NULL",
    )
    .fetch_all(&pool)
    .await
    .unwrap();
    for expected_root in [
        "宠物生活",
        "厨具",
        "家用电器",
        "手机通讯",
        "数码",
        "电脑&办公",
        "服饰内衣",
        "鞋靴",
        "个人护理",
        "母婴",
        "美妆护肤",
        "家纺",
        "家居日用",
        "家具",
        "家庭清洁&纸品",
        "家装建材",
        "工业品",
        "汽车用品",
        "玩具乐器",
        "运动户外",
        "箱包皮具",
        "酒类",
        "食品饮料",
        "钟表",
        "农资园艺",
        "生鲜",
        "二手",
        "生活服务",
        "图书",
        "艺术品",
        "教育培训",
        "珠宝首饰",
        "保健膳食",
        "医疗健康",
        "虚拟商品",
    ] {
        assert!(
            product_root_names.iter().any(|name| name == expected_root),
            "product seed missing WeChat Shop root category {expected_root}"
        );
    }

    let product_root_name: String = sqlx::query_scalar(
        "SELECT name FROM commerce_product_category WHERE category_no = 'WX-FOOD'",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!("\u{98df}\u{54c1}\u{996e}\u{6599}", product_root_name);

    let second = request_json(
        router,
        signed_request_builder(
            "POST",
            "/backend/v3/api/catalog/category_seeds/initialize",
            bootstrap_admin_subject(),
        )
        .header("idempotency-key", "category-seed-initialize-second")
        .body(Body::from(
            json!({
                "datasets": ["product", "agents", "agent-skills", "mcp"],
                "mode": "admin_button"
            })
            .to_string(),
        ))
        .unwrap(),
    )
    .await;
    assert_eq!("2000", second["code"]);

    let product_count_after_second: i64 =
        sqlx::query_scalar("SELECT COUNT(1) FROM commerce_product_category")
            .fetch_one(&pool)
            .await
            .unwrap();
    let plus_count_after_second: i64 = sqlx::query_scalar(
        "SELECT COUNT(1) FROM c_category WHERE category_type IN ('agent', 'skill_market', 'mcp')",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(product_count_after_first, product_count_after_second);
    assert_eq!(plus_count_after_first, plus_count_after_second);

    pool.close().await;
}

async fn seed_product_center_data(pool: &SqlitePool) {
    for statement in [
        r#"INSERT INTO commerce_product_category
            (id, tenant_id, organization_id, category_no, parent_category_id, name, sort_weight, status, created_at, updated_at)
            VALUES ('category-product-center-apparel', '100001', '0', 'PC-CAT-APPAREL', NULL, 'Apparel', 10, 'active', '2026-05-31 09:00:00', '2026-05-31 09:00:00')"#,
        r#"INSERT INTO commerce_product_attribute
            (id, tenant_id, organization_id, attribute_no, name, value_type, status, sort_weight, created_at, updated_at)
            VALUES ('attribute-product-center-color', '100001', '0', 'PC-ATTR-COLOR', 'Color', 'enum', 'active', 10, '2026-05-31 09:00:00', '2026-05-31 09:00:00')"#,
        r#"INSERT INTO commerce_product_attribute_value
            (id, tenant_id, organization_id, attribute_id, value_code, display_value, sort_order, status, created_at, updated_at)
            VALUES ('attribute-value-product-center-red', '100001', '0', 'attribute-product-center-color', 'red', 'Red', 10, 'active', '2026-05-31 09:00:00', '2026-05-31 09:00:00')"#,
        r#"INSERT INTO commerce_product_spu
            (id, tenant_id, organization_id, spu_no, title, subtitle, description, product_type, sales_status, visible_surfaces, created_at, updated_at)
            VALUES ('spu-product-center-shirt', '100001', '0', 'PC-SPU-OXFORD-SHIRT', 'Product Center Oxford Shirt', 'Standard publish workflow sample', 'A seeded apparel product for Product Center runtime tests.', 'physical_good', 'active', '["backend","app"]', '2026-05-31 09:00:00', '2026-05-31 09:00:00')"#,
        r#"INSERT INTO commerce_product_spu_category
            (id, tenant_id, organization_id, spu_id, category_id, primary_flag, sort_order, status, created_at, updated_at)
            VALUES ('spu-category-product-center-shirt-apparel', '100001', '0', 'spu-product-center-shirt', 'category-product-center-apparel', 1, 0, 'active', '2026-05-31 09:00:00', '2026-05-31 09:00:00')"#,
        r#"INSERT INTO commerce_product_sku
            (id, tenant_id, organization_id, spu_id, sku_no, name, title, price_amount, original_price_amount, currency_code, delivery_mode, inventory_tracking, sales_status, spec_json, created_at, updated_at)
            VALUES ('sku-product-center-shirt-red-s', '100001', '0', 'spu-product-center-shirt', 'PC-SKU-OXFORD-RED-S', 'Oxford Shirt / Red / S', 'Oxford Shirt Red S', '199.00', '249.00', 'USD', 'physical_shipment', 'tracked', 'active', '{"salesUnit":"piece","taxCategory":"standard"}', '2026-05-31 09:00:00', '2026-05-31 09:00:00')"#,
        r#"INSERT INTO commerce_product_sku_attribute
            (id, tenant_id, organization_id, sku_id, attribute_id, attribute_value_id, custom_value, created_at, updated_at)
            VALUES ('sku-attribute-product-center-red', '100001', '0', 'sku-product-center-shirt-red-s', 'attribute-product-center-color', 'attribute-value-product-center-red', NULL, '2026-05-31 09:00:00', '2026-05-31 09:00:00')"#,
        r#"INSERT INTO commerce_inventory_stock
            (id, tenant_id, organization_id, sku_id, warehouse_id, available_quantity, reserved_quantity, sold_quantity, version, status, created_at, updated_at)
            VALUES ('stock-product-center-shirt-main', '100001', '0', 'sku-product-center-shirt-red-s', 'warehouse-east', 12, 2, 5, 2, 'active', '2026-05-31 09:00:00', '2026-05-31 09:00:00')"#,
        r#"INSERT INTO commerce_inventory_reservation
            (id, tenant_id, organization_id, reservation_no, order_id, sku_id, warehouse_id, quantity, status, request_no, idempotency_key, expires_at, consumed_at, released_at, created_at, updated_at)
            VALUES ('reservation-product-center-shirt', '100001', '0', 'PC-RES-OXFORD-1', 'order-product-center-1', 'sku-product-center-shirt-red-s', 'warehouse-east', 2, 'reserved', 'reservation-product-center-shirt', 'reservation-product-center-shirt', '2026-05-31 10:00:00', NULL, NULL, '2026-05-31 09:00:00', '2026-05-31 09:00:00')"#,
        r#"INSERT INTO commerce_inventory_movement
            (id, tenant_id, organization_id, movement_no, sku_id, warehouse_id, movement_type, quantity, business_type, source_id, request_no, idempotency_key, created_at)
            VALUES ('movement-product-center-shirt-initial', '100001', '0', 'PC-MOVE-OXFORD-INITIAL', 'sku-product-center-shirt-red-s', 'warehouse-east', 'in', 12, 'opening_balance', 'seed-product-center', 'movement-product-center-shirt-initial', 'movement-product-center-shirt-initial', '2026-05-31 09:00:00')"#,
    ] {
        sqlx::query(statement).execute(pool).await.unwrap();
    }
}

async fn create_product_center_schema(pool: &SqlitePool) {
    for statement in [
        r#"CREATE TABLE IF NOT EXISTS commerce_product_category (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            category_no TEXT NOT NULL,
            parent_category_id TEXT,
            name TEXT NOT NULL,
            sort_weight INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE (tenant_id, category_no)
        )"#,
        r#"CREATE TABLE IF NOT EXISTS commerce_product_attribute (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            attribute_no TEXT NOT NULL,
            name TEXT NOT NULL,
            value_type TEXT NOT NULL,
            status TEXT NOT NULL,
            sort_weight INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE (tenant_id, attribute_no)
        )"#,
        r#"CREATE TABLE IF NOT EXISTS commerce_product_attribute_value (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            attribute_id TEXT NOT NULL,
            value_code TEXT NOT NULL,
            display_value TEXT NOT NULL,
            sort_order INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE (tenant_id, attribute_id, value_code)
        )"#,
        r#"CREATE TABLE IF NOT EXISTS commerce_product_category_attribute (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            category_id TEXT NOT NULL,
            attribute_id TEXT NOT NULL,
            required INTEGER NOT NULL,
            searchable INTEGER NOT NULL,
            filterable INTEGER NOT NULL,
            sort_order INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE (tenant_id, category_id, attribute_id)
        )"#,
        r#"CREATE TABLE IF NOT EXISTS commerce_product_spu (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            spu_no TEXT NOT NULL,
            title TEXT NOT NULL,
            subtitle TEXT,
            description TEXT,
            product_type TEXT NOT NULL,
            sales_status TEXT NOT NULL,
            visible_surfaces TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE (tenant_id, spu_no)
        )"#,
        r#"CREATE TABLE IF NOT EXISTS commerce_product_spu_category (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            spu_id TEXT NOT NULL,
            category_id TEXT NOT NULL,
            primary_flag INTEGER NOT NULL DEFAULT 0,
            sort_order INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE (tenant_id, spu_id, category_id)
        )"#,
        r#"CREATE TABLE IF NOT EXISTS commerce_product_sku (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            spu_id TEXT NOT NULL,
            sku_no TEXT NOT NULL,
            name TEXT NOT NULL,
            title TEXT NOT NULL,
            price_amount TEXT NOT NULL,
            original_price_amount TEXT,
            currency_code TEXT NOT NULL,
            delivery_mode TEXT NOT NULL,
            inventory_tracking TEXT NOT NULL,
            sales_status TEXT NOT NULL,
            spec_json TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE (tenant_id, sku_no)
        )"#,
        r#"CREATE TABLE IF NOT EXISTS commerce_product_sku_attribute (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            sku_id TEXT NOT NULL,
            attribute_id TEXT NOT NULL,
            attribute_value_id TEXT,
            custom_value TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE (tenant_id, sku_id, attribute_id)
        )"#,
        r#"CREATE TABLE IF NOT EXISTS commerce_product_media (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            owner_type TEXT NOT NULL,
            owner_id TEXT NOT NULL,
            media_role TEXT NOT NULL,
            drive_uri TEXT,
            resource_snapshot TEXT,
            alt_text TEXT,
            sort_order INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE (tenant_id, owner_type, owner_id, media_role, sort_order)
        )"#,
        r#"CREATE TABLE IF NOT EXISTS commerce_inventory_stock (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            sku_id TEXT NOT NULL,
            warehouse_id TEXT,
            available_quantity INTEGER NOT NULL DEFAULT 0,
            reserved_quantity INTEGER NOT NULL DEFAULT 0,
            sold_quantity INTEGER NOT NULL DEFAULT 0,
            version INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE (tenant_id, sku_id, warehouse_id)
        )"#,
        r#"CREATE TABLE IF NOT EXISTS commerce_inventory_reservation (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            reservation_no TEXT NOT NULL,
            order_id TEXT NOT NULL,
            sku_id TEXT NOT NULL,
            warehouse_id TEXT,
            quantity INTEGER NOT NULL,
            status TEXT NOT NULL,
            request_no TEXT NOT NULL,
            idempotency_key TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            consumed_at TEXT,
            released_at TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE (tenant_id, reservation_no)
        )"#,
        r#"CREATE TABLE IF NOT EXISTS commerce_inventory_movement (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            movement_no TEXT NOT NULL,
            sku_id TEXT NOT NULL,
            warehouse_id TEXT,
            movement_type TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            business_type TEXT NOT NULL,
            source_id TEXT NOT NULL,
            request_no TEXT NOT NULL,
            idempotency_key TEXT NOT NULL,
            created_at TEXT NOT NULL,
            UNIQUE (tenant_id, movement_no)
        )"#,
    ] {
        sqlx::query(statement).execute(pool).await.unwrap();
    }
}

async fn create_category_seed_schema(pool: &SqlitePool) {
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS c_category (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL UNIQUE,
            tenant_id INTEGER NOT NULL DEFAULT 0,
            organization_id INTEGER NOT NULL DEFAULT 0,
            data_scope INTEGER NOT NULL DEFAULT 0,
            category_type TEXT NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            code TEXT,
            tags TEXT NOT NULL DEFAULT '[]',
            icon_drive_uri TEXT,
            icon_resource_snapshot TEXT,
            sort_weight INTEGER NOT NULL DEFAULT 0,
            parent_id INTEGER,
            path TEXT,
            visible INTEGER NOT NULL DEFAULT 1,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            v INTEGER NOT NULL DEFAULT 0
        )"#,
    )
    .execute(pool)
    .await
    .unwrap();
}

async fn request_json(router: axum::Router, request: Request<Body>) -> Value {
    let response = router.oneshot(request).await.unwrap();
    let status = response.status();
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(StatusCode::OK, status, "{payload}");
    payload
}

fn signed_request(method: &str, path: &str, body: Body) -> Request<Body> {
    signed_request_builder(method, path, bootstrap_admin_subject())
        .body(body)
        .unwrap()
}

fn bootstrap_admin_subject() -> TrustedRequestSubject {
    trusted_request_subject(100_001, 0, 1)
}

fn signed_request_builder(
    method: &str,
    path: &str,
    subject: TrustedRequestSubject,
) -> axum::http::request::Builder {
    let issued_at = current_unix_seconds();
    let expires_at = issued_at + 3600;
    let (authorization, access_token) =
        app_session_dual_token_headers(subject, issued_at, expires_at).unwrap();
    Request::builder()
        .method(method)
        .uri(path)
        .header("content-type", "application/json")
        .header("authorization", authorization)
        .header("Access-Token", access_token)
}

fn current_unix_seconds() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs() as i64)
        .unwrap_or(0)
}

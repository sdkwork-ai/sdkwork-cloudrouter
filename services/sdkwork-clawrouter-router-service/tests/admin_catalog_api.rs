pub mod common;
use common::InternalTrustedSubjectHeaders;
use std::sync::{Arc, Mutex};

use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_clawrouter_router_service::domain::DomainError;
use sdkwork_clawrouter_router_service::ports::{
    AdminAttributeMutationCommand, AdminCatalogCollection, AdminCatalogFuture,
    AdminCatalogJsonRecord, AdminCatalogStore, AdminCategoryAttributeMutationCommand,
    AdminCategoryMutationCommand, AdminPriceListMutationCommand, AdminProductMutationCommand,
    AdminSkuMutationCommand, DeleteAdminCategoryAttributeCommand, DeleteAdminCategoryCommand,
    DeleteAdminProductCommand, DeleteAdminSkuCommand, ListAdminCatalogRecordsQuery,
};
use serde_json::{json, Map, Value};
use tower::ServiceExt;

const TEST_TENANT_ID: i64 = 100001;
const TEST_ORGANIZATION_ID: i64 = 0;
const TEST_OPERATOR_ID: i64 = 30;

#[tokio::test]
async fn admin_catalog_category_routes_use_standard_create_list_delete_semantics() {
    let store = Arc::new(TestAdminCatalogStore::default());
    let router =
        sdkwork_clawrouter_router_service::api::admin_catalog_router_with_store(store.clone());

    let categories = request_json(
        router.clone(),
        signed_request(
            "GET",
            "/backend/v3/api/catalog/categories?page=1&page_size=1",
            "",
        ),
        StatusCode::OK,
    )
    .await;
    assert_eq!(0, categories["code"].as_i64().unwrap());
    assert_eq!("cat-1", categories["data"]["items"][0]["id"]);
    assert_eq!("offset", categories["data"]["pageInfo"]["mode"]);
    assert_eq!(1, categories["data"]["pageInfo"]["page"]);
    assert_eq!(1, categories["data"]["pageInfo"]["pageSize"]);

    let created = request_json(
        router.clone(),
        signed_request(
            "POST",
            "/backend/v3/api/catalog/categories",
            r#"{"categoryNo":"cat-2","name":"Launch Category","status":"active","sortOrder":10}"#,
        ),
        StatusCode::CREATED,
    )
    .await;
    assert_eq!(0, created["code"].as_i64().unwrap());
    assert_eq!("cat-2", created["data"]["item"]["id"]);
    assert_eq!("Launch Category", created["data"]["item"]["name"]);

    request_empty(
        router,
        signed_request("DELETE", "/backend/v3/api/catalog/categories/cat-2", ""),
        StatusCode::NO_CONTENT,
    )
    .await;

    assert_eq!(
        vec!["create_category", "delete_category"],
        *store.commands.lock().unwrap()
    );
}

fn signed_request(method: &str, path: &str, body: &str) -> Request<Body> {
    Request::builder()
        .method(method)
        .uri(path)
        .header("content-type", "application/json")
        .header("Idempotency-Key", "catalog-test-idempotency-key")
        .internal_trusted_subject(TEST_TENANT_ID, TEST_ORGANIZATION_ID, TEST_OPERATOR_ID)
        .body(Body::from(body.to_owned()))
        .unwrap()
}

async fn request_json(
    router: axum::Router,
    request: Request<Body>,
    expected_status: StatusCode,
) -> Value {
    let response = router.oneshot(request).await.unwrap();
    assert_eq!(expected_status, response.status());
    json_payload(response).await
}

async fn request_empty(router: axum::Router, request: Request<Body>, expected_status: StatusCode) {
    let response = router.oneshot(request).await.unwrap();
    assert_eq!(expected_status, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    assert!(body.is_empty());
}

async fn json_payload(response: axum::response::Response) -> Value {
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    serde_json::from_slice(&body).unwrap()
}

#[derive(Default)]
struct TestAdminCatalogStore {
    commands: Mutex<Vec<&'static str>>,
}

impl AdminCatalogStore for TestAdminCatalogStore {
    fn list_categories<'a>(
        &'a self,
        query: ListAdminCatalogRecordsQuery,
    ) -> AdminCatalogFuture<'a, AdminCatalogCollection> {
        Box::pin(async move {
            assert_eq!(TEST_TENANT_ID, query.subject.tenant_id);
            assert_eq!(TEST_ORGANIZATION_ID, query.subject.organization_id);
            assert_eq!(TEST_OPERATOR_ID, query.subject.operator_id);
            Ok(test_catalog_page(
                vec![record(json!({
                    "id": "cat-1",
                    "categoryNo": "cat-1",
                    "name": "Standard Category",
                    "status": "active"
                }))],
                query.page_no,
                query.page_size,
                query.offset,
            ))
        })
    }

    fn create_category<'a>(
        &'a self,
        command: AdminCategoryMutationCommand,
    ) -> AdminCatalogFuture<'a, AdminCatalogJsonRecord> {
        Box::pin(async move {
            self.commands.lock().unwrap().push("create_category");
            assert_eq!(TEST_TENANT_ID, command.subject.tenant_id);
            assert_eq!("catalog-test-idempotency-key", command.idempotency_key);
            Ok(record(json!({
                "id": command.category_no,
                "categoryNo": command.category_no,
                "name": command.name,
                "status": command.status
            })))
        })
    }

    fn update_category<'a>(
        &'a self,
        command: AdminCategoryMutationCommand,
    ) -> AdminCatalogFuture<'a, AdminCatalogJsonRecord> {
        Box::pin(async move {
            Ok(record(json!({
                "id": command.category_id.unwrap_or(command.category_no.clone()),
                "categoryNo": command.category_no,
                "name": command.name,
                "status": command.status
            })))
        })
    }

    fn delete_category<'a>(
        &'a self,
        command: DeleteAdminCategoryCommand,
    ) -> AdminCatalogFuture<'a, bool> {
        Box::pin(async move {
            self.commands.lock().unwrap().push("delete_category");
            assert_eq!(TEST_TENANT_ID, command.subject.tenant_id);
            assert_eq!("cat-2", command.category_id);
            Ok(true)
        })
    }

    fn initialize_category_seeds<'a>(
        &'a self,
        _command: sdkwork_clawrouter_router_service::ports::AdminCategorySeedInitializeCommand,
    ) -> AdminCatalogFuture<
        'a,
        Vec<sdkwork_clawrouter_router_service::ports::AdminCategorySeedInitializeSummary>,
    > {
        Box::pin(async { Err(DomainError::new("unsupported test path")) })
    }

    fn list_products<'a>(
        &'a self,
        query: ListAdminCatalogRecordsQuery,
    ) -> AdminCatalogFuture<'a, AdminCatalogCollection> {
        Box::pin(async move {
            Ok(test_catalog_page(
                Vec::new(),
                query.page_no,
                query.page_size,
                query.offset,
            ))
        })
    }

    fn create_product<'a>(
        &'a self,
        command: AdminProductMutationCommand,
    ) -> AdminCatalogFuture<'a, AdminCatalogJsonRecord> {
        Box::pin(async move { Ok(record(json!({"id": command.spu_no}))) })
    }

    fn update_product<'a>(
        &'a self,
        command: AdminProductMutationCommand,
    ) -> AdminCatalogFuture<'a, AdminCatalogJsonRecord> {
        Box::pin(async move {
            Ok(record(
                json!({"id": command.product_id.unwrap_or(command.spu_no)}),
            ))
        })
    }

    fn delete_product<'a>(
        &'a self,
        _command: DeleteAdminProductCommand,
    ) -> AdminCatalogFuture<'a, bool> {
        Box::pin(async { Ok(true) })
    }

    fn list_skus<'a>(
        &'a self,
        query: ListAdminCatalogRecordsQuery,
    ) -> AdminCatalogFuture<'a, AdminCatalogCollection> {
        Box::pin(async move {
            Ok(test_catalog_page(
                Vec::new(),
                query.page_no,
                query.page_size,
                query.offset,
            ))
        })
    }

    fn create_sku<'a>(
        &'a self,
        command: AdminSkuMutationCommand,
    ) -> AdminCatalogFuture<'a, AdminCatalogJsonRecord> {
        Box::pin(async move { Ok(record(json!({"id": command.sku_no}))) })
    }

    fn update_sku<'a>(
        &'a self,
        command: AdminSkuMutationCommand,
    ) -> AdminCatalogFuture<'a, AdminCatalogJsonRecord> {
        Box::pin(async move {
            Ok(record(
                json!({"id": command.sku_id.unwrap_or(command.sku_no)}),
            ))
        })
    }

    fn delete_sku<'a>(&'a self, _command: DeleteAdminSkuCommand) -> AdminCatalogFuture<'a, bool> {
        Box::pin(async { Ok(true) })
    }

    fn list_attributes<'a>(
        &'a self,
        query: ListAdminCatalogRecordsQuery,
    ) -> AdminCatalogFuture<'a, AdminCatalogCollection> {
        Box::pin(async move {
            Ok(test_catalog_page(
                Vec::new(),
                query.page_no,
                query.page_size,
                query.offset,
            ))
        })
    }

    fn create_attribute<'a>(
        &'a self,
        command: AdminAttributeMutationCommand,
    ) -> AdminCatalogFuture<'a, AdminCatalogJsonRecord> {
        Box::pin(async move { Ok(record(json!({"id": command.attribute_no}))) })
    }

    fn list_category_attributes<'a>(
        &'a self,
        query: ListAdminCatalogRecordsQuery,
    ) -> AdminCatalogFuture<'a, AdminCatalogCollection> {
        Box::pin(async move {
            Ok(test_catalog_page(
                Vec::new(),
                query.page_no,
                query.page_size,
                query.offset,
            ))
        })
    }

    fn create_category_attribute<'a>(
        &'a self,
        command: AdminCategoryAttributeMutationCommand,
    ) -> AdminCatalogFuture<'a, AdminCatalogJsonRecord> {
        Box::pin(async move {
            Ok(record(json!({
                "id": "binding-1",
                "categoryId": command.category_id,
                "attributeId": command.attribute_id
            })))
        })
    }

    fn update_category_attribute<'a>(
        &'a self,
        command: AdminCategoryAttributeMutationCommand,
    ) -> AdminCatalogFuture<'a, AdminCatalogJsonRecord> {
        Box::pin(async move {
            Ok(record(json!({
                "id": command.binding_id.unwrap_or_else(|| "binding-1".to_owned()),
                "categoryId": command.category_id,
                "attributeId": command.attribute_id
            })))
        })
    }

    fn delete_category_attribute<'a>(
        &'a self,
        _command: DeleteAdminCategoryAttributeCommand,
    ) -> AdminCatalogFuture<'a, bool> {
        Box::pin(async { Ok(true) })
    }

    fn list_price_lists<'a>(
        &'a self,
        query: ListAdminCatalogRecordsQuery,
    ) -> AdminCatalogFuture<'a, AdminCatalogCollection> {
        Box::pin(async move {
            Ok(test_catalog_page(
                Vec::new(),
                query.page_no,
                query.page_size,
                query.offset,
            ))
        })
    }

    fn create_price_list<'a>(
        &'a self,
        command: AdminPriceListMutationCommand,
    ) -> AdminCatalogFuture<'a, AdminCatalogJsonRecord> {
        Box::pin(async move { Ok(record(json!({"id": command.price_list_no}))) })
    }
}

fn test_catalog_page(
    items: Vec<AdminCatalogJsonRecord>,
    page_no: i64,
    page_size: i64,
    offset: i64,
) -> AdminCatalogCollection {
    let total = items.len() as i64;
    let items = items
        .into_iter()
        .skip(offset.max(0) as usize)
        .take(page_size.max(0) as usize)
        .collect();
    AdminCatalogCollection {
        items,
        total,
        page_no,
        page_size,
    }
}

fn record(value: Value) -> Map<String, Value> {
    value.as_object().unwrap().clone()
}

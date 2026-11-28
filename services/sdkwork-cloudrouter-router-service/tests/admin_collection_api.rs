//! Route-level contract tests for the AI capability collection admin surface.
//!
//! The store is a fake: these tests pin the HTTP contract (paths, methods,
//! envelopes, validation, subject scope) rather than PostgreSQL behaviour.

pub mod common;

use std::sync::Arc;

use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_cloudrouter_router_service::api::admin_collection_router_with_store;
use sdkwork_cloudrouter_router_service::domain::DomainError;
use sdkwork_cloudrouter_router_service::ports::{
    AdminCollectionCapabilityCounts, AdminCollectionCategoryItem, AdminCollectionCategoryListPage,
    AdminCollectionDeleteOutcome, AdminCollectionFuture, AdminCollectionItemRecord,
    AdminCollectionListPage, AdminCollectionRecord, AdminCollectionReleaseListPage,
    AdminCollectionReleaseRecord, AdminCollectionStore, AdminCollectionSubject,
    CreateAdminCollectionCategoryCommand, CreateAdminCollectionCommand,
    DeleteAdminCollectionCategoryCommand, DeleteAdminCollectionCommand,
    ListAdminCollectionCategoriesQuery, ListAdminCollectionReleasesQuery,
    ListAdminCollectionsQuery, ReplaceAdminCollectionItemsCommand,
    UpdateAdminCollectionCategoryCommand, UpdateAdminCollectionCommand,
    UpdateAdminCollectionStatusCommand,
};
use serde_json::{json, Value};
use tower::ServiceExt;

#[tokio::test]
async fn admin_collection_routes_support_category_crud() {
    let router = admin_collection_router_with_store(Arc::new(TestCollectionStore));

    let list = router
        .clone()
        .oneshot(signed_request(
            "GET",
            "/backend/v3/api/ai/collection_categories?collection_kind=mixed&status=enabled&q=gen&page=1&page_size=20",
            None,
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, list.status());
    let list_payload = json_payload(list).await;
    assert_eq!(0, list_payload["code"].as_i64().unwrap());
    assert_eq!("11", list_payload["data"]["items"][0]["id"]);
    assert_eq!("general", list_payload["data"]["items"][0]["categoryCode"]);
    assert_eq!("mixed", list_payload["data"]["items"][0]["collectionKind"]);
    assert_eq!(true, list_payload["data"]["items"][0]["isSystem"]);
    assert_eq!("3", list_payload["data"]["items"][0]["collectionCount"]);
    assert_eq!("offset", list_payload["data"]["pageInfo"]["mode"]);

    let initialize = router
        .clone()
        .oneshot(signed_request(
            "POST",
            "/backend/v3/api/ai/collection_categories/defaults",
            None,
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, initialize.status());
    assert_eq!(
        "general",
        json_payload(initialize).await["data"]["items"][0]["categoryCode"]
    );

    let created = router
        .clone()
        .oneshot(signed_request(
            "POST",
            "/backend/v3/api/ai/collection_categories",
            Some(json!({
                "collectionKind": "skill",
                "categoryCode": "frontend",
                "name": "前端技能",
                "description": "前端相关技能合集",
                "parentId": "11",
                "sortOrder": 20
            })),
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::CREATED, created.status());
    let created_payload = json_payload(created).await;
    assert_eq!("frontend", created_payload["data"]["item"]["categoryCode"]);
    assert_eq!("前端技能", created_payload["data"]["item"]["name"]);

    let updated = router
        .clone()
        .oneshot(signed_request(
            "PATCH",
            "/backend/v3/api/ai/collection_categories/11",
            Some(json!({ "name": "General", "parentId": null, "status": "disabled" })),
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, updated.status());

    let deleted = router
        .clone()
        .oneshot(signed_request(
            "DELETE",
            "/backend/v3/api/ai/collection_categories/11",
            None,
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::NO_CONTENT, deleted.status());
}

#[tokio::test]
async fn admin_collection_routes_support_collection_lifecycle() {
    let router = admin_collection_router_with_store(Arc::new(TestCollectionStore));

    let list = router
        .clone()
        .oneshot(signed_request(
            "GET",
            "/backend/v3/api/ai/collections?collection_kind=mixed&category_id=11&publish_status=draft&status=enabled&featured=true&q=starter",
            None,
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, list.status());
    let list_payload = json_payload(list).await;
    assert_eq!("21", list_payload["data"]["items"][0]["id"]);
    assert_eq!("starter", list_payload["data"]["items"][0]["collectionKey"]);
    assert_eq!("mixed", list_payload["data"]["items"][0]["collectionKind"]);
    assert_eq!(
        "1",
        list_payload["data"]["items"][0]["capabilityCounts"]["skill"]
    );
    assert_eq!(
        "0",
        list_payload["data"]["items"][0]["capabilityCounts"]["mcp"]
    );
    assert_eq!(
        2,
        list_payload["data"]["items"][0]["items"]
            .as_array()
            .unwrap()
            .len()
    );

    let created = router
        .clone()
        .oneshot(signed_request(
            "POST",
            "/backend/v3/api/ai/collections",
            Some(json!({
                "name": "Starter pack",
                "collectionKind": "mixed",
                "summary": "Everything a new workspace needs",
                "tags": ["starter"],
                "items": [
                    { "capabilityType": "skill", "capabilityKey": "skill:code-review", "capabilityName": "Code review" },
                    { "capabilityType": "mcp", "capabilityKey": "mcp:github", "enabled": false }
                ]
            })),
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::CREATED, created.status());
    let created_payload = json_payload(created).await;
    assert_eq!("21", created_payload["data"]["item"]["id"]);
    assert_eq!("mixed", created_payload["data"]["item"]["collectionKind"]);

    let retrieved = router
        .clone()
        .oneshot(signed_request(
            "GET",
            "/backend/v3/api/ai/collections/21",
            None,
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, retrieved.status());
    assert_eq!(
        "starter",
        json_payload(retrieved).await["data"]["item"]["collectionKey"]
    );

    let updated = router
        .clone()
        .oneshot(signed_request(
            "PATCH",
            "/backend/v3/api/ai/collections/21",
            Some(json!({ "name": "Starter pack v2", "categoryId": null })),
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, updated.status());

    let items = router
        .clone()
        .oneshot(signed_request(
            "PUT",
            "/backend/v3/api/ai/collections/21/items",
            Some(json!({
                "items": [
                    { "capabilityType": "agent", "capabilityKey": "agent:helper" },
                    { "capabilityType": "plugin", "capabilityKey": "plugin:browser", "config": { "role": "reader" } }
                ]
            })),
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, items.status());

    let published = router
        .clone()
        .oneshot(signed_request(
            "PUT",
            "/backend/v3/api/ai/collections/21/status",
            Some(json!({ "publishStatus": "published", "notes": "first release" })),
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, published.status());
    assert_eq!(
        "published",
        json_payload(published).await["data"]["item"]["publishStatus"]
    );

    let releases = router
        .clone()
        .oneshot(signed_request(
            "GET",
            "/backend/v3/api/ai/collections/21/releases?page=1&page_size=20",
            None,
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, releases.status());
    let releases_payload = json_payload(releases).await;
    assert_eq!(3, releases_payload["data"]["items"][0]["releaseNo"]);
    assert_eq!(
        "published",
        releases_payload["data"]["items"][0]["releaseStatus"]
    );

    let deleted = router
        .clone()
        .oneshot(signed_request(
            "DELETE",
            "/backend/v3/api/ai/collections/21",
            None,
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::NO_CONTENT, deleted.status());
}

#[tokio::test]
async fn admin_collection_routes_validate_inputs() {
    let router = admin_collection_router_with_store(Arc::new(TestCollectionStore));

    let bad_kind = router
        .clone()
        .oneshot(signed_request(
            "POST",
            "/backend/v3/api/ai/collections",
            Some(json!({ "name": "Bad", "collectionKind": "everything" })),
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::BAD_REQUEST, bad_kind.status());
    assert_eq!(
        40001,
        json_payload(bad_kind).await["code"].as_i64().unwrap()
    );

    let empty_update = router
        .clone()
        .oneshot(signed_request(
            "PATCH",
            "/backend/v3/api/ai/collections/21",
            Some(json!({})),
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::BAD_REQUEST, empty_update.status());
    assert_eq!(
        "collection update fields are required",
        json_payload(empty_update).await["detail"]
    );

    let typed_mismatch = router
        .clone()
        .oneshot(signed_request(
            "POST",
            "/backend/v3/api/ai/collections",
            Some(json!({
                "name": "Skills only",
                "collectionKind": "skill",
                "items": [{ "capabilityType": "mcp", "capabilityKey": "mcp:github" }]
            })),
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::BAD_REQUEST, typed_mismatch.status());
    assert_eq!(
        "a skill collection can only contain skill capabilities",
        json_payload(typed_mismatch).await["detail"]
    );

    let duplicate_items = router
        .clone()
        .oneshot(signed_request(
            "PUT",
            "/backend/v3/api/ai/collections/21/items",
            Some(json!({
                "items": [
                    { "capabilityType": "skill", "capabilityKey": "skill:code-review" },
                    { "capabilityType": "skill", "capabilityKey": "skill:code-review" }
                ]
            })),
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::BAD_REQUEST, duplicate_items.status());

    let bad_search = router
        .clone()
        .oneshot(signed_request(
            "GET",
            "/backend/v3/api/ai/collections?q=bad%0Aterm",
            None,
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::BAD_REQUEST, bad_search.status());

    let oversized_page = router
        .clone()
        .oneshot(signed_request(
            "GET",
            "/backend/v3/api/ai/collections?page_size=201",
            None,
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::BAD_REQUEST, oversized_page.status());

    let bad_publish_status = router
        .clone()
        .oneshot(signed_request(
            "PUT",
            "/backend/v3/api/ai/collections/21/status",
            Some(json!({ "publishStatus": "draft" })),
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::BAD_REQUEST, bad_publish_status.status());
}

#[tokio::test]
async fn admin_collection_routes_map_domain_rejections_to_problem_status() {
    let router = admin_collection_router_with_store(Arc::new(RejectingCollectionStore));

    let publish = router
        .clone()
        .oneshot(signed_request(
            "PUT",
            "/backend/v3/api/ai/collections/21/status",
            Some(json!({ "publishStatus": "published" })),
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::BAD_REQUEST, publish.status());
    assert_eq!(40001, json_payload(publish).await["code"].as_i64().unwrap());

    let delete_category = router
        .oneshot(signed_request(
            "DELETE",
            "/backend/v3/api/ai/collection_categories/11",
            None,
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::CONFLICT, delete_category.status());
    assert!(
        json_payload(delete_category).await["code"]
            .as_i64()
            .unwrap()
            >= 40900
    );
}

#[tokio::test]
async fn admin_collection_routes_reject_missing_trusted_subject() {
    let router = admin_collection_router_with_store(Arc::new(TestCollectionStore));
    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/backend/v3/api/ai/collections")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(StatusCode::UNAUTHORIZED, response.status());
    assert_eq!(
        40101,
        json_payload(response).await["code"].as_i64().unwrap()
    );
}

#[test]
fn admin_collection_queries_expose_only_standard_q_search_param() {
    let source = include_str!("../src/api/admin_collection.rs");
    assert!(source.contains("q: Option<String>"));
    assert!(!source.contains("search: Option<String>,"));
    assert!(!source.contains("query.q.or(query.search)"));
}

fn signed_request(method: &str, path: &str, body: Option<Value>) -> Request<Body> {
    let mut request = common::web_framework_backend_request(
        method,
        path,
        Body::empty(),
        "100001",
        Some("0"),
        "30",
    );
    let body = match body {
        Some(value) => {
            request
                .headers_mut()
                .insert("content-type", "application/json".parse().unwrap());
            Body::from(value.to_string())
        }
        None => Body::empty(),
    };
    *request.body_mut() = body;
    request
}

async fn json_payload(response: axum::response::Response) -> Value {
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    serde_json::from_slice(&body).unwrap()
}

struct TestCollectionStore;

struct RejectingCollectionStore;

impl AdminCollectionStore for RejectingCollectionStore {
    fn list_categories<'a>(
        &'a self,
        _query: ListAdminCollectionCategoriesQuery,
    ) -> AdminCollectionFuture<'a, AdminCollectionCategoryListPage> {
        unimplemented!("not used by the rejection test")
    }

    fn initialize_categories<'a>(
        &'a self,
        _subject: AdminCollectionSubject,
    ) -> AdminCollectionFuture<'a, AdminCollectionCategoryListPage> {
        unimplemented!("not used by the rejection test")
    }

    fn create_category<'a>(
        &'a self,
        _command: CreateAdminCollectionCategoryCommand,
    ) -> AdminCollectionFuture<'a, AdminCollectionCategoryItem> {
        unimplemented!("not used by the rejection test")
    }

    fn update_category<'a>(
        &'a self,
        _command: UpdateAdminCollectionCategoryCommand,
    ) -> AdminCollectionFuture<'a, AdminCollectionCategoryItem> {
        unimplemented!("not used by the rejection test")
    }

    fn delete_category<'a>(
        &'a self,
        _command: DeleteAdminCollectionCategoryCommand,
    ) -> AdminCollectionFuture<'a, AdminCollectionDeleteOutcome> {
        Box::pin(async move {
            Err(DomainError::conflict(
                "collection category still has collections filed under it",
            ))
        })
    }

    fn list_collections<'a>(
        &'a self,
        _query: ListAdminCollectionsQuery,
    ) -> AdminCollectionFuture<'a, AdminCollectionListPage> {
        unimplemented!("not used by the rejection test")
    }

    fn get_collection<'a>(
        &'a self,
        _subject: AdminCollectionSubject,
        _collection_id: String,
    ) -> AdminCollectionFuture<'a, AdminCollectionRecord> {
        unimplemented!("not used by the rejection test")
    }

    fn create_collection<'a>(
        &'a self,
        _command: CreateAdminCollectionCommand,
    ) -> AdminCollectionFuture<'a, AdminCollectionRecord> {
        unimplemented!("not used by the rejection test")
    }

    fn update_collection<'a>(
        &'a self,
        _command: UpdateAdminCollectionCommand,
    ) -> AdminCollectionFuture<'a, AdminCollectionRecord> {
        unimplemented!("not used by the rejection test")
    }

    fn delete_collection<'a>(
        &'a self,
        _command: DeleteAdminCollectionCommand,
    ) -> AdminCollectionFuture<'a, AdminCollectionDeleteOutcome> {
        unimplemented!("not used by the rejection test")
    }

    fn replace_collection_items<'a>(
        &'a self,
        _command: ReplaceAdminCollectionItemsCommand,
    ) -> AdminCollectionFuture<'a, AdminCollectionRecord> {
        unimplemented!("not used by the rejection test")
    }

    fn update_collection_status<'a>(
        &'a self,
        _command: UpdateAdminCollectionStatusCommand,
    ) -> AdminCollectionFuture<'a, AdminCollectionRecord> {
        Box::pin(async move {
            Err(DomainError::bad_request(
                "a collection must contain at least one enabled capability before it can be published",
            ))
        })
    }

    fn list_collection_releases<'a>(
        &'a self,
        _query: ListAdminCollectionReleasesQuery,
    ) -> AdminCollectionFuture<'a, AdminCollectionReleaseListPage> {
        unimplemented!("not used by the rejection test")
    }
}

impl AdminCollectionStore for TestCollectionStore {
    fn list_categories<'a>(
        &'a self,
        query: ListAdminCollectionCategoriesQuery,
    ) -> AdminCollectionFuture<'a, AdminCollectionCategoryListPage> {
        Box::pin(async move {
            assert_eq!(100_001, query.subject.tenant_id);
            assert_eq!(0, query.subject.organization_id);
            assert_eq!(Some("mixed".to_owned()), query.collection_kind);
            assert_eq!(Some("enabled".to_owned()), query.status);
            assert_eq!(Some("gen".to_owned()), query.search);
            Ok(AdminCollectionCategoryListPage {
                items: vec![category_item()],
                total: 1,
                page_no: query.page_no,
                page_size: query.page_size,
            })
        })
    }

    fn initialize_categories<'a>(
        &'a self,
        subject: AdminCollectionSubject,
    ) -> AdminCollectionFuture<'a, AdminCollectionCategoryListPage> {
        Box::pin(async move {
            assert_eq!(100_001, subject.tenant_id);
            Ok(AdminCollectionCategoryListPage {
                items: vec![category_item()],
                total: 1,
                page_no: 1,
                page_size: 200,
            })
        })
    }

    fn create_category<'a>(
        &'a self,
        command: CreateAdminCollectionCategoryCommand,
    ) -> AdminCollectionFuture<'a, AdminCollectionCategoryItem> {
        Box::pin(async move {
            assert_eq!(100_001, command.subject.tenant_id);
            assert_eq!("skill", command.collection_kind);
            assert_eq!("frontend", command.category_code);
            assert_eq!("前端技能", command.name);
            assert_eq!("前端相关技能合集", command.description);
            assert_eq!(Some("11".to_owned()), command.parent_id);
            assert_eq!(20, command.sort_order);
            assert_eq!("enabled", command.status);
            let mut item = category_item();
            item.id = "31".to_owned();
            item.category_code = "frontend".to_owned();
            item.name = "前端技能".to_owned();
            item.collection_kind = "skill".to_owned();
            item.is_system = false;
            Ok(item)
        })
    }

    fn update_category<'a>(
        &'a self,
        command: UpdateAdminCollectionCategoryCommand,
    ) -> AdminCollectionFuture<'a, AdminCollectionCategoryItem> {
        Box::pin(async move {
            assert_eq!("11", command.category_id);
            assert_eq!(Some("General".to_owned()), command.name);
            assert_eq!(Some(None), command.parent_id);
            assert_eq!(Some("disabled".to_owned()), command.status);
            let mut item = category_item();
            item.name = "General".to_owned();
            item.parent_id = None;
            item.status = "disabled".to_owned();
            Ok(item)
        })
    }

    fn delete_category<'a>(
        &'a self,
        command: DeleteAdminCollectionCategoryCommand,
    ) -> AdminCollectionFuture<'a, AdminCollectionDeleteOutcome> {
        Box::pin(async move {
            assert_eq!("11", command.category_id);
            Ok(AdminCollectionDeleteOutcome { deleted: true })
        })
    }

    fn list_collections<'a>(
        &'a self,
        query: ListAdminCollectionsQuery,
    ) -> AdminCollectionFuture<'a, AdminCollectionListPage> {
        Box::pin(async move {
            assert_eq!(Some("mixed".to_owned()), query.collection_kind);
            assert_eq!(Some("11".to_owned()), query.category_id);
            assert_eq!(Some("draft".to_owned()), query.publish_status);
            assert_eq!(Some("enabled".to_owned()), query.status);
            assert_eq!(Some(true), query.featured);
            assert_eq!(Some("starter".to_owned()), query.search);
            Ok(AdminCollectionListPage {
                items: vec![collection_record()],
                total: 1,
                page_no: query.page_no,
                page_size: query.page_size,
            })
        })
    }

    fn get_collection<'a>(
        &'a self,
        subject: AdminCollectionSubject,
        collection_id: String,
    ) -> AdminCollectionFuture<'a, AdminCollectionRecord> {
        Box::pin(async move {
            assert_eq!(100_001, subject.tenant_id);
            assert_eq!("21", collection_id);
            Ok(collection_record())
        })
    }

    fn create_collection<'a>(
        &'a self,
        command: CreateAdminCollectionCommand,
    ) -> AdminCollectionFuture<'a, AdminCollectionRecord> {
        Box::pin(async move {
            assert_eq!("Starter pack", command.name);
            assert_eq!("mixed", command.collection_kind);
            assert_eq!("Everything a new workspace needs", command.summary);
            assert_eq!(vec!["starter".to_owned()], command.tags);
            assert_eq!(2, command.items.len());
            assert_eq!("skill", command.items[0].capability_type);
            assert_eq!("skill:code-review", command.items[0].capability_key);
            assert_eq!("Code review", command.items[0].capability_name);
            assert_eq!(0, command.items[0].sort_order);
            assert!(command.items[0].enabled);
            assert_eq!("mcp", command.items[1].capability_type);
            assert_eq!(1, command.items[1].sort_order);
            assert!(!command.items[1].enabled);
            assert_eq!(serde_json::json!({}), command.items[1].config);
            Ok(collection_record())
        })
    }

    fn update_collection<'a>(
        &'a self,
        command: UpdateAdminCollectionCommand,
    ) -> AdminCollectionFuture<'a, AdminCollectionRecord> {
        Box::pin(async move {
            assert_eq!("21", command.collection_id);
            assert_eq!(Some("Starter pack v2".to_owned()), command.name);
            assert_eq!(Some(None), command.category_id);
            Ok(collection_record())
        })
    }

    fn delete_collection<'a>(
        &'a self,
        command: DeleteAdminCollectionCommand,
    ) -> AdminCollectionFuture<'a, AdminCollectionDeleteOutcome> {
        Box::pin(async move {
            assert_eq!("21", command.collection_id);
            Ok(AdminCollectionDeleteOutcome { deleted: true })
        })
    }

    fn replace_collection_items<'a>(
        &'a self,
        command: ReplaceAdminCollectionItemsCommand,
    ) -> AdminCollectionFuture<'a, AdminCollectionRecord> {
        Box::pin(async move {
            assert_eq!("21", command.collection_id);
            assert_eq!(2, command.items.len());
            assert_eq!("agent", command.items[0].capability_type);
            assert_eq!("plugin", command.items[1].capability_type);
            assert_eq!(
                serde_json::json!({ "role": "reader" }),
                command.items[1].config
            );
            Ok(collection_record())
        })
    }

    fn update_collection_status<'a>(
        &'a self,
        command: UpdateAdminCollectionStatusCommand,
    ) -> AdminCollectionFuture<'a, AdminCollectionRecord> {
        Box::pin(async move {
            assert_eq!("21", command.collection_id);
            assert_eq!("published", command.publish_status);
            assert_eq!("first release", command.notes);
            let mut record = collection_record();
            record.publish_status = "published".to_owned();
            record.published_at = Some("2026-11-28 09:00:00+00".to_owned());
            record.latest_release_no = Some(3);
            Ok(record)
        })
    }

    fn list_collection_releases<'a>(
        &'a self,
        query: ListAdminCollectionReleasesQuery,
    ) -> AdminCollectionFuture<'a, AdminCollectionReleaseListPage> {
        Box::pin(async move {
            assert_eq!("21", query.collection_id);
            Ok(AdminCollectionReleaseListPage {
                items: vec![AdminCollectionReleaseRecord {
                    id: "41".to_owned(),
                    release_no: 3,
                    name: "Starter pack".to_owned(),
                    item_count: "2".to_owned(),
                    release_status: "published".to_owned(),
                    notes: "first release".to_owned(),
                    published_by: "30".to_owned(),
                    published_at: "2026-11-28 09:00:00+00".to_owned(),
                    created_at: "2026-11-28 09:00:00+00".to_owned(),
                }],
                total: 1,
                page_no: query.page_no,
                page_size: query.page_size,
            })
        })
    }
}

fn category_item() -> AdminCollectionCategoryItem {
    AdminCollectionCategoryItem {
        id: "11".to_owned(),
        category_code: "general".to_owned(),
        name: "General".to_owned(),
        description: "Mixed collection".to_owned(),
        icon_ref: String::new(),
        collection_kind: "mixed".to_owned(),
        parent_id: None,
        sort_order: 0,
        status: "enabled".to_owned(),
        is_system: true,
        collection_count: "3".to_owned(),
        created_at: "2026-11-28 08:00:00+00".to_owned(),
        updated_at: "2026-11-28 08:00:00+00".to_owned(),
    }
}

fn collection_record() -> AdminCollectionRecord {
    AdminCollectionRecord {
        id: "21".to_owned(),
        collection_key: "starter".to_owned(),
        name: "Starter pack".to_owned(),
        summary: "Everything a new workspace needs".to_owned(),
        description: String::new(),
        icon_ref: String::new(),
        collection_kind: "mixed".to_owned(),
        category_id: Some("11".to_owned()),
        category_name: Some("General".to_owned()),
        visibility: "organization".to_owned(),
        publish_status: "draft".to_owned(),
        published_at: None,
        item_count: "2".to_owned(),
        capability_counts: AdminCollectionCapabilityCounts {
            skill: "1".to_owned(),
            mcp: "0".to_owned(),
            agent: "0".to_owned(),
            plugin: "0".to_owned(),
        },
        tags: vec!["starter".to_owned()],
        featured: false,
        sort_order: 0,
        owner_user_id: "30".to_owned(),
        created_by: "30".to_owned(),
        updated_by: "30".to_owned(),
        status: "enabled".to_owned(),
        latest_release_no: None,
        items: vec![
            collection_item("51", "skill", "skill:code-review", true),
            collection_item("52", "mcp", "mcp:github", false),
        ],
        created_at: "2026-11-28 08:00:00+00".to_owned(),
        updated_at: "2026-11-28 08:00:00+00".to_owned(),
    }
}

fn collection_item(
    id: &str,
    capability_type: &str,
    capability_key: &str,
    enabled: bool,
) -> AdminCollectionItemRecord {
    AdminCollectionItemRecord {
        id: id.to_owned(),
        collection_id: "21".to_owned(),
        capability_type: capability_type.to_owned(),
        capability_key: capability_key.to_owned(),
        capability_name: String::new(),
        capability_version: String::new(),
        capability_icon_ref: String::new(),
        config: serde_json::json!({}),
        sort_order: 0,
        enabled,
        created_at: "2026-11-28 08:00:00+00".to_owned(),
        updated_at: "2026-11-28 08:00:00+00".to_owned(),
    }
}

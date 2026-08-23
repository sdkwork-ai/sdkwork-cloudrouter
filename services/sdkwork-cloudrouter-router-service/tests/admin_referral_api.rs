pub mod common;
use std::sync::{Arc, Mutex};

use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_cloudrouter_router_service::application::EntityUuidGenerator;
use sdkwork_cloudrouter_router_service::domain::DomainResult;
use sdkwork_cloudrouter_router_service::ports::{
    AdminReferralCommandFuture, AdminReferralListPage, AdminReferralRelationItem,
    AdminReferralStore, AdminReferralStrategyItem, CreateAdminReferralStrategyCommand,
    DeleteAdminReferralStrategyCommand, ListAdminReferralRelationsQuery,
    ListAdminReferralStrategiesQuery, RetrieveAdminReferralStrategyQuery,
    UpdateAdminReferralStrategyCommand,
};
use serde_json::Value;
use tower::ServiceExt;

const TEST_TENANT_ID: i64 = 100001;

#[derive(Default)]
struct TestAdminReferralStore {
    strategies: Mutex<Vec<AdminReferralStrategyItem>>,
    relations: Mutex<Vec<AdminReferralRelationItem>>,
}

impl TestAdminReferralStore {
    fn seed() -> Arc<Self> {
        let store = Arc::new(Self::default());
        store
            .strategies
            .lock()
            .unwrap()
            .push(AdminReferralStrategyItem {
                id: "strategy-100".to_owned(),
                name: "Invite Bonus".to_owned(),
                description: "Reward inviters".to_owned(),
                status: "active".to_owned(),
                reward_type: "POINTS".to_owned(),
                reward_value: "200".to_owned(),
                reward_target: "INVITER".to_owned(),
                trigger_event: "REGISTER".to_owned(),
                max_rewards_per_inviter: 10,
                starts_at: String::new(),
                ends_at: String::new(),
                updated_at: "2026-08-01 00:00:00".to_owned(),
            });
        store
            .relations
            .lock()
            .unwrap()
            .push(AdminReferralRelationItem {
                id: "relation-100".to_owned(),
                inviter: "10".to_owned(),
                invitee: "20".to_owned(),
                invite_code: "ABC23456".to_owned(),
                source: "register".to_owned(),
                reward_status: "pending".to_owned(),
                claimed_at: "2026-08-02 00:00:00".to_owned(),
            });
        store
    }
}

impl AdminReferralStore for TestAdminReferralStore {
    fn list_referral_relations<'a>(
        &'a self,
        query: ListAdminReferralRelationsQuery,
    ) -> AdminReferralCommandFuture<'a, AdminReferralListPage<AdminReferralRelationItem>> {
        Box::pin(async move {
            let items = self
                .relations
                .lock()
                .unwrap()
                .iter()
                .filter(|item| {
                    query.subject.tenant_id == TEST_TENANT_ID
                        && query
                            .search
                            .as_deref()
                            .is_none_or(|search| item.invite_code.contains(search))
                })
                .cloned()
                .collect::<Vec<_>>();
            Ok(AdminReferralListPage {
                items: items.clone(),
                total: items.len() as i64,
                page_no: query.page_no,
                page_size: query.page_size,
            })
        })
    }

    fn list_referral_strategies<'a>(
        &'a self,
        query: ListAdminReferralStrategiesQuery,
    ) -> AdminReferralCommandFuture<'a, AdminReferralListPage<AdminReferralStrategyItem>> {
        Box::pin(async move {
            let items = self
                .strategies
                .lock()
                .unwrap()
                .iter()
                .filter(|item| {
                    query.subject.tenant_id == TEST_TENANT_ID
                        && match query.status.as_deref() {
                            Some("active") => item.status == "active",
                            Some("disabled") => item.status == "disabled",
                            _ => true,
                        }
                        && query.search.as_deref().is_none_or(|search| {
                            item.name
                                .to_ascii_lowercase()
                                .contains(&search.to_ascii_lowercase())
                        })
                })
                .cloned()
                .collect::<Vec<_>>();
            Ok(AdminReferralListPage {
                items: items.clone(),
                total: items.len() as i64,
                page_no: query.page_no,
                page_size: query.page_size,
            })
        })
    }

    fn retrieve_referral_strategy<'a>(
        &'a self,
        query: RetrieveAdminReferralStrategyQuery,
    ) -> AdminReferralCommandFuture<'a, Option<AdminReferralStrategyItem>> {
        Box::pin(async move {
            Ok(self
                .strategies
                .lock()
                .unwrap()
                .iter()
                .find(|item| item.id == query.strategy_id)
                .cloned())
        })
    }

    fn create_referral_strategy<'a>(
        &'a self,
        command: CreateAdminReferralStrategyCommand,
    ) -> AdminReferralCommandFuture<'a, AdminReferralStrategyItem> {
        Box::pin(async move {
            let item = AdminReferralStrategyItem {
                id: command.strategy_uuid,
                name: command.name,
                description: command.description,
                status: command.status,
                reward_type: command.reward_type,
                reward_value: command.reward_value,
                reward_target: command.reward_target,
                trigger_event: command.trigger_event,
                max_rewards_per_inviter: command.max_rewards_per_inviter,
                starts_at: command.starts_at.unwrap_or_default(),
                ends_at: command.ends_at.unwrap_or_default(),
                updated_at: command.requested_at,
            };
            self.strategies.lock().unwrap().push(item.clone());
            Ok(item)
        })
    }

    fn update_referral_strategy<'a>(
        &'a self,
        command: UpdateAdminReferralStrategyCommand,
    ) -> AdminReferralCommandFuture<'a, AdminReferralStrategyItem> {
        Box::pin(async move {
            let mut strategies = self.strategies.lock().unwrap();
            let position = strategies
                .iter()
                .position(|item| item.id == command.strategy_id)
                .ok_or_else(|| {
                    sdkwork_cloudrouter_router_service::domain::DomainError::not_found(
                        "referral strategy was not found",
                    )
                })?;
            let item = AdminReferralStrategyItem {
                id: command.strategy_id,
                name: command.name,
                description: command.description,
                status: command.status,
                reward_type: command.reward_type,
                reward_value: command.reward_value,
                reward_target: command.reward_target,
                trigger_event: command.trigger_event,
                max_rewards_per_inviter: command.max_rewards_per_inviter,
                starts_at: command.starts_at.unwrap_or_default(),
                ends_at: command.ends_at.unwrap_or_default(),
                updated_at: command.requested_at,
            };
            strategies[position] = item.clone();
            Ok(item)
        })
    }

    fn delete_referral_strategy<'a>(
        &'a self,
        command: DeleteAdminReferralStrategyCommand,
    ) -> AdminReferralCommandFuture<'a, bool> {
        Box::pin(async move {
            let mut strategies = self.strategies.lock().unwrap();
            let position = strategies
                .iter()
                .position(|item| item.id == command.strategy_id);
            match position {
                Some(position) => {
                    strategies.remove(position);
                    Ok(true)
                }
                None => Ok(false),
            }
        })
    }
}

#[derive(Debug, Clone, Copy)]
struct TestUuidGenerator;

impl EntityUuidGenerator for TestUuidGenerator {
    fn generate_entity_uuid(&self) -> DomainResult<String> {
        Ok("00000000-0000-0000-0000-000000000001".to_owned())
    }
}

#[tokio::test]
async fn admin_referral_route_lists_relations_and_strategies() {
    let router = sdkwork_cloudrouter_router_service::api::admin_referral_router_with_store(
        TestAdminReferralStore::seed(),
        Arc::new(TestUuidGenerator),
    );

    let relations = request_json(
        router.clone(),
        signed_request("GET", "/backend/v3/api/billing/referrals/relations", ""),
    )
    .await;
    assert_eq!("relation-100", relations["data"]["items"][0]["id"]);
    assert_eq!("10", relations["data"]["items"][0]["inviter"]);
    assert_eq!("20", relations["data"]["items"][0]["invitee"]);
    assert_eq!("ABC23456", relations["data"]["items"][0]["inviteCode"]);
    assert_eq!("pending", relations["data"]["items"][0]["rewardStatus"]);

    let strategies = request_json(
        router.clone(),
        signed_request("GET", "/backend/v3/api/billing/referral_strategies", ""),
    )
    .await;
    assert_eq!("strategy-100", strategies["data"]["items"][0]["id"]);
    assert_eq!("Invite Bonus", strategies["data"]["items"][0]["name"]);
    assert_eq!("POINTS", strategies["data"]["items"][0]["rewardType"]);
    assert_eq!("200", strategies["data"]["items"][0]["rewardValue"]);

    let active = request_json(
        router.clone(),
        signed_request(
            "GET",
            "/backend/v3/api/billing/referral_strategies?status=active",
            "",
        ),
    )
    .await;
    assert_eq!(1, active["data"]["items"].as_array().unwrap().len());

    let searched = request_json(
        router.clone(),
        signed_request(
            "GET",
            "/backend/v3/api/billing/referral_strategies?q=bonus",
            "",
        ),
    )
    .await;
    assert_eq!(1, searched["data"]["items"].as_array().unwrap().len());
    assert_eq!("Invite Bonus", searched["data"]["items"][0]["name"]);

    let relation_search = request_json(
        router.clone(),
        signed_request(
            "GET",
            "/backend/v3/api/billing/referrals/relations?q=ABC2",
            "",
        ),
    )
    .await;
    assert_eq!(
        1,
        relation_search["data"]["items"].as_array().unwrap().len()
    );
    assert_eq!("relation-100", relation_search["data"]["items"][0]["id"]);
}

#[tokio::test]
async fn admin_referral_route_creates_updates_retrieves_and_deletes_strategies() {
    let router = sdkwork_cloudrouter_router_service::api::admin_referral_router_with_store(
        TestAdminReferralStore::seed(),
        Arc::new(TestUuidGenerator),
    );

    let created = request_json_with_status(
        router.clone(),
        signed_request(
            "POST",
            "/backend/v3/api/billing/referral_strategies",
            r#"{"name":"Launch Referral","description":"Q3 campaign","status":"active","rewardType":"CASH","rewardValue":"5.00","rewardTarget":"INVITEE","triggerEvent":"REGISTER","maxRewardsPerInviter":3}"#,
        ),
        StatusCode::CREATED,
    )
    .await;
    assert_eq!("Launch Referral", created["data"]["name"]);
    assert_eq!("CASH", created["data"]["rewardType"]);
    assert_eq!("5.00", created["data"]["rewardValue"]);

    let strategy_id = created["data"]["id"].as_str().unwrap().to_owned();

    let retrieved = request_json(
        router.clone(),
        signed_request(
            "GET",
            &format!("/backend/v3/api/billing/referral_strategies/{strategy_id}"),
            "",
        ),
    )
    .await;
    assert_eq!("Launch Referral", retrieved["data"]["name"]);

    let updated = request_json(
        router.clone(),
        signed_request(
            "PATCH",
            &format!("/backend/v3/api/billing/referral_strategies/{strategy_id}"),
            r#"{"name":"Launch Referral v2","status":"disabled","rewardValue":"8.00"}"#,
        ),
    )
    .await;
    assert_eq!("Launch Referral v2", updated["data"]["name"]);
    assert_eq!("disabled", updated["data"]["status"]);
    assert_eq!("8.00", updated["data"]["rewardValue"]);

    request_empty_with_status(
        router.clone(),
        signed_request(
            "DELETE",
            &format!("/backend/v3/api/billing/referral_strategies/{strategy_id}"),
            "",
        ),
        StatusCode::NO_CONTENT,
    )
    .await;

    request_empty_with_status(
        router.clone(),
        signed_request(
            "DELETE",
            "/backend/v3/api/billing/referral_strategies/strategy-missing",
            "",
        ),
        StatusCode::NOT_FOUND,
    )
    .await;
}

#[tokio::test]
async fn admin_referral_route_rejects_invalid_strategy_mutations() {
    let router = sdkwork_cloudrouter_router_service::api::admin_referral_router_with_store(
        TestAdminReferralStore::seed(),
        Arc::new(TestUuidGenerator),
    );

    request_json_with_status(
        router.clone(),
        signed_request(
            "POST",
            "/backend/v3/api/billing/referral_strategies",
            r#"{"name":"Bad","rewardType":"TOKEN","rewardValue":"1","rewardTarget":"INVITER"}"#,
        ),
        StatusCode::BAD_REQUEST,
    )
    .await;

    request_json_with_status(
        router.clone(),
        signed_request(
            "POST",
            "/backend/v3/api/billing/referral_strategies",
            r#"{"rewardType":"POINTS","rewardValue":"1","rewardTarget":"INVITER"}"#,
        ),
        StatusCode::BAD_REQUEST,
    )
    .await;
}

fn signed_request(method: &str, path: &str, body: &str) -> Request<Body> {
    let mut request = common::web_framework_backend_request(
        method,
        path,
        Body::from(body.to_owned()),
        "100001",
        Some("0"),
        "30",
    );
    request
        .headers_mut()
        .insert("content-type", "application/json".parse().unwrap());
    request.headers_mut().insert(
        "X-Request-Id",
        "request-admin-referral-test".parse().unwrap(),
    );
    request
}

async fn request_json(router: axum::Router, request: Request<Body>) -> Value {
    request_json_with_status(router, request, StatusCode::OK).await
}

async fn request_json_with_status(
    router: axum::Router,
    request: Request<Body>,
    expected_status: StatusCode,
) -> Value {
    let method = request.method().to_owned();
    let uri = request.uri().to_owned();
    let response = router.oneshot(request).await.unwrap();
    let status = response.status();
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    if expected_status != status {
        eprintln!(
            "unexpected status {status} for {method} {uri} body={}",
            String::from_utf8_lossy(&body)
        );
        panic!("unexpected status");
    }
    serde_json::from_slice(&body).unwrap()
}

async fn request_empty_with_status(
    router: axum::Router,
    request: Request<Body>,
    expected_status: StatusCode,
) {
    let response = router.oneshot(request).await.unwrap();
    assert_eq!(expected_status, response.status());
}

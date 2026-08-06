pub mod common;
use std::sync::{Arc, Mutex};

use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_cloudrouter_router_service::domain::DomainError;
use sdkwork_cloudrouter_router_service::ports::{
    AdminAuthSettings, AdminAuthSettingsFuture, AdminAuthSettingsStore,
    AdminAuthInviteCodePolicy, AppInviteCodeItem, AppInviteCodeOwner,
    AppInviteRelationClaimed, AppInviteStore, ClaimAppInviteRelationCommand,
    GetAdminAuthSettingsScopeQuery, IssueAppInviteCodeCommand, UpdateAdminAuthSettingsCommand,
    ValidateAppInviteCodeQuery,
};
use serde_json::Value;
use tower::ServiceExt;

const TEST_TENANT_ID: i64 = 10;
const TEST_ORGANIZATION_ID: i64 = 20;
const TEST_USER_ID: i64 = 30;

#[derive(Default)]
struct TestAppInviteStore {
    /// Active invite codes: (invite_code, owner_user_id).
    codes: Mutex<Vec<(String, i64)>>,
    /// Bound relations: (invitee_user_id, inviter_user_id).
    relations: Mutex<Vec<(i64, i64)>>,
    issue_commands: Mutex<Vec<IssueAppInviteCodeCommand>>,
}

impl TestAppInviteStore {
    fn with_codes(codes: Vec<(String, i64)>) -> Arc<Self> {
        Arc::new(Self {
            codes: Mutex::new(codes),
            ..Self::default()
        })
    }

    fn and_relation(self: &Arc<Self>, invitee_user_id: i64, inviter_user_id: i64) -> Arc<Self> {
        self.relations
            .lock()
            .unwrap()
            .push((invitee_user_id, inviter_user_id));
        Arc::clone(self)
    }
}

impl AppInviteStore for TestAppInviteStore {
    fn validate_invite_code<'a>(
        &'a self,
        query: ValidateAppInviteCodeQuery,
    ) -> sdkwork_cloudrouter_router_service::ports::AppInviteCommandFuture<'a, Option<AppInviteCodeOwner>>
    {
        Box::pin(async move {
            let owner = self
                .codes
                .lock()
                .unwrap()
                .iter()
                .find(|(code, _owner)| code == &query.invite_code)
                .map(|(_code, owner)| AppInviteCodeOwner { user_id: *owner });
            Ok(owner)
        })
    }

    fn issue_invite_code<'a>(
        &'a self,
        command: IssueAppInviteCodeCommand,
    ) -> sdkwork_cloudrouter_router_service::ports::AppInviteCommandFuture<'a, AppInviteCodeItem>
    {
        Box::pin(async move {
            // Idempotent: a previously issued code for the same user is reused.
            let existing = self
                .codes
                .lock()
                .unwrap()
                .iter()
                .find(|(_code, owner)| *owner == command.subject.user_id)
                .map(|(code, _owner)| code.clone());
            if let Some(code) = existing {
                return Ok(AppInviteCodeItem { invite_code: code });
            }
            self.issue_commands.lock().unwrap().push(command.clone());
            let code = command.invite_code.clone();
            self.codes
                .lock()
                .unwrap()
                .push((code.clone(), command.subject.user_id));
            Ok(AppInviteCodeItem { invite_code: code })
        })
    }

    fn claim_invite_relation<'a>(
        &'a self,
        command: ClaimAppInviteRelationCommand,
    ) -> sdkwork_cloudrouter_router_service::ports::AppInviteCommandFuture<'a, AppInviteRelationClaimed>
    {
        Box::pin(async move {
            let mut relations = self.relations.lock().unwrap();
            if let Some((_invitee, inviter)) = relations
                .iter()
                .find(|(invitee, _inviter)| *invitee == command.subject.user_id)
            {
                if *inviter == command.inviter_user_id {
                    return Ok(AppInviteRelationClaimed {
                        relation_id: 1,
                        reward_status: "pending".to_owned(),
                    });
                }
                return Err(DomainError::conflict(
                    "the user is already bound to another inviter".to_owned(),
                ));
            }
            relations.push((command.subject.user_id, command.inviter_user_id));
            Ok(AppInviteRelationClaimed {
                relation_id: 1,
                reward_status: "pending".to_owned(),
            })
        })
    }
}

#[derive(Default)]
struct TestAdminAuthSettingsStore {
    settings: Mutex<Option<AdminAuthSettings>>,
    /// When true, the scope lookup reports not-found (fresh installation).
    not_found: bool,
}

impl TestAdminAuthSettingsStore {
    fn with_policy(register_required: bool, login_required: bool) -> Arc<Self> {
        let mut settings = AdminAuthSettings::default();
        settings.invite_code_policy = AdminAuthInviteCodePolicy {
            register_required,
            login_required,
        };
        Arc::new(Self {
            settings: Mutex::new(Some(settings)),
            not_found: false,
        })
    }

    fn not_found() -> Arc<Self> {
        Arc::new(Self {
            settings: Mutex::new(None),
            not_found: true,
        })
    }
}

impl AdminAuthSettingsStore for TestAdminAuthSettingsStore {
    fn get_auth_settings<'a>(
        &'a self,
        _query: sdkwork_cloudrouter_router_service::ports::GetAdminAuthSettingsQuery,
    ) -> AdminAuthSettingsFuture<'a, AdminAuthSettings> {
        Box::pin(async move { Err(DomainError::new("not used in invite tests".to_owned())) })
    }

    fn get_auth_settings_for_scope<'a>(
        &'a self,
        _query: GetAdminAuthSettingsScopeQuery,
    ) -> AdminAuthSettingsFuture<'a, AdminAuthSettings> {
        Box::pin(async move {
            if self.not_found {
                return Err(DomainError::not_found("auth settings were not found".to_owned()));
            }
            let settings = self
                .settings
                .lock()
                .unwrap()
                .clone()
                .unwrap_or_default();
            Ok(settings)
        })
    }

    fn update_auth_settings<'a>(
        &'a self,
        _command: UpdateAdminAuthSettingsCommand,
    ) -> AdminAuthSettingsFuture<'a, AdminAuthSettings> {
        Box::pin(async move { Err(DomainError::new("not used in invite tests".to_owned())) })
    }
}

fn router_with(
    store: Arc<TestAppInviteStore>,
    auth_settings_store: Arc<TestAdminAuthSettingsStore>,
) -> axum::Router {
    sdkwork_cloudrouter_router_service::api::app_invite_router_with_store(
        store,
        auth_settings_store,
    )
}

fn signed_request(method: &str, path: &str, body: &str) -> Request<Body> {
    let mut request = common::web_framework_app_request(
        method,
        path,
        Body::from(body.to_owned()),
        &TEST_TENANT_ID.to_string(),
        Some(&TEST_ORGANIZATION_ID.to_string()),
        &TEST_USER_ID.to_string(),
    );
    request.headers_mut().insert(
        "content-type",
        axum::http::HeaderValue::from_static("application/json"),
    );
    request
}

async fn json_payload(response: axum::response::Response) -> Value {
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    serde_json::from_slice(&body).unwrap()
}

#[tokio::test]
async fn app_invite_policy_defaults_open_when_settings_absent() {
    let router = router_with(Arc::new(TestAppInviteStore::default()), TestAdminAuthSettingsStore::not_found());

    let response = router
        .oneshot(signed_request("GET", "/app/v3/api/iam/invite/policy", ""))
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let payload = json_payload(response).await;
    assert_eq!(0, payload["code"].as_i64().unwrap());
    assert_eq!(false, payload["data"]["registerRequired"]);
    assert_eq!(false, payload["data"]["loginRequired"]);
}

#[tokio::test]
async fn app_invite_policy_reflects_configured_policy() {
    let router = router_with(
        Arc::new(TestAppInviteStore::default()),
        TestAdminAuthSettingsStore::with_policy(true, false),
    );

    let response = router
        .oneshot(signed_request("GET", "/app/v3/api/iam/invite/policy", ""))
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let payload = json_payload(response).await;
    assert_eq!(true, payload["data"]["registerRequired"]);
    assert_eq!(false, payload["data"]["loginRequired"]);
}

#[tokio::test]
async fn app_invite_validate_accepts_normalized_code() {
    let store = TestAppInviteStore::with_codes(vec![("ABC23456".to_owned(), 10)]);
    let router = router_with(store, Arc::new(TestAdminAuthSettingsStore::default()));

    // Separators and lowercase are tolerated by the backend normalizer.
    let response = router
        .oneshot(signed_request(
            "POST",
            "/app/v3/api/iam/invites/validate",
            r#"{"inviteCode":"abc-234_56"}"#,
        ))
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let payload = json_payload(response).await;
    assert_eq!(true, payload["data"]["valid"]);
}

#[tokio::test]
async fn app_invite_validate_rejects_unknown_code() {
    let store = TestAppInviteStore::with_codes(vec![("ABC23456".to_owned(), 10)]);
    let router = router_with(store, Arc::new(TestAdminAuthSettingsStore::default()));

    let response = router
        .oneshot(signed_request(
            "POST",
            "/app/v3/api/iam/invites/validate",
            r#"{"inviteCode":"ZZZ99999"}"#,
        ))
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let payload = json_payload(response).await;
    assert_eq!(false, payload["data"]["valid"]);
}

#[tokio::test]
async fn app_invite_validate_rejects_malformed_body() {
    let router = router_with(
        Arc::new(TestAppInviteStore::default()),
        Arc::new(TestAdminAuthSettingsStore::default()),
    );

    let response = router
        .oneshot(signed_request(
            "POST",
            "/app/v3/api/iam/invites/validate",
            r#"{"inviteCode":"!!!"}"#,
        ))
        .await
        .unwrap();

    assert_eq!(StatusCode::BAD_REQUEST, response.status());
}

#[tokio::test]
async fn app_invite_issue_creates_and_reuses_personal_code() {
    let store = Arc::new(TestAppInviteStore::default());
    let router = router_with(store.clone(), Arc::new(TestAdminAuthSettingsStore::default()));

    let first = router
        .clone()
        .oneshot(signed_request("POST", "/app/v3/api/iam/invites/issue", ""))
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, first.status());
    let first_payload = json_payload(first).await;
    let first_code = first_payload["data"]["inviteCode"].as_str().unwrap().to_owned();
    assert_eq!(8, first_code.len());

    let second = router
        .clone()
        .oneshot(signed_request("POST", "/app/v3/api/iam/invites/issue", ""))
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, second.status());
    let second_payload = json_payload(second).await;
    // Idempotent: the same user keeps the same code.
    assert_eq!(first_code, second_payload["data"]["inviteCode"]);
    assert_eq!(1, store.issue_commands.lock().unwrap().len());
}

#[tokio::test]
async fn app_invite_issue_requires_authentication() {
    let router = router_with(
        Arc::new(TestAppInviteStore::default()),
        Arc::new(TestAdminAuthSettingsStore::default()),
    );

    // No trusted app subject present -> the endpoint rejects before the store.
    let mut request = signed_request("POST", "/app/v3/api/iam/invites/issue", "");
    request
        .extensions_mut()
        .remove::<sdkwork_web_core::WebRequestContext>();
    let response = router.oneshot(request).await.unwrap();

    assert_eq!(StatusCode::UNAUTHORIZED, response.status());
}

#[tokio::test]
async fn app_invite_claim_binds_invitee_to_inviter() {
    let store = TestAppInviteStore::with_codes(vec![("ABC23456".to_owned(), 10)]);
    let router = router_with(store, Arc::new(TestAdminAuthSettingsStore::default()));

    let response = router
        .oneshot(signed_request(
            "POST",
            "/app/v3/api/iam/invites/claim",
            r#"{"inviteCode":"ABC23456"}"#,
        ))
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let payload = json_payload(response).await;
    assert_eq!("pending", payload["data"]["rewardStatus"]);
}

#[tokio::test]
async fn app_invite_claim_rejects_self_invite() {
    // The code belongs to the calling user themselves.
    let store = TestAppInviteStore::with_codes(vec![("ABC23456".to_owned(), TEST_USER_ID)]);
    let router = router_with(store, Arc::new(TestAdminAuthSettingsStore::default()));

    let response = router
        .oneshot(signed_request(
            "POST",
            "/app/v3/api/iam/invites/claim",
            r#"{"inviteCode":"ABC23456"}"#,
        ))
        .await
        .unwrap();

    assert_eq!(StatusCode::BAD_REQUEST, response.status());
}

#[tokio::test]
async fn app_invite_claim_rejects_already_bound_invitee() {
    let store = TestAppInviteStore::with_codes(vec![("ABC23456".to_owned(), 10)])
        .and_relation(TEST_USER_ID, 40);
    let router = router_with(store, Arc::new(TestAdminAuthSettingsStore::default()));

    let response = router
        .oneshot(signed_request(
            "POST",
            "/app/v3/api/iam/invites/claim",
            r#"{"inviteCode":"ABC23456"}"#,
        ))
        .await
        .unwrap();

    assert_eq!(StatusCode::CONFLICT, response.status());
}

#[tokio::test]
async fn app_invite_claim_is_idempotent_for_same_inviter() {
    let store = TestAppInviteStore::with_codes(vec![("ABC23456".to_owned(), 10)])
        .and_relation(TEST_USER_ID, 10);
    let router = router_with(store, Arc::new(TestAdminAuthSettingsStore::default()));

    let response = router
        .oneshot(signed_request(
            "POST",
            "/app/v3/api/iam/invites/claim",
            r#"{"inviteCode":"ABC23456"}"#,
        ))
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let payload = json_payload(response).await;
    assert_eq!("pending", payload["data"]["rewardStatus"]);
}

#[tokio::test]
async fn app_invite_claim_rejects_inactive_code() {
    let store = TestAppInviteStore::with_codes(vec![("ABC23456".to_owned(), 10)]);
    let router = router_with(store, Arc::new(TestAdminAuthSettingsStore::default()));

    let response = router
        .oneshot(signed_request(
            "POST",
            "/app/v3/api/iam/invites/claim",
            r#"{"inviteCode":"ZZZ99999"}"#,
        ))
        .await
        .unwrap();

    assert_eq!(StatusCode::BAD_REQUEST, response.status());
}

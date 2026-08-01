pub mod common;

use common::InternalTrustedSubjectHeaders;
use std::sync::{Arc, Mutex};

use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_clawrouter_router_service::ports::{
    AdminMcpBindingItem, AdminMcpCommandFuture, AdminMcpDiscoveryResult, AdminMcpHealthCheckItem,
    AdminMcpListPage, AdminMcpServerItem, AdminMcpServerRevisionItem, AdminMcpStore,
    AdminMcpToolItem, CreateAdminMcpBindingCommand, CreateAdminMcpServerCommand,
    CreateAdminMcpServerRevisionCommand, DiscoverAdminMcpToolsCommand, GetAdminMcpServerQuery,
    ListAdminMcpBindingsQuery, ListAdminMcpServerRevisionsQuery, ListAdminMcpServersQuery,
    ListAdminMcpToolsQuery, PublishAdminMcpServerRevisionCommand, TestAdminMcpServerHealthCommand,
    UpdateAdminMcpBindingCommand, UpdateAdminMcpServerCommand, UpdateAdminMcpToolCommand,
};
use serde_json::{json, Value};
use tower::ServiceExt;

#[tokio::test]
async fn admin_mcp_route_manages_servers_revisions_tools_health_and_bindings() {
    let store = Arc::new(TestAdminMcpStore::default());
    let router = sdkwork_clawrouter_router_service::api::admin_mcp_router_with_store(store.clone());

    let create_server = request_json(
        router.clone(),
        signed_json_request(
            "POST",
            "/backend/v3/api/mcp/servers",
            json!({
                "serverKey": "workspace.context",
                "name": "Workspace Context",
                "description": "Internal context MCP server",
                "categoryId": "2001",
                "transport": "http",
                "visibility": "organization",
                "tags": ["context", "internal"]
            }),
        ),
    )
    .await;
    assert_eq!(0, create_server["code"].as_i64().unwrap());
    assert_eq!(
        "workspace.context",
        create_server["data"]["item"]["serverKey"]
    );
    assert_eq!("2001", create_server["data"]["item"]["categoryId"]);

    let update_server = request_json(
        router.clone(),
        signed_json_request(
            "PUT",
            "/backend/v3/api/mcp/servers/1",
            json!({
                "name": "Workspace Context Hub",
                "visibility": "system",
                "status": "enabled"
            }),
        ),
    )
    .await;
    assert_eq!(
        "Workspace Context Hub",
        update_server["data"]["item"]["name"]
    );
    assert_eq!("system", update_server["data"]["item"]["visibility"]);

    let server_detail = request_json(
        router.clone(),
        signed_empty_request("GET", "/backend/v3/api/mcp/servers/1"),
    )
    .await;
    assert_eq!(
        "workspace.context",
        server_detail["data"]["item"]["serverKey"]
    );

    let create_revision = request_json(
        router.clone(),
        signed_json_request(
            "POST",
            "/backend/v3/api/mcp/servers/1/revisions",
            json!({
                "revisionNo": "1.0.0",
                "transport": "http",
                "endpointUrl": "https://mcp.example.com/context",
                "authType": "secret_ref",
                "secretRef": "secret://mcp/workspace-context",
                "timeoutMs": 30000,
                "retryPolicy": {"maxAttempts": 2}
            }),
        ),
    )
    .await;
    assert_eq!("1.0.0", create_revision["data"]["item"]["revisionNo"]);
    assert_eq!("draft", create_revision["data"]["item"]["lifecycleStatus"]);

    let publish_revision = request_json(
        router.clone(),
        signed_empty_request("POST", "/backend/v3/api/mcp/revisions/1/publish"),
    )
    .await;
    assert_eq!(
        "published",
        publish_revision["data"]["item"]["lifecycleStatus"]
    );

    let discovery = request_json(
        router.clone(),
        signed_empty_request("POST", "/backend/v3/api/mcp/servers/1/discover"),
    )
    .await;
    assert_eq!(1, discovery["data"]["discoveredCount"]);
    assert_eq!("searchWorkspace", discovery["data"]["tools"][0]["toolKey"]);

    let health = request_json(
        router.clone(),
        signed_empty_request("POST", "/backend/v3/api/mcp/servers/1/health_check"),
    )
    .await;
    assert_eq!(true, health["data"]["healthy"]);
    assert_eq!("healthy", health["data"]["healthStatus"]);

    let tools = request_json(
        router.clone(),
        signed_empty_request("GET", "/backend/v3/api/mcp/servers/1/tools"),
    )
    .await;
    assert_eq!("searchWorkspace", tools["data"]["items"][0]["toolKey"]);

    let tool_update = request_json(
        router.clone(),
        signed_json_request(
            "PUT",
            "/backend/v3/api/mcp/tools/1",
            json!({
                "riskLevel": "medium",
                "requiresApproval": true,
                "enabled": true,
                "sortWeight": 20
            }),
        ),
    )
    .await;
    assert_eq!("medium", tool_update["data"]["item"]["riskLevel"]);
    assert_eq!(true, tool_update["data"]["item"]["requiresApproval"]);

    let create_binding = request_json(
        router.clone(),
        signed_json_request(
            "POST",
            "/backend/v3/api/mcp/servers/1/bindings",
            json!({
                "serverRevisionId": 1,
                "toolId": 1,
                "ownerType": "agent",
                "ownerId": 100,
                "allowedTools": ["searchWorkspace"],
                "deniedTools": [],
                "policyJson": {"maxCalls": 4},
                "priority": 10,
                "enabled": true,
                "status": "enabled"
            }),
        ),
    )
    .await;
    assert_eq!("agent", create_binding["data"]["item"]["ownerType"]);
    assert_eq!(4, create_binding["data"]["item"]["policyJson"]["maxCalls"]);

    let update_binding = request_json(
        router.clone(),
        signed_json_request(
            "PUT",
            "/backend/v3/api/mcp/bindings/1",
            json!({
                "deniedTools": ["deleteWorkspace"],
                "priority": 20,
                "enabled": false,
                "status": "disabled"
            }),
        ),
    )
    .await;
    assert_eq!(20, update_binding["data"]["item"]["priority"]);
    assert_eq!(false, update_binding["data"]["item"]["enabled"]);
    assert_eq!("disabled", update_binding["data"]["item"]["status"]);

    let bindings = request_json(
        router.clone(),
        signed_empty_request("GET", "/backend/v3/api/mcp/servers/1/bindings"),
    )
    .await;
    assert_eq!("agent", bindings["data"]["items"][0]["ownerType"]);

    let list_servers = request_json(
        router,
        signed_empty_request("GET", "/backend/v3/api/mcp/servers?page=1&page_size=50"),
    )
    .await;
    assert_eq!(1, list_servers["data"]["items"].as_array().unwrap().len());
}

#[derive(Default)]
struct TestAdminMcpStore {
    servers: Mutex<Vec<AdminMcpServerItem>>,
    revisions: Mutex<Vec<AdminMcpServerRevisionItem>>,
    tools: Mutex<Vec<AdminMcpToolItem>>,
    bindings: Mutex<Vec<AdminMcpBindingItem>>,
}

impl AdminMcpStore for TestAdminMcpStore {
    fn list_servers<'a>(
        &'a self,
        query: ListAdminMcpServersQuery,
    ) -> AdminMcpCommandFuture<'a, AdminMcpListPage<AdminMcpServerItem>> {
        Box::pin(async move {
            assert_eq!(100_001, query.subject.tenant_id);
            let items = self
                .servers
                .lock()
                .unwrap()
                .iter()
                .filter(|item| {
                    item.tenant_id == query.subject.tenant_id
                        && item.organization_id == query.subject.organization_id
                })
                .cloned()
                .collect();
            Ok(test_mcp_page(
                items,
                query.page_no,
                query.page_size,
                query.offset,
            ))
        })
    }

    fn get_server<'a>(
        &'a self,
        query: GetAdminMcpServerQuery,
    ) -> AdminMcpCommandFuture<'a, Option<AdminMcpServerItem>> {
        Box::pin(async move {
            assert_eq!(1, query.server_id);
            Ok(self
                .servers
                .lock()
                .unwrap()
                .iter()
                .find(|item| item.id == query.server_id)
                .cloned())
        })
    }

    fn create_server<'a>(
        &'a self,
        command: CreateAdminMcpServerCommand,
    ) -> AdminMcpCommandFuture<'a, AdminMcpServerItem> {
        Box::pin(async move {
            let item = AdminMcpServerItem {
                id: 1,
                uuid: "mcp-server-1".to_owned(),
                tenant_id: command.subject.tenant_id,
                organization_id: command.subject.organization_id,
                server_key: command.server_key,
                name: command.name,
                description: command.description,
                category_id: command.category_id,
                category_code: None,
                transport: command.transport,
                visibility: command.visibility,
                owner_user_id: Some(command.subject.operator_id),
                latest_revision_id: None,
                published_revision_id: None,
                health_status: "unchecked".to_owned(),
                last_checked_at: None,
                last_error_masked: None,
                status: "enabled".to_owned(),
                tags: command.tags,
                published_at: None,
                deprecated_at: None,
                created_at: "2026-05-26 11:00:00".to_owned(),
                updated_at: "2026-05-26 11:00:00".to_owned(),
            };
            self.servers.lock().unwrap().push(item.clone());
            Ok(item)
        })
    }

    fn update_server<'a>(
        &'a self,
        command: UpdateAdminMcpServerCommand,
    ) -> AdminMcpCommandFuture<'a, Option<AdminMcpServerItem>> {
        Box::pin(async move {
            let mut servers = self.servers.lock().unwrap();
            let Some(item) = servers.iter_mut().find(|item| item.id == command.server_id) else {
                return Ok(None);
            };
            if let Some(name) = command.name {
                item.name = name;
            }
            if let Some(visibility) = command.visibility {
                item.visibility = visibility;
            }
            if let Some(status) = command.status {
                item.status = status;
            }
            Ok(Some(item.clone()))
        })
    }

    fn list_revisions<'a>(
        &'a self,
        query: ListAdminMcpServerRevisionsQuery,
    ) -> AdminMcpCommandFuture<'a, AdminMcpListPage<AdminMcpServerRevisionItem>> {
        Box::pin(async move {
            let items = self
                .revisions
                .lock()
                .unwrap()
                .iter()
                .filter(|item| {
                    item.tenant_id == query.subject.tenant_id
                        && item.organization_id == query.subject.organization_id
                        && item.server_id == query.server_id
                })
                .cloned()
                .collect();
            Ok(test_mcp_page(
                items,
                query.page_no,
                query.page_size,
                query.offset,
            ))
        })
    }

    fn create_revision<'a>(
        &'a self,
        command: CreateAdminMcpServerRevisionCommand,
    ) -> AdminMcpCommandFuture<'a, AdminMcpServerRevisionItem> {
        Box::pin(async move {
            let item = AdminMcpServerRevisionItem {
                id: 1,
                uuid: "mcp-revision-1".to_owned(),
                tenant_id: command.subject.tenant_id,
                organization_id: command.subject.organization_id,
                server_id: command.server_id,
                revision_no: command.revision_no,
                transport: command.transport,
                endpoint_url: command.endpoint_url,
                command: command.command,
                args_json: command.args_json,
                env_schema: command.env_schema,
                auth_type: command.auth_type,
                secret_ref: command.secret_ref,
                timeout_ms: command.timeout_ms,
                retry_policy: command.retry_policy,
                config_hash: "hash".to_owned(),
                lifecycle_status: "draft".to_owned(),
                status: "enabled".to_owned(),
                created_by: command.subject.operator_id,
                published_at: None,
                deprecated_at: None,
                created_at: "2026-05-26 11:01:00".to_owned(),
                updated_at: "2026-05-26 11:01:00".to_owned(),
            };
            self.revisions.lock().unwrap().push(item.clone());
            Ok(item)
        })
    }

    fn publish_revision<'a>(
        &'a self,
        command: PublishAdminMcpServerRevisionCommand,
    ) -> AdminMcpCommandFuture<'a, Option<AdminMcpServerRevisionItem>> {
        Box::pin(async move {
            let mut revisions = self.revisions.lock().unwrap();
            let Some(item) = revisions
                .iter_mut()
                .find(|item| item.id == command.revision_id)
            else {
                return Ok(None);
            };
            item.lifecycle_status = "published".to_owned();
            item.published_at = Some("2026-05-26 11:02:00".to_owned());
            Ok(Some(item.clone()))
        })
    }

    fn discover_tools<'a>(
        &'a self,
        command: DiscoverAdminMcpToolsCommand,
    ) -> AdminMcpCommandFuture<'a, AdminMcpDiscoveryResult> {
        Box::pin(async move {
            let tool = mcp_tool(command.server_id, command.subject.tenant_id);
            self.tools.lock().unwrap().push(tool.clone());
            Ok(AdminMcpDiscoveryResult {
                server_id: command.server_id,
                discovered_count: 1,
                tools: vec![tool],
                checked_at: "2026-05-26 11:03:00".to_owned(),
            })
        })
    }

    fn check_health<'a>(
        &'a self,
        command: TestAdminMcpServerHealthCommand,
    ) -> AdminMcpCommandFuture<'a, AdminMcpHealthCheckItem> {
        Box::pin(async move {
            Ok(AdminMcpHealthCheckItem {
                server_id: command.server_id,
                healthy: true,
                health_status: "healthy".to_owned(),
                checked_at: "2026-05-26 11:04:00".to_owned(),
                latency_ms: Some(42),
                error_masked: None,
            })
        })
    }

    fn list_tools<'a>(
        &'a self,
        query: ListAdminMcpToolsQuery,
    ) -> AdminMcpCommandFuture<'a, AdminMcpListPage<AdminMcpToolItem>> {
        Box::pin(async move {
            let items = self
                .tools
                .lock()
                .unwrap()
                .iter()
                .filter(|item| {
                    item.tenant_id == query.subject.tenant_id
                        && item.organization_id == query.subject.organization_id
                        && item.server_id == query.server_id
                })
                .cloned()
                .collect();
            Ok(test_mcp_page(
                items,
                query.page_no,
                query.page_size,
                query.offset,
            ))
        })
    }

    fn update_tool<'a>(
        &'a self,
        command: UpdateAdminMcpToolCommand,
    ) -> AdminMcpCommandFuture<'a, Option<AdminMcpToolItem>> {
        Box::pin(async move {
            let mut tools = self.tools.lock().unwrap();
            let Some(item) = tools.iter_mut().find(|item| item.id == command.tool_id) else {
                return Ok(None);
            };
            if let Some(risk_level) = command.risk_level {
                item.risk_level = risk_level;
            }
            if let Some(requires_approval) = command.requires_approval {
                item.requires_approval = requires_approval;
            }
            if let Some(enabled) = command.enabled {
                item.enabled = enabled;
            }
            if let Some(sort_weight) = command.sort_weight {
                item.sort_weight = sort_weight;
            }
            Ok(Some(item.clone()))
        })
    }

    fn list_bindings<'a>(
        &'a self,
        query: ListAdminMcpBindingsQuery,
    ) -> AdminMcpCommandFuture<'a, AdminMcpListPage<AdminMcpBindingItem>> {
        Box::pin(async move {
            let items = self
                .bindings
                .lock()
                .unwrap()
                .iter()
                .filter(|item| {
                    item.tenant_id == query.subject.tenant_id
                        && item.organization_id == query.subject.organization_id
                        && item.server_id == query.server_id
                })
                .cloned()
                .collect();
            Ok(test_mcp_page(
                items,
                query.page_no,
                query.page_size,
                query.offset,
            ))
        })
    }

    fn create_binding<'a>(
        &'a self,
        command: CreateAdminMcpBindingCommand,
    ) -> AdminMcpCommandFuture<'a, AdminMcpBindingItem> {
        Box::pin(async move {
            let item = AdminMcpBindingItem {
                id: 1,
                uuid: "mcp-binding-1".to_owned(),
                tenant_id: command.subject.tenant_id,
                organization_id: command.subject.organization_id,
                server_id: command.server_id,
                server_revision_id: command.server_revision_id,
                tool_id: command.tool_id,
                owner_type: command.owner_type,
                owner_id: command.owner_id,
                allowed_tools: command.allowed_tools,
                denied_tools: command.denied_tools,
                policy_json: command.policy_json,
                priority: command.priority,
                enabled: command.enabled,
                status: command.status,
                snapshot_json: json!({ "source": "api-test" }),
                created_at: "2026-05-26 11:05:00".to_owned(),
                updated_at: "2026-05-26 11:05:00".to_owned(),
            };
            self.bindings.lock().unwrap().push(item.clone());
            Ok(item)
        })
    }

    fn update_binding<'a>(
        &'a self,
        command: UpdateAdminMcpBindingCommand,
    ) -> AdminMcpCommandFuture<'a, Option<AdminMcpBindingItem>> {
        Box::pin(async move {
            let mut bindings = self.bindings.lock().unwrap();
            let Some(item) = bindings
                .iter_mut()
                .find(|item| item.id == command.binding_id)
            else {
                return Ok(None);
            };
            if let Some(server_revision_id) = command.server_revision_id {
                item.server_revision_id = server_revision_id;
            }
            if let Some(tool_id) = command.tool_id {
                item.tool_id = tool_id;
            }
            if let Some(owner_type) = command.owner_type {
                item.owner_type = owner_type;
            }
            if let Some(owner_id) = command.owner_id {
                item.owner_id = owner_id;
            }
            if let Some(allowed_tools) = command.allowed_tools {
                item.allowed_tools = allowed_tools;
            }
            if let Some(denied_tools) = command.denied_tools {
                item.denied_tools = denied_tools;
            }
            if let Some(policy_json) = command.policy_json {
                item.policy_json = policy_json;
            }
            if let Some(priority) = command.priority {
                item.priority = priority;
            }
            if let Some(enabled) = command.enabled {
                item.enabled = enabled;
            }
            if let Some(status) = command.status {
                item.status = status;
            }
            item.updated_at = "2026-05-26 11:06:00".to_owned();
            Ok(Some(item.clone()))
        })
    }
}

fn test_mcp_page<T>(
    items: Vec<T>,
    page_no: i64,
    page_size: i64,
    offset: i64,
) -> AdminMcpListPage<T> {
    let total = i64::try_from(items.len()).unwrap_or(i64::MAX);
    let items = items
        .into_iter()
        .skip(offset.max(0) as usize)
        .take(page_size.max(0) as usize)
        .collect();
    AdminMcpListPage {
        items,
        total,
        page_no,
        page_size,
    }
}

fn mcp_tool(server_id: i64, tenant_id: i64) -> AdminMcpToolItem {
    AdminMcpToolItem {
        id: 1,
        uuid: "mcp-tool-1".to_owned(),
        tenant_id,
        organization_id: 0,
        server_id,
        server_revision_id: Some(1),
        tool_key: "searchWorkspace".to_owned(),
        name: "Search Workspace".to_owned(),
        description: Some("Search workspace knowledge".to_owned()),
        input_schema: json!({ "type": "object" }),
        output_schema: json!({ "type": "object" }),
        risk_level: "low".to_owned(),
        requires_approval: false,
        enabled: true,
        status: "enabled".to_owned(),
        rate_limit_policy: json!({}),
        schema_hash: "hash".to_owned(),
        discovered_at: Some("2026-05-26 11:03:00".to_owned()),
        last_invoked_at: None,
        sort_weight: 10,
        created_at: "2026-05-26 11:03:00".to_owned(),
        updated_at: "2026-05-26 11:03:00".to_owned(),
    }
}

fn signed_empty_request(method: &str, path: &str) -> Request<Body> {
    Request::builder()
        .method(method)
        .uri(path)
        .internal_trusted_subject(100001, 0, 30)
        .body(Body::empty())
        .unwrap()
}

fn signed_json_request(method: &str, path: &str, body: Value) -> Request<Body> {
    Request::builder()
        .method(method)
        .uri(path)
        .internal_trusted_subject(100001, 0, 30)
        .header("content-type", "application/json")
        .body(Body::from(body.to_string()))
        .unwrap()
}

async fn request_json(router: axum::Router, request: Request<Body>) -> Value {
    let response = router.oneshot(request).await.unwrap();
    assert_eq!(StatusCode::OK, response.status());
    json_payload(response).await
}

async fn json_payload(response: axum::response::Response) -> Value {
    let bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    serde_json::from_slice(&bytes).unwrap()
}

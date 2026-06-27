use sdkwork_web_core::{HttpMethod, HttpRoute, HttpRouteManifest, RateLimitTier};

const fn abuse_sensitive_route(
    method: HttpMethod,
    path: &'static str,
    tag: &'static str,
    operation_id: &'static str,
) -> HttpRoute {
    HttpRoute::dual_token(method, path, tag, operation_id)
        .with_rate_limit_tier(RateLimitTier::AuthCritical)
}

const HTTP_ROUTES: &[HttpRoute] = &[
    HttpRoute::dual_token(
        HttpMethod::Get,
        "/backend/v3/api/mcp/categories",
        "mcp-admin",
        "mcpAdmin.listCategories",
    ),
    HttpRoute::dual_token(
        HttpMethod::Post,
        "/backend/v3/api/mcp/categories",
        "mcp-admin",
        "mcpAdmin.upsertCategory",
    ),
    HttpRoute::dual_token(
        HttpMethod::Get,
        "/backend/v3/api/mcp/servers",
        "mcp-admin",
        "mcpAdmin.listServers",
    ),
    HttpRoute::dual_token(
        HttpMethod::Post,
        "/backend/v3/api/mcp/servers",
        "mcp-admin",
        "mcpAdmin.createServer",
    ),
    HttpRoute::dual_token(
        HttpMethod::Put,
        "/backend/v3/api/mcp/servers/{serverKey}",
        "mcp-admin",
        "mcpAdmin.updateServer",
    ),
    abuse_sensitive_route(
        HttpMethod::Delete,
        "/backend/v3/api/mcp/servers/{serverKey}",
        "mcp-admin",
        "mcpAdmin.deleteServer",
    ),
    HttpRoute::dual_token(
        HttpMethod::Get,
        "/backend/v3/api/mcp/servers/{serverId}/connectors",
        "mcp-admin",
        "mcpAdmin.listConnectors",
    ),
    HttpRoute::dual_token(
        HttpMethod::Post,
        "/backend/v3/api/mcp/servers/{serverId}/connectors",
        "mcp-admin",
        "mcpAdmin.upsertConnector",
    ),
    abuse_sensitive_route(
        HttpMethod::Delete,
        "/backend/v3/api/mcp/servers/{serverId}/connectors/{connectorKey}",
        "mcp-admin",
        "mcpAdmin.deleteConnector",
    ),
    HttpRoute::dual_token(
        HttpMethod::Post,
        "/backend/v3/api/mcp/servers/{serverId}/tools",
        "mcp-admin",
        "mcpAdmin.upsertTool",
    ),
    HttpRoute::dual_token(
        HttpMethod::Post,
        "/backend/v3/api/mcp/servers/{serverId}/resources",
        "mcp-admin",
        "mcpAdmin.upsertResource",
    ),
    HttpRoute::dual_token(
        HttpMethod::Post,
        "/backend/v3/api/mcp/servers/{serverId}/prompts",
        "mcp-admin",
        "mcpAdmin.upsertPrompt",
    ),
    HttpRoute::dual_token(
        HttpMethod::Get,
        "/backend/v3/api/mcp/invocations",
        "mcp-admin",
        "mcpAdmin.listInvocations",
    ),
    abuse_sensitive_route(
        HttpMethod::Post,
        "/backend/v3/api/mcp/invocations",
        "mcp-admin",
        "mcpAdmin.appendInvocation",
    ),
];

pub fn backend_route_manifest() -> HttpRouteManifest {
    HttpRouteManifest::new(HTTP_ROUTES)
}

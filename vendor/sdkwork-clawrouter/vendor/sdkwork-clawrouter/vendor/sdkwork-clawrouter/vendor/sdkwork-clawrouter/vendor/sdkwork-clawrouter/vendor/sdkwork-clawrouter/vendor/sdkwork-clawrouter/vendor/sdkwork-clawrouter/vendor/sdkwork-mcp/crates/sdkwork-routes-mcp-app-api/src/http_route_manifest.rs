use sdkwork_web_core::{HttpMethod, HttpRoute, HttpRouteManifest};

const HTTP_ROUTES: &[HttpRoute] = &[
    HttpRoute::dual_token(
        HttpMethod::Get,
        "/app/v3/api/mcp/categories",
        "mcp",
        "mcp.listCategories",
    ),
    HttpRoute::dual_token(
        HttpMethod::Get,
        "/app/v3/api/mcp/servers",
        "mcp",
        "mcp.listServers",
    ),
    HttpRoute::dual_token(
        HttpMethod::Get,
        "/app/v3/api/mcp/servers/{serverKey}",
        "mcp",
        "mcp.getServer",
    ),
    HttpRoute::dual_token(
        HttpMethod::Get,
        "/app/v3/api/mcp/servers/{serverId}/tools",
        "mcp",
        "mcp.listTools",
    ),
    HttpRoute::dual_token(
        HttpMethod::Get,
        "/app/v3/api/mcp/servers/{serverId}/tools/{toolKey}",
        "mcp",
        "mcp.getTool",
    ),
    HttpRoute::dual_token(
        HttpMethod::Get,
        "/app/v3/api/mcp/servers/{serverId}/resources",
        "mcp",
        "mcp.listResources",
    ),
    HttpRoute::dual_token(
        HttpMethod::Get,
        "/app/v3/api/mcp/servers/{serverId}/prompts",
        "mcp",
        "mcp.listPrompts",
    ),
    HttpRoute::dual_token(
        HttpMethod::Get,
        "/app/v3/api/mcp/invocations",
        "mcp",
        "mcp.listInvocations",
    ),
];

pub fn app_route_manifest() -> HttpRouteManifest {
    HttpRouteManifest::new(HTTP_ROUTES)
}

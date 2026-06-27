pub const LIVEZ: &str = "/livez";
pub const READYZ: &str = "/readyz";
pub const HEALTHZ: &str = "/healthz";

pub const ADMIN_CATEGORIES_LIST: &str = "/backend/v3/api/mcp/categories";
pub const ADMIN_CATEGORY_UPSERT: &str = "/backend/v3/api/mcp/categories";

pub const ADMIN_SERVERS_LIST: &str = "/backend/v3/api/mcp/servers";
pub const ADMIN_SERVER_CREATE: &str = "/backend/v3/api/mcp/servers";
pub const ADMIN_SERVER_UPDATE: &str = "/backend/v3/api/mcp/servers/{serverKey}";
pub const ADMIN_SERVER_DELETE: &str = "/backend/v3/api/mcp/servers/{serverKey}";
pub const ADMIN_CONNECTORS_LIST: &str = "/backend/v3/api/mcp/servers/{serverId}/connectors";
pub const ADMIN_CONNECTOR_UPSERT: &str = "/backend/v3/api/mcp/servers/{serverId}/connectors";
pub const ADMIN_CONNECTOR_DELETE: &str =
    "/backend/v3/api/mcp/servers/{serverId}/connectors/{connectorKey}";
pub const ADMIN_TOOL_UPSERT: &str = "/backend/v3/api/mcp/servers/{serverId}/tools";
pub const ADMIN_RESOURCE_UPSERT: &str = "/backend/v3/api/mcp/servers/{serverId}/resources";
pub const ADMIN_PROMPT_UPSERT: &str = "/backend/v3/api/mcp/servers/{serverId}/prompts";
pub const ADMIN_INVOCATIONS_LIST: &str = "/backend/v3/api/mcp/invocations";
pub const ADMIN_INVOCATIONS_APPEND: &str = "/backend/v3/api/mcp/invocations";

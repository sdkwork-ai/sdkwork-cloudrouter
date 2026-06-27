pub const LIVEZ: &str = "/livez";
pub const READYZ: &str = "/readyz";
pub const HEALTHZ: &str = "/healthz";

pub const CATEGORIES_LIST: &str = "/app/v3/api/mcp/categories";

pub const SERVERS_LIST: &str = "/app/v3/api/mcp/servers";
pub const SERVER_GET: &str = "/app/v3/api/mcp/servers/{serverKey}";
pub const SERVER_TOOLS_LIST: &str = "/app/v3/api/mcp/servers/{serverId}/tools";
pub const SERVER_TOOL_GET: &str = "/app/v3/api/mcp/servers/{serverId}/tools/{toolKey}";
pub const SERVER_RESOURCES_LIST: &str = "/app/v3/api/mcp/servers/{serverId}/resources";
pub const SERVER_PROMPTS_LIST: &str = "/app/v3/api/mcp/servers/{serverId}/prompts";
pub const INVOCATIONS_LIST: &str = "/app/v3/api/mcp/invocations";

use std::sync::Arc;

use sdkwork_intelligence_mcp_repository_sqlx::SqlxMcpRepository;
use sdkwork_intelligence_mcp_service::McpService;
use sdkwork_mcp_database_host::bootstrap_mcp_database_from_env;
use sqlx::PgPool;

pub struct McpRuntime {
    service: Arc<McpService<SqlxMcpRepository>>,
    default_tenant_id: u64,
    pool: PgPool,
}

impl McpRuntime {
    pub async fn bootstrap_from_env() -> Result<Self, String> {
        let host = bootstrap_mcp_database_from_env().await?;
        let pool = host
            .postgres_pool()
            .ok_or_else(|| "mcp runtime requires postgres database pool".to_string())?
            .clone();
        let repository = SqlxMcpRepository::new(pool.clone());
        let service = Arc::new(McpService::new(repository));
        let default_tenant_id = std::env::var("SDKWORK_MCP_TENANT_ID")
            .ok()
            .and_then(|value| value.parse::<u64>().ok())
            .unwrap_or(100_001);
        Ok(Self {
            service,
            default_tenant_id,
            pool,
        })
    }

    pub fn service(&self) -> Arc<McpService<SqlxMcpRepository>> {
        self.service.clone()
    }

    pub fn default_tenant_id(&self) -> u64 {
        self.default_tenant_id
    }

    pub fn postgres_pool(&self) -> PgPool {
        self.pool.clone()
    }
}

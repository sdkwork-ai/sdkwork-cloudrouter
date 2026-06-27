mod entity_ids;
mod json_util;
mod postgres;

use async_trait::async_trait;
use sdkwork_intelligence_mcp_service::{McpRepository, McpResult};
use sdkwork_mcp_contract::{
    McpConnectorRecord, McpInvocationRecord, McpPromptRecord, McpResourceRecord,
    McpServerCategoryRecord, McpServerRecord, McpToolRecord,
};
use sqlx::PgPool;

#[derive(Clone)]
pub struct SqlxMcpRepository {
    pool: PgPool,
}

impl SqlxMcpRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub fn pool(&self) -> &PgPool {
        &self.pool
    }
}

#[async_trait]
impl McpRepository for SqlxMcpRepository {
    async fn list_servers(&self, tenant_id: u64) -> McpResult<Vec<McpServerRecord>> {
        postgres::list_servers(&self.pool, tenant_id).await
    }

    async fn get_server(&self, tenant_id: u64, server_key: &str) -> McpResult<McpServerRecord> {
        postgres::get_server(&self.pool, tenant_id, server_key).await
    }

    async fn upsert_server(&self, record: McpServerRecord) -> McpResult<McpServerRecord> {
        postgres::upsert_server(&self.pool, record).await
    }

    async fn delete_server(
        &self,
        tenant_id: u64,
        server_key: &str,
    ) -> McpResult<McpServerRecord> {
        postgres::delete_server(&self.pool, tenant_id, server_key).await
    }

    async fn list_categories(&self, tenant_id: u64) -> McpResult<Vec<McpServerCategoryRecord>> {
        postgres::list_categories(&self.pool, tenant_id).await
    }

    async fn get_category(
        &self,
        tenant_id: u64,
        category_code: &str,
    ) -> McpResult<McpServerCategoryRecord> {
        postgres::get_category(&self.pool, tenant_id, category_code).await
    }

    async fn upsert_category(
        &self,
        record: McpServerCategoryRecord,
    ) -> McpResult<McpServerCategoryRecord> {
        postgres::upsert_category(&self.pool, record).await
    }

    async fn list_connectors(
        &self,
        tenant_id: u64,
        server_id: u64,
    ) -> McpResult<Vec<McpConnectorRecord>> {
        postgres::list_connectors(&self.pool, tenant_id, server_id).await
    }

    async fn get_connector(
        &self,
        tenant_id: u64,
        server_id: u64,
        connector_key: &str,
    ) -> McpResult<McpConnectorRecord> {
        postgres::get_connector(&self.pool, tenant_id, server_id, connector_key).await
    }

    async fn upsert_connector(&self, record: McpConnectorRecord) -> McpResult<McpConnectorRecord> {
        postgres::upsert_connector(&self.pool, record).await
    }

    async fn delete_connector(
        &self,
        tenant_id: u64,
        server_id: u64,
        connector_key: &str,
    ) -> McpResult<McpConnectorRecord> {
        postgres::delete_connector(&self.pool, tenant_id, server_id, connector_key).await
    }

    async fn list_tools(&self, tenant_id: u64, server_id: u64) -> McpResult<Vec<McpToolRecord>> {
        postgres::list_tools(&self.pool, tenant_id, server_id).await
    }

    async fn get_tool(
        &self,
        tenant_id: u64,
        server_id: u64,
        tool_key: &str,
    ) -> McpResult<McpToolRecord> {
        postgres::get_tool(&self.pool, tenant_id, server_id, tool_key).await
    }

    async fn upsert_tool(&self, record: McpToolRecord) -> McpResult<McpToolRecord> {
        postgres::upsert_tool(&self.pool, record).await
    }

    async fn list_resources(
        &self,
        tenant_id: u64,
        server_id: u64,
    ) -> McpResult<Vec<McpResourceRecord>> {
        postgres::list_resources(&self.pool, tenant_id, server_id).await
    }

    async fn get_resource(
        &self,
        tenant_id: u64,
        server_id: u64,
        resource_key: &str,
    ) -> McpResult<McpResourceRecord> {
        postgres::get_resource(&self.pool, tenant_id, server_id, resource_key).await
    }

    async fn upsert_resource(&self, record: McpResourceRecord) -> McpResult<McpResourceRecord> {
        postgres::upsert_resource(&self.pool, record).await
    }

    async fn list_prompts(
        &self,
        tenant_id: u64,
        server_id: u64,
    ) -> McpResult<Vec<McpPromptRecord>> {
        postgres::list_prompts(&self.pool, tenant_id, server_id).await
    }

    async fn get_prompt(
        &self,
        tenant_id: u64,
        server_id: u64,
        prompt_key: &str,
    ) -> McpResult<McpPromptRecord> {
        postgres::get_prompt(&self.pool, tenant_id, server_id, prompt_key).await
    }

    async fn upsert_prompt(&self, record: McpPromptRecord) -> McpResult<McpPromptRecord> {
        postgres::upsert_prompt(&self.pool, record).await
    }

    async fn list_invocations(
        &self,
        tenant_id: u64,
        server_id: Option<u64>,
        limit: u32,
    ) -> McpResult<Vec<McpInvocationRecord>> {
        postgres::list_invocations(&self.pool, tenant_id, server_id, limit).await
    }

    async fn append_invocation(&self, record: McpInvocationRecord) -> McpResult<McpInvocationRecord> {
        postgres::append_invocation(&self.pool, record).await
    }
}

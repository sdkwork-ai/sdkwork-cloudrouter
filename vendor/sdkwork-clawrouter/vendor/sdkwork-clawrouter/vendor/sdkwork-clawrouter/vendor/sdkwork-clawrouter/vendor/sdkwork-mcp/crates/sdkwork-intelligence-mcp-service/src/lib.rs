pub mod integration;

mod validation;

#[cfg(test)]
mod validation_tests;

use async_trait::async_trait;
use sdkwork_mcp_contract::{
    McpConnectorRecord, McpInvocationRecord, McpPromptRecord, McpResourceRecord,
    McpServerCategoryRecord, McpServerRecord, McpToolRecord,
};
use thiserror::Error;

use crate::integration::drive::McpDrivePort;

#[derive(Debug, Error)]
pub enum McpServiceError {
    #[error("not found: {0}")]
    NotFound(String),
    #[error("invalid argument: {0}")]
    InvalidArgument(String),
    #[error("repository error: {0}")]
    Repository(String),
    #[error("drive error: {0}")]
    Drive(String),
}

pub type McpResult<T> = Result<T, McpServiceError>;

#[async_trait]
pub trait McpRepository: Send + Sync {
    async fn list_servers(&self, tenant_id: u64) -> McpResult<Vec<McpServerRecord>>;
    async fn get_server(&self, tenant_id: u64, server_key: &str) -> McpResult<McpServerRecord>;
    async fn upsert_server(&self, record: McpServerRecord) -> McpResult<McpServerRecord>;
    async fn delete_server(&self, tenant_id: u64, server_key: &str) -> McpResult<McpServerRecord>;

    async fn list_categories(
        &self,
        tenant_id: u64,
    ) -> McpResult<Vec<McpServerCategoryRecord>>;
    async fn get_category(
        &self,
        tenant_id: u64,
        category_code: &str,
    ) -> McpResult<McpServerCategoryRecord>;
    async fn upsert_category(
        &self,
        record: McpServerCategoryRecord,
    ) -> McpResult<McpServerCategoryRecord>;

    async fn list_connectors(
        &self,
        tenant_id: u64,
        server_id: u64,
    ) -> McpResult<Vec<McpConnectorRecord>>;
    async fn get_connector(
        &self,
        tenant_id: u64,
        server_id: u64,
        connector_key: &str,
    ) -> McpResult<McpConnectorRecord>;
    async fn upsert_connector(&self, record: McpConnectorRecord) -> McpResult<McpConnectorRecord>;
    async fn delete_connector(
        &self,
        tenant_id: u64,
        server_id: u64,
        connector_key: &str,
    ) -> McpResult<McpConnectorRecord>;

    async fn list_tools(&self, tenant_id: u64, server_id: u64) -> McpResult<Vec<McpToolRecord>>;
    async fn get_tool(
        &self,
        tenant_id: u64,
        server_id: u64,
        tool_key: &str,
    ) -> McpResult<McpToolRecord>;
    async fn upsert_tool(&self, record: McpToolRecord) -> McpResult<McpToolRecord>;

    async fn list_resources(
        &self,
        tenant_id: u64,
        server_id: u64,
    ) -> McpResult<Vec<McpResourceRecord>>;
    async fn get_resource(
        &self,
        tenant_id: u64,
        server_id: u64,
        resource_key: &str,
    ) -> McpResult<McpResourceRecord>;
    async fn upsert_resource(&self, record: McpResourceRecord) -> McpResult<McpResourceRecord>;

    async fn list_prompts(
        &self,
        tenant_id: u64,
        server_id: u64,
    ) -> McpResult<Vec<McpPromptRecord>>;
    async fn get_prompt(
        &self,
        tenant_id: u64,
        server_id: u64,
        prompt_key: &str,
    ) -> McpResult<McpPromptRecord>;
    async fn upsert_prompt(&self, record: McpPromptRecord) -> McpResult<McpPromptRecord>;

    async fn list_invocations(
        &self,
        tenant_id: u64,
        server_id: Option<u64>,
        limit: u32,
    ) -> McpResult<Vec<McpInvocationRecord>>;
    async fn append_invocation(&self, record: McpInvocationRecord) -> McpResult<McpInvocationRecord>;
}

pub struct McpService<R: McpRepository> {
    repository: R,
    drive_port: Box<dyn McpDrivePort>,
}

impl<R: McpRepository> McpService<R> {
    pub fn new(repository: R) -> Self {
        Self {
            repository,
            drive_port: Box::new(integration::drive::ContractMcpDrivePort),
        }
    }

    pub fn with_drive_port(mut self, drive_port: Box<dyn McpDrivePort>) -> Self {
        self.drive_port = drive_port;
        self
    }

    pub async fn list_servers(&self, tenant_id: u64) -> McpResult<Vec<McpServerRecord>> {
        self.repository.list_servers(tenant_id).await
    }

    pub async fn get_server(&self, tenant_id: u64, server_key: &str) -> McpResult<McpServerRecord> {
        validation::validate_server_key(server_key)?;
        self.repository.get_server(tenant_id, server_key).await
    }

    pub async fn upsert_server(&self, record: McpServerRecord) -> McpResult<McpServerRecord> {
        validation::validate_server_record(&record)?;
        if let Some(icon_ref) = record.icon_ref.as_deref() {
            self.drive_port
                .validate_icon_reference(icon_ref)
                .map_err(McpServiceError::Drive)?;
        }
        self.repository.upsert_server(record).await
    }

    pub async fn delete_server(
        &self,
        tenant_id: u64,
        server_key: &str,
    ) -> McpResult<McpServerRecord> {
        validation::validate_server_key(server_key)?;
        self.repository.delete_server(tenant_id, server_key).await
    }

    pub async fn list_categories(
        &self,
        tenant_id: u64,
    ) -> McpResult<Vec<McpServerCategoryRecord>> {
        self.repository.list_categories(tenant_id).await
    }

    pub async fn get_category(
        &self,
        tenant_id: u64,
        category_code: &str,
    ) -> McpResult<McpServerCategoryRecord> {
        validation::validate_category_code(category_code)?;
        self.repository.get_category(tenant_id, category_code).await
    }

    pub async fn upsert_category(
        &self,
        record: McpServerCategoryRecord,
    ) -> McpResult<McpServerCategoryRecord> {
        validation::validate_category_record(&record)?;
        self.repository.upsert_category(record).await
    }

    pub async fn list_connectors(
        &self,
        tenant_id: u64,
        server_id: u64,
    ) -> McpResult<Vec<McpConnectorRecord>> {
        self.repository.list_connectors(tenant_id, server_id).await
    }

    pub async fn get_connector(
        &self,
        tenant_id: u64,
        server_id: u64,
        connector_key: &str,
    ) -> McpResult<McpConnectorRecord> {
        validation::validate_connector_key(connector_key)?;
        self.repository
            .get_connector(tenant_id, server_id, connector_key)
            .await
    }

    pub async fn upsert_connector(
        &self,
        record: McpConnectorRecord,
    ) -> McpResult<McpConnectorRecord> {
        validation::validate_connector_record(&record)?;
        self.repository.upsert_connector(record).await
    }

    pub async fn delete_connector(
        &self,
        tenant_id: u64,
        server_id: u64,
        connector_key: &str,
    ) -> McpResult<McpConnectorRecord> {
        validation::validate_connector_key(connector_key)?;
        self.repository
            .delete_connector(tenant_id, server_id, connector_key)
            .await
    }

    pub async fn list_tools(&self, tenant_id: u64, server_id: u64) -> McpResult<Vec<McpToolRecord>> {
        self.repository.list_tools(tenant_id, server_id).await
    }

    pub async fn get_tool(
        &self,
        tenant_id: u64,
        server_id: u64,
        tool_key: &str,
    ) -> McpResult<McpToolRecord> {
        validation::validate_entity_key(tool_key, "tool_key")?;
        self.repository.get_tool(tenant_id, server_id, tool_key).await
    }

    pub async fn upsert_tool(&self, record: McpToolRecord) -> McpResult<McpToolRecord> {
        validation::validate_tool_record(&record)?;
        self.repository.upsert_tool(record).await
    }

    pub async fn list_resources(
        &self,
        tenant_id: u64,
        server_id: u64,
    ) -> McpResult<Vec<McpResourceRecord>> {
        self.repository.list_resources(tenant_id, server_id).await
    }

    pub async fn get_resource(
        &self,
        tenant_id: u64,
        server_id: u64,
        resource_key: &str,
    ) -> McpResult<McpResourceRecord> {
        validation::validate_entity_key(resource_key, "resource_key")?;
        self.repository
            .get_resource(tenant_id, server_id, resource_key)
            .await
    }

    pub async fn upsert_resource(&self, record: McpResourceRecord) -> McpResult<McpResourceRecord> {
        validation::validate_resource_record(&record)?;
        self.repository.upsert_resource(record).await
    }

    pub async fn list_prompts(
        &self,
        tenant_id: u64,
        server_id: u64,
    ) -> McpResult<Vec<McpPromptRecord>> {
        self.repository.list_prompts(tenant_id, server_id).await
    }

    pub async fn get_prompt(
        &self,
        tenant_id: u64,
        server_id: u64,
        prompt_key: &str,
    ) -> McpResult<McpPromptRecord> {
        validation::validate_entity_key(prompt_key, "prompt_key")?;
        self.repository
            .get_prompt(tenant_id, server_id, prompt_key)
            .await
    }

    pub async fn upsert_prompt(&self, record: McpPromptRecord) -> McpResult<McpPromptRecord> {
        validation::validate_prompt_record(&record)?;
        self.repository.upsert_prompt(record).await
    }

    pub async fn list_invocations(
        &self,
        tenant_id: u64,
        server_id: Option<u64>,
        limit: u32,
    ) -> McpResult<Vec<McpInvocationRecord>> {
        self.repository
            .list_invocations(tenant_id, server_id, limit)
            .await
    }

    pub async fn append_invocation(
        &self,
        record: McpInvocationRecord,
    ) -> McpResult<McpInvocationRecord> {
        validation::validate_invocation_record(&record)?;
        self.repository.append_invocation(record).await
    }

    pub fn create_icon_upload_grant(&self, icon_ref: &str) -> McpResult<String> {
        validation::validate_icon_ref(icon_ref)?;
        self.drive_port
            .create_upload_grant(icon_ref)
            .map_err(McpServiceError::Drive)
    }
}

#[derive(Debug, Clone)]
pub struct McpBackendRequestContext {
    pub tenant_id: u64,
    pub operator_id: Option<u64>,
}

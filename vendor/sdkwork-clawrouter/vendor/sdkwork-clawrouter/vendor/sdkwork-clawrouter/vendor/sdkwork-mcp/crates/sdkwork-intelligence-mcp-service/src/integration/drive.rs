use sdkwork_drive_contract::DriveUri;

use crate::validation;

pub trait McpDrivePort: Send + Sync {
    fn validate_icon_reference(&self, icon_ref: &str) -> Result<(), String>;
    fn create_upload_grant(&self, icon_ref: &str) -> Result<String, String>;
}

/// Validates icon references through `sdkwork-drive-contract` URI rules.
pub struct ContractMcpDrivePort;

impl McpDrivePort for ContractMcpDrivePort {
    fn validate_icon_reference(&self, icon_ref: &str) -> Result<(), String> {
        validation::validate_icon_ref(icon_ref).map_err(|error| error.to_string())
    }

    fn create_upload_grant(&self, icon_ref: &str) -> Result<String, String> {
        let uri = DriveUri::parse(icon_ref).map_err(|error| error.to_string())?;
        Ok(format!(
            "drive-grant://{}/{}",
            uri.space_id(),
            uri.node_id()
        ))
    }
}

pub struct NoopMcpDrivePort;

impl McpDrivePort for NoopMcpDrivePort {
    fn validate_icon_reference(&self, _icon_ref: &str) -> Result<(), String> {
        Ok(())
    }

    fn create_upload_grant(&self, icon_ref: &str) -> Result<String, String> {
        Ok(format!("noop-grant:{icon_ref}"))
    }
}

pub struct LoggingMcpDrivePort;

impl McpDrivePort for LoggingMcpDrivePort {
    fn validate_icon_reference(&self, icon_ref: &str) -> Result<(), String> {
        eprintln!("[mcp-drive] validate icon reference: {icon_ref}");
        Ok(())
    }

    fn create_upload_grant(&self, icon_ref: &str) -> Result<String, String> {
        let grant_id = format!("grant:{icon_ref}");
        eprintln!("[mcp-drive] created upload grant: {grant_id}");
        Ok(grant_id)
    }
}

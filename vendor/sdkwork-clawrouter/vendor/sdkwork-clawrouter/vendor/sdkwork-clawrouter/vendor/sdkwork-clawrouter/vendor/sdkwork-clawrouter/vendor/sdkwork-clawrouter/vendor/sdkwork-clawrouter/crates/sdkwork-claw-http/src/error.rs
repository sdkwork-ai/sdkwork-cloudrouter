use serde::Serialize;

use sdkwork_claw_contract::{ApiSurface, ContractOperation};

#[derive(Debug, Serialize)]
pub struct PlusErrorEnvelope<T> {
    pub code: &'static str,
    pub msg: &'static str,
    pub data: T,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NotImplementedData {
    pub operation: String,
    pub api_surface: &'static str,
    pub api_method: String,
    pub api_path: String,
    pub contract_path: String,
}

impl PlusErrorEnvelope<NotImplementedData> {
    pub fn not_implemented(
        operation: &ContractOperation,
        surface: ApiSurface,
        request_path: &str,
    ) -> Self {
        Self {
            code: "5010",
            msg: "Not implemented",
            data: NotImplementedData {
                operation: operation.operation.clone(),
                api_surface: surface.sdk_family(),
                api_method: operation.method.clone(),
                api_path: request_path.to_owned(),
                contract_path: operation.path.clone(),
            },
        }
    }
}

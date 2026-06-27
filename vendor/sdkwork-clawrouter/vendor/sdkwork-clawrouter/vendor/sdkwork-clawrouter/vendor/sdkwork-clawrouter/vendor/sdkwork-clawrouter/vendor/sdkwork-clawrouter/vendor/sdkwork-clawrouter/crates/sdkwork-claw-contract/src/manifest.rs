use serde::Deserialize;

use crate::{matches_path_pattern, ApiSurface, ContractOperation};

const EMBEDDED_MANIFEST: &str = include_str!("../../../generated/api/api-contract-manifest.json");

#[derive(Debug, Clone)]
pub struct ContractManifest {
    operations: Vec<ContractOperation>,
}

#[derive(Debug, Deserialize)]
struct ManifestDocument {
    operations: Vec<ContractOperation>,
}

impl ContractManifest {
    pub fn from_embedded() -> serde_json::Result<Self> {
        Self::from_json(EMBEDDED_MANIFEST)
    }

    pub fn from_json(payload: &str) -> serde_json::Result<Self> {
        let document: ManifestDocument = serde_json::from_str(payload)?;
        Ok(Self {
            operations: document.operations,
        })
    }

    pub fn operations(&self) -> &[ContractOperation] {
        &self.operations
    }

    pub fn find_operation(
        &self,
        surface: ApiSurface,
        method: &str,
        path: &str,
    ) -> Option<&ContractOperation> {
        self.operations.iter().find(|operation| {
            operation.surface == surface
                && operation.method.eq_ignore_ascii_case(method)
                && matches_path_pattern(&operation.path, path)
        })
    }
}

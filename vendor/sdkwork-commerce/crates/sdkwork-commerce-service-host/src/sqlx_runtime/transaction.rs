use sdkwork_commerce_contract_service::CommerceServiceError;

use crate::CommerceRuntimeTransactionManager;

/// Runtime transaction boundary for RPC host bootstrap.
///
/// Domain stores already execute their own SQLx transactions; this manager satisfies the
/// `CommerceRuntimeTransactionManager` port without opening a second connection-scoped tx.
#[derive(Clone, Debug, Default)]
pub struct SqlxCommerceRuntimeTransactionManager;

impl CommerceRuntimeTransactionManager for SqlxCommerceRuntimeTransactionManager {
    fn begin(&mut self, _operation_id: &str) -> Result<(), CommerceServiceError> {
        Ok(())
    }

    fn commit(&mut self, _operation_id: &str) -> Result<(), CommerceServiceError> {
        Ok(())
    }

    fn rollback(&mut self, _operation_id: &str) -> Result<(), CommerceServiceError> {
        Ok(())
    }
}

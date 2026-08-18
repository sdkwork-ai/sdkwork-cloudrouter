//! Postgres-backed [`GatewayBalanceStore`] adapter.
//!
//! Reads the relay key owner's Token Bank wallet balance through the
//! account-domain wallet store. The token bank is the platform's token
//! balance ledger; relay usage is settled against it, so the balance shown by
//! the gateway endpoint reflects what the key's owner can still consume.

use std::sync::Arc;

use sdkwork_account_repository_sqlx::PostgresCommerceAccountStore;
use sdkwork_account_service::WalletAccountListQuery;
use sdkwork_cloudrouter_router_service::api::{GatewayBalanceStore, GatewayTokenBankBalance};
use sdkwork_contract_service::CommerceAccountAssetType;

/// Token Bank asset unit label (matches the account platform convention).
const TOKEN_BANK_UNIT: &str = "TOKEN_BANK";

pub struct PostgresGatewayBalanceStore {
    store: Arc<PostgresCommerceAccountStore>,
}

impl PostgresGatewayBalanceStore {
    pub fn new(store: Arc<PostgresCommerceAccountStore>) -> Self {
        Self { store }
    }
}

#[async_trait::async_trait]
impl GatewayBalanceStore for PostgresGatewayBalanceStore {
    async fn retrieve_token_bank_balance(
        &self,
        tenant_id: i64,
        organization_id: i64,
        user_id: i64,
    ) -> Result<GatewayTokenBankBalance, String> {
        let query = WalletAccountListQuery::new(
            &tenant_id.to_string(),
            Some(&organization_id.to_string()),
            &user_id.to_string(),
            Some(CommerceAccountAssetType::TokenBank),
        )
        .map_err(|error| error.message().to_owned())?;
        let account = self
            .store
            .retrieve_wallet_account_for_asset(query, CommerceAccountAssetType::TokenBank)
            .await
            .map_err(|error| error.message().to_owned())?;
        Ok(GatewayTokenBankBalance {
            available: account.available_amount.as_str().to_owned(),
            frozen: account.frozen_amount.as_str().to_owned(),
            unit: account
                .currency_code
                .filter(|value| !value.is_empty())
                .unwrap_or_else(|| TOKEN_BANK_UNIT.to_owned()),
        })
    }
}

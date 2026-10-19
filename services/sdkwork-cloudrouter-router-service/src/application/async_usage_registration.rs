use std::sync::Arc;

use crate::application::Invocation;
use crate::domain::{AsyncUsageTaskKind, DomainError, DomainResult, NewAsyncUsageTask};
use crate::ports::AsyncUsageTaskStore;

/// Builds and enqueues reconciliation rows for asynchronous upstream tasks.
///
/// The caller invokes this **after** a successful create response has been
/// parsed and the upstream id (`batch_...`, `resp_...`, `run_...`) is known.
/// Enqueue is idempotent on `(tenant, organization, kind, upstream_id)`, so a
/// retried create response cannot duplicate the later usage fact.
#[derive(Clone)]
pub struct AsyncUsageRegistrar {
    store: Arc<dyn AsyncUsageTaskStore>,
}

impl AsyncUsageRegistrar {
    pub fn new(store: Arc<dyn AsyncUsageTaskStore>) -> Self {
        Self { store }
    }

    pub async fn register(
        &self,
        invocation: &Invocation,
        kind: AsyncUsageTaskKind,
        upstream_id: &str,
    ) -> DomainResult<()> {
        let task = new_task_from_invocation(invocation, kind, upstream_id)?;
        self.store.enqueue(task).await
    }
}

fn new_task_from_invocation(
    invocation: &Invocation,
    kind: AsyncUsageTaskKind,
    upstream_id: &str,
) -> DomainResult<NewAsyncUsageTask> {
    let upstream_id = upstream_id.trim();
    if upstream_id.is_empty() {
        return Err(DomainError::new(
            "async usage registration requires a non-empty upstream id",
        ));
    }
    let account = invocation.account.as_ref().ok_or_else(|| {
        DomainError::new("async usage registration requires a resolved upstream account")
    })?;
    let api_key_id = invocation
        .subject
        .api_key_id
        .ok_or_else(|| DomainError::new("async usage registration requires api key context"))?;
    Ok(NewAsyncUsageTask {
        tenant_id: invocation.subject.tenant_id,
        organization_id: invocation.subject.organization_id,
        user_id: Some(invocation.subject.user_id),
        api_key_id,
        request_id: invocation.request.request_id.clone(),
        task_kind: kind,
        upstream_id: upstream_id.to_owned(),
        catalog_key: invocation
            .resource
            .requested_model_catalog_key
            .clone()
            .filter(|key| !key.trim().is_empty()),
        supplier_code: account.supplier_code.clone(),
        account_id: account.account_id,
        region_code: account.region_code.clone(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::application::{
        AccountBillingMode, Invocation, InvocationAccount, InvocationBilling, InvocationBody,
        InvocationRequest, InvocationResource, InvocationSubject, InvocationSurface, ResourceType,
    };
    use crate::domain::{AsyncUsageTaskKind, DomainError, RoutingCapability};
    use crate::infrastructure::InMemoryAsyncUsageTaskStore;

    fn invocation() -> Invocation {
        let mut invocation = Invocation::new(
            InvocationRequest::new(axum::http::Method::POST, "/v1/batches")
                .with_request_id("req-async-registration")
                .with_body(InvocationBody::json(
                    serde_json::json!({"input_file_id": "file-1"}),
                )),
            InvocationSubject {
                auth_type: crate::application::InvocationAuthType::GatewayApiKey,
                api_key_id: Some(100),
                api_key_name_snapshot: Some("test".to_owned()),
                tenant_id: 10,
                organization_id: 20,
                user_id: 30,
                billing_organization_id: 0,
                billing_owner: Default::default(),
                account_group_id: Some(10),
                account_group_code: Some("standard-group".to_owned()),
                pricing_plan_code: Some("standard".to_owned()),
                roles: Vec::new(),
                scopes: Vec::new(),
            },
            InvocationResource {
                surface: InvocationSurface::OpenAiCompatible,
                provider_family: None,
                supplier_code: None,
                route_key: "openai/management/batches".to_owned(),
                api_code: "openai.batches".to_owned(),
                endpoint_key: None,
                operation_id: None,
                resource_type: ResourceType::Batch,
                resource_id: None,
                parent_resource_type: None,
                parent_resource_id: None,
                capability: RoutingCapability::Network,
                model_requirement: crate::domain::AiRouteModelRequirement::Ignored,
                route_kind: None,
                requested_model: None,
                requested_model_catalog_key: Some("openai/gpt-5.6-sol".to_owned()),
                resolved_vendor_codes: Vec::new(),
                provider_native_model: None,
            },
            InvocationBilling {
                mode: crate::application::BillingMode::Free,
                meter: None,
                quantity_source: crate::application::BillingQuantitySource::None,
                pricing_required: false,
                settlement_required: false,
                result_gate: crate::application::BillingResultGate::Any,
            },
        );
        invocation.account = Some(InvocationAccount {
            supplier_code: "openai".to_owned(),
            account_id: 3001,
            region_code: "global".to_owned(),
            credential_id: None,
            credential_rotation: None,
            base_url: Some("https://api.openai.example".to_owned()),
            secret_ref: None,
            auth_profile: Default::default(),
            timeout_ms: None,
            retry_policy: None,
            provider_model: None,
            billing_mode: AccountBillingMode::Prepay,
            account_group_id: Some(10),
            account_group_code: Some("standard-group".to_owned()),
            pricing_plan_code: Some("standard".to_owned()),
        });
        invocation
    }

    #[tokio::test]
    async fn registration_is_idempotent_on_the_upstream_id() {
        let store = Arc::new(InMemoryAsyncUsageTaskStore::new());
        let registrar = AsyncUsageRegistrar::new(store.clone());
        let invocation = invocation();

        registrar
            .register(&invocation, AsyncUsageTaskKind::OpenAiBatch, "batch-1")
            .await
            .expect("register");
        registrar
            .register(&invocation, AsyncUsageTaskKind::OpenAiBatch, "batch-1")
            .await
            .expect("register");

        let claimed = store
            .claim_due(
                chrono::Utc::now() + chrono::Duration::seconds(1),
                10,
                chrono::Duration::seconds(30),
            )
            .await
            .expect("claim");
        assert_eq!(1, claimed.len());
        assert_eq!("batch-1", claimed[0].upstream_id);
        assert_eq!(
            Some("openai/gpt-5.6-sol".to_owned()),
            claimed[0].catalog_key
        );
    }

    #[tokio::test]
    async fn registration_rejects_a_missing_upstream_id() {
        let store = Arc::new(InMemoryAsyncUsageTaskStore::new());
        let registrar = AsyncUsageRegistrar::new(store);
        let error = registrar
            .register(&invocation(), AsyncUsageTaskKind::OpenAiBatch, "")
            .await
            .expect_err("empty upstream id must be rejected");
        assert!(matches!(error, DomainError { .. }));
    }
}

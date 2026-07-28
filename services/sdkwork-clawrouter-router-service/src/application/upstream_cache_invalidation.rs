use std::sync::Arc;

use crate::domain::DomainResult;
use crate::ports::{
    AdminUpstreamAccountCredentialItem, AdminUpstreamAccountGroupItem,
    AdminUpstreamAccountGroupMemberInput, AdminUpstreamAccountGroupMemberItem,
    AdminUpstreamAccountItem, AdminUpstreamFuture, AdminUpstreamListQuery, AdminUpstreamPage,
    AdminUpstreamResourceInput, AdminUpstreamResourceItem, AdminUpstreamStore,
    AdminUpstreamSubject, AdminUpstreamSupplierAuthMethodInput,
    AdminUpstreamSupplierAuthMethodItem, AdminUpstreamSupplierEndpointInput,
    AdminUpstreamSupplierEndpointItem, AdminUpstreamSupplierItem,
    CreateAdminUpstreamAccountCredentialCommand, SaveAdminUpstreamAccountCommand,
    SaveAdminUpstreamAccountGroupCommand, SaveAdminUpstreamSupplierCommand,
};

use super::ai_routing_cache_invalidation::AiRoutingCacheInvalidator;
use super::cache_runtime::RuntimeCacheManager;

#[derive(Clone)]
pub struct AiRoutingCacheInvalidatingAdminUpstreamStore {
    inner: Arc<dyn AdminUpstreamStore + Send + Sync>,
    invalidator: AiRoutingCacheInvalidator,
}

impl AiRoutingCacheInvalidatingAdminUpstreamStore {
    pub fn new(
        inner: Arc<dyn AdminUpstreamStore + Send + Sync>,
        manager: RuntimeCacheManager,
    ) -> Self {
        Self {
            inner,
            invalidator: AiRoutingCacheInvalidator::new(manager),
        }
    }

    async fn invalidate_after<T>(&self, value: T) -> DomainResult<T> {
        self.invalidator.invalidate_routing_facts().await?;
        Ok(value)
    }
}

impl AdminUpstreamStore for AiRoutingCacheInvalidatingAdminUpstreamStore {
    fn list_suppliers<'a>(
        &'a self,
        query: AdminUpstreamListQuery,
    ) -> AdminUpstreamFuture<'a, AdminUpstreamPage<AdminUpstreamSupplierItem>> {
        self.inner.list_suppliers(query)
    }

    fn get_supplier<'a>(
        &'a self,
        subject: AdminUpstreamSubject,
        supplier_id: i64,
    ) -> AdminUpstreamFuture<'a, Option<AdminUpstreamSupplierItem>> {
        self.inner.get_supplier(subject, supplier_id)
    }

    fn save_supplier<'a>(
        &'a self,
        command: SaveAdminUpstreamSupplierCommand,
    ) -> AdminUpstreamFuture<'a, AdminUpstreamSupplierItem> {
        Box::pin(async move {
            let item = self.inner.save_supplier(command).await?;
            self.invalidate_after(item).await
        })
    }

    fn delete_supplier<'a>(
        &'a self,
        subject: AdminUpstreamSubject,
        supplier_id: i64,
        expected_version: i64,
        requested_at: String,
    ) -> AdminUpstreamFuture<'a, bool> {
        Box::pin(async move {
            let deleted = self
                .inner
                .delete_supplier(subject, supplier_id, expected_version, requested_at)
                .await?;
            if deleted {
                self.invalidate_after(deleted).await
            } else {
                Ok(false)
            }
        })
    }

    fn list_supplier_endpoints<'a>(
        &'a self,
        subject: AdminUpstreamSubject,
        supplier_id: i64,
    ) -> AdminUpstreamFuture<'a, Vec<AdminUpstreamSupplierEndpointItem>> {
        self.inner.list_supplier_endpoints(subject, supplier_id)
    }

    fn replace_supplier_endpoints<'a>(
        &'a self,
        subject: AdminUpstreamSubject,
        supplier_id: i64,
        expected_version: i64,
        items: Vec<AdminUpstreamSupplierEndpointInput>,
        requested_at: String,
    ) -> AdminUpstreamFuture<'a, Vec<AdminUpstreamSupplierEndpointItem>> {
        Box::pin(async move {
            let items = self
                .inner
                .replace_supplier_endpoints(
                    subject,
                    supplier_id,
                    expected_version,
                    items,
                    requested_at,
                )
                .await?;
            self.invalidate_after(items).await
        })
    }

    fn list_supplier_auth_methods<'a>(
        &'a self,
        subject: AdminUpstreamSubject,
        supplier_id: i64,
    ) -> AdminUpstreamFuture<'a, Vec<AdminUpstreamSupplierAuthMethodItem>> {
        self.inner.list_supplier_auth_methods(subject, supplier_id)
    }

    fn replace_supplier_auth_methods<'a>(
        &'a self,
        subject: AdminUpstreamSubject,
        supplier_id: i64,
        expected_version: i64,
        items: Vec<AdminUpstreamSupplierAuthMethodInput>,
        requested_at: String,
    ) -> AdminUpstreamFuture<'a, Vec<AdminUpstreamSupplierAuthMethodItem>> {
        Box::pin(async move {
            let items = self
                .inner
                .replace_supplier_auth_methods(
                    subject,
                    supplier_id,
                    expected_version,
                    items,
                    requested_at,
                )
                .await?;
            self.invalidate_after(items).await
        })
    }

    fn list_supplier_resources<'a>(
        &'a self,
        subject: AdminUpstreamSubject,
        supplier_id: i64,
    ) -> AdminUpstreamFuture<'a, Vec<AdminUpstreamResourceItem>> {
        self.inner.list_supplier_resources(subject, supplier_id)
    }

    fn replace_supplier_resources<'a>(
        &'a self,
        subject: AdminUpstreamSubject,
        supplier_id: i64,
        expected_version: i64,
        items: Vec<AdminUpstreamResourceInput>,
        requested_at: String,
    ) -> AdminUpstreamFuture<'a, Vec<AdminUpstreamResourceItem>> {
        Box::pin(async move {
            let items = self
                .inner
                .replace_supplier_resources(
                    subject,
                    supplier_id,
                    expected_version,
                    items,
                    requested_at,
                )
                .await?;
            self.invalidate_after(items).await
        })
    }

    fn list_accounts<'a>(
        &'a self,
        query: AdminUpstreamListQuery,
    ) -> AdminUpstreamFuture<'a, AdminUpstreamPage<AdminUpstreamAccountItem>> {
        self.inner.list_accounts(query)
    }

    fn get_account<'a>(
        &'a self,
        subject: AdminUpstreamSubject,
        account_id: i64,
    ) -> AdminUpstreamFuture<'a, Option<AdminUpstreamAccountItem>> {
        self.inner.get_account(subject, account_id)
    }

    fn save_account<'a>(
        &'a self,
        command: SaveAdminUpstreamAccountCommand,
    ) -> AdminUpstreamFuture<'a, AdminUpstreamAccountItem> {
        Box::pin(async move {
            let item = self.inner.save_account(command).await?;
            self.invalidate_after(item).await
        })
    }

    fn delete_account<'a>(
        &'a self,
        subject: AdminUpstreamSubject,
        account_id: i64,
        expected_version: i64,
        requested_at: String,
    ) -> AdminUpstreamFuture<'a, bool> {
        Box::pin(async move {
            let deleted = self
                .inner
                .delete_account(subject, account_id, expected_version, requested_at)
                .await?;
            if deleted {
                self.invalidate_after(deleted).await
            } else {
                Ok(false)
            }
        })
    }

    fn list_account_credentials<'a>(
        &'a self,
        query: AdminUpstreamListQuery,
        account_id: i64,
    ) -> AdminUpstreamFuture<'a, AdminUpstreamPage<AdminUpstreamAccountCredentialItem>> {
        self.inner.list_account_credentials(query, account_id)
    }

    fn create_account_credential<'a>(
        &'a self,
        command: CreateAdminUpstreamAccountCredentialCommand,
    ) -> AdminUpstreamFuture<'a, AdminUpstreamAccountCredentialItem> {
        Box::pin(async move {
            let item = self.inner.create_account_credential(command).await?;
            self.invalidate_after(item).await
        })
    }

    fn deactivate_account_credential<'a>(
        &'a self,
        subject: AdminUpstreamSubject,
        account_id: i64,
        credential_id: i64,
        requested_at: String,
    ) -> AdminUpstreamFuture<'a, bool> {
        Box::pin(async move {
            let deactivated = self
                .inner
                .deactivate_account_credential(subject, account_id, credential_id, requested_at)
                .await?;
            if deactivated {
                self.invalidate_after(deactivated).await
            } else {
                Ok(false)
            }
        })
    }

    fn list_account_groups<'a>(
        &'a self,
        query: AdminUpstreamListQuery,
    ) -> AdminUpstreamFuture<'a, AdminUpstreamPage<AdminUpstreamAccountGroupItem>> {
        self.inner.list_account_groups(query)
    }

    fn get_account_group<'a>(
        &'a self,
        subject: AdminUpstreamSubject,
        account_group_id: i64,
    ) -> AdminUpstreamFuture<'a, Option<AdminUpstreamAccountGroupItem>> {
        self.inner.get_account_group(subject, account_group_id)
    }

    fn save_account_group<'a>(
        &'a self,
        command: SaveAdminUpstreamAccountGroupCommand,
    ) -> AdminUpstreamFuture<'a, AdminUpstreamAccountGroupItem> {
        Box::pin(async move {
            let item = self.inner.save_account_group(command).await?;
            self.invalidate_after(item).await
        })
    }

    fn delete_account_group<'a>(
        &'a self,
        subject: AdminUpstreamSubject,
        account_group_id: i64,
        expected_version: i64,
        requested_at: String,
    ) -> AdminUpstreamFuture<'a, bool> {
        Box::pin(async move {
            let deleted = self
                .inner
                .delete_account_group(subject, account_group_id, expected_version, requested_at)
                .await?;
            if deleted {
                self.invalidate_after(deleted).await
            } else {
                Ok(false)
            }
        })
    }

    fn list_account_group_members<'a>(
        &'a self,
        subject: AdminUpstreamSubject,
        account_group_id: i64,
    ) -> AdminUpstreamFuture<'a, Vec<AdminUpstreamAccountGroupMemberItem>> {
        self.inner
            .list_account_group_members(subject, account_group_id)
    }

    fn replace_account_group_members<'a>(
        &'a self,
        subject: AdminUpstreamSubject,
        account_group_id: i64,
        expected_version: i64,
        items: Vec<AdminUpstreamAccountGroupMemberInput>,
        requested_at: String,
    ) -> AdminUpstreamFuture<'a, Vec<AdminUpstreamAccountGroupMemberItem>> {
        Box::pin(async move {
            let items = self
                .inner
                .replace_account_group_members(
                    subject,
                    account_group_id,
                    expected_version,
                    items,
                    requested_at,
                )
                .await?;
            self.invalidate_after(items).await
        })
    }

    fn list_account_group_resources<'a>(
        &'a self,
        subject: AdminUpstreamSubject,
        account_group_id: i64,
    ) -> AdminUpstreamFuture<'a, Vec<AdminUpstreamResourceItem>> {
        self.inner
            .list_account_group_resources(subject, account_group_id)
    }

    fn replace_account_group_resources<'a>(
        &'a self,
        subject: AdminUpstreamSubject,
        account_group_id: i64,
        expected_version: i64,
        items: Vec<AdminUpstreamResourceInput>,
        requested_at: String,
    ) -> AdminUpstreamFuture<'a, Vec<AdminUpstreamResourceItem>> {
        Box::pin(async move {
            let items = self
                .inner
                .replace_account_group_resources(
                    subject,
                    account_group_id,
                    expected_version,
                    items,
                    requested_at,
                )
                .await?;
            self.invalidate_after(items).await
        })
    }
}

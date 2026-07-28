mod account;
mod account_group;
mod account_group_member;
mod account_group_resource;
mod shared;
mod supplier;
mod supplier_auth;
mod supplier_endpoint;
mod supplier_resource;

use std::sync::Arc;

use sqlx::PgPool;

use crate::application::{ApiKeySecretCodec, ApiKeySecretHasher};
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

#[derive(Clone)]
pub struct PostgresAdminUpstreamStore {
    pool: PgPool,
    secret_codec: Arc<dyn ApiKeySecretCodec + Send + Sync>,
    secret_hasher: Arc<dyn ApiKeySecretHasher + Send + Sync>,
}

impl std::fmt::Debug for PostgresAdminUpstreamStore {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter
            .debug_struct("PostgresAdminUpstreamStore")
            .field("pool", &self.pool)
            .field("secret_codec", &"[configured]")
            .field("secret_hasher", &"[configured]")
            .finish()
    }
}

impl PostgresAdminUpstreamStore {
    pub fn new(
        pool: PgPool,
        secret_codec: Arc<dyn ApiKeySecretCodec + Send + Sync>,
        secret_hasher: Arc<dyn ApiKeySecretHasher + Send + Sync>,
    ) -> Self {
        Self {
            pool,
            secret_codec,
            secret_hasher,
        }
    }
}

impl AdminUpstreamStore for PostgresAdminUpstreamStore {
    fn list_suppliers<'a>(
        &'a self,
        query: AdminUpstreamListQuery,
    ) -> AdminUpstreamFuture<'a, AdminUpstreamPage<AdminUpstreamSupplierItem>> {
        Box::pin(async move { supplier::list(&self.pool, query).await })
    }

    fn get_supplier<'a>(
        &'a self,
        subject: AdminUpstreamSubject,
        supplier_id: i64,
    ) -> AdminUpstreamFuture<'a, Option<AdminUpstreamSupplierItem>> {
        Box::pin(async move { supplier::get(&self.pool, subject, supplier_id).await })
    }

    fn save_supplier<'a>(
        &'a self,
        command: SaveAdminUpstreamSupplierCommand,
    ) -> AdminUpstreamFuture<'a, AdminUpstreamSupplierItem> {
        Box::pin(async move { supplier::save(&self.pool, command).await })
    }

    fn delete_supplier<'a>(
        &'a self,
        subject: AdminUpstreamSubject,
        supplier_id: i64,
        expected_version: i64,
        requested_at: String,
    ) -> AdminUpstreamFuture<'a, bool> {
        Box::pin(async move {
            supplier::delete(
                &self.pool,
                subject,
                supplier_id,
                expected_version,
                requested_at,
            )
            .await
        })
    }

    fn list_supplier_endpoints<'a>(
        &'a self,
        subject: AdminUpstreamSubject,
        supplier_id: i64,
    ) -> AdminUpstreamFuture<'a, Vec<AdminUpstreamSupplierEndpointItem>> {
        Box::pin(async move { supplier_endpoint::list(&self.pool, subject, supplier_id).await })
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
            supplier_endpoint::replace(
                &self.pool,
                subject,
                supplier_id,
                expected_version,
                items,
                requested_at,
            )
            .await
        })
    }

    fn list_supplier_auth_methods<'a>(
        &'a self,
        subject: AdminUpstreamSubject,
        supplier_id: i64,
    ) -> AdminUpstreamFuture<'a, Vec<AdminUpstreamSupplierAuthMethodItem>> {
        Box::pin(async move { supplier_auth::list(&self.pool, subject, supplier_id).await })
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
            supplier_auth::replace(
                &self.pool,
                subject,
                supplier_id,
                expected_version,
                items,
                requested_at,
            )
            .await
        })
    }

    fn list_supplier_resources<'a>(
        &'a self,
        subject: AdminUpstreamSubject,
        supplier_id: i64,
    ) -> AdminUpstreamFuture<'a, Vec<AdminUpstreamResourceItem>> {
        Box::pin(async move { supplier_resource::list(&self.pool, subject, supplier_id).await })
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
            supplier_resource::replace(
                &self.pool,
                subject,
                supplier_id,
                expected_version,
                items,
                requested_at,
            )
            .await
        })
    }

    fn list_accounts<'a>(
        &'a self,
        query: AdminUpstreamListQuery,
    ) -> AdminUpstreamFuture<'a, AdminUpstreamPage<AdminUpstreamAccountItem>> {
        Box::pin(async move { account::list(&self.pool, query).await })
    }

    fn get_account<'a>(
        &'a self,
        subject: AdminUpstreamSubject,
        account_id: i64,
    ) -> AdminUpstreamFuture<'a, Option<AdminUpstreamAccountItem>> {
        Box::pin(async move { account::get(&self.pool, subject, account_id).await })
    }

    fn save_account<'a>(
        &'a self,
        command: SaveAdminUpstreamAccountCommand,
    ) -> AdminUpstreamFuture<'a, AdminUpstreamAccountItem> {
        Box::pin(async move { account::save(&self.pool, command).await })
    }

    fn delete_account<'a>(
        &'a self,
        subject: AdminUpstreamSubject,
        account_id: i64,
        expected_version: i64,
        requested_at: String,
    ) -> AdminUpstreamFuture<'a, bool> {
        Box::pin(async move {
            account::delete(
                &self.pool,
                subject,
                account_id,
                expected_version,
                requested_at,
            )
            .await
        })
    }

    fn list_account_credentials<'a>(
        &'a self,
        query: AdminUpstreamListQuery,
        account_id: i64,
    ) -> AdminUpstreamFuture<'a, AdminUpstreamPage<AdminUpstreamAccountCredentialItem>> {
        Box::pin(async move { account::list_credentials(&self.pool, query, account_id).await })
    }

    fn create_account_credential<'a>(
        &'a self,
        command: CreateAdminUpstreamAccountCredentialCommand,
    ) -> AdminUpstreamFuture<'a, AdminUpstreamAccountCredentialItem> {
        Box::pin(async move {
            account::create_credential(
                &self.pool,
                self.secret_codec.as_ref(),
                self.secret_hasher.as_ref(),
                command,
            )
            .await
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
            account::deactivate_credential(
                &self.pool,
                subject,
                account_id,
                credential_id,
                requested_at,
            )
            .await
        })
    }

    fn list_account_groups<'a>(
        &'a self,
        query: AdminUpstreamListQuery,
    ) -> AdminUpstreamFuture<'a, AdminUpstreamPage<AdminUpstreamAccountGroupItem>> {
        Box::pin(async move { account_group::list(&self.pool, query).await })
    }

    fn get_account_group<'a>(
        &'a self,
        subject: AdminUpstreamSubject,
        account_group_id: i64,
    ) -> AdminUpstreamFuture<'a, Option<AdminUpstreamAccountGroupItem>> {
        Box::pin(async move { account_group::get(&self.pool, subject, account_group_id).await })
    }

    fn save_account_group<'a>(
        &'a self,
        command: SaveAdminUpstreamAccountGroupCommand,
    ) -> AdminUpstreamFuture<'a, AdminUpstreamAccountGroupItem> {
        Box::pin(async move { account_group::save(&self.pool, command).await })
    }

    fn delete_account_group<'a>(
        &'a self,
        subject: AdminUpstreamSubject,
        account_group_id: i64,
        expected_version: i64,
        requested_at: String,
    ) -> AdminUpstreamFuture<'a, bool> {
        Box::pin(async move {
            account_group::delete(
                &self.pool,
                subject,
                account_group_id,
                expected_version,
                requested_at,
            )
            .await
        })
    }

    fn list_account_group_members<'a>(
        &'a self,
        subject: AdminUpstreamSubject,
        account_group_id: i64,
    ) -> AdminUpstreamFuture<'a, Vec<AdminUpstreamAccountGroupMemberItem>> {
        Box::pin(
            async move { account_group_member::list(&self.pool, subject, account_group_id).await },
        )
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
            account_group_member::replace(
                &self.pool,
                subject,
                account_group_id,
                expected_version,
                items,
                requested_at,
            )
            .await
        })
    }

    fn list_account_group_resources<'a>(
        &'a self,
        subject: AdminUpstreamSubject,
        account_group_id: i64,
    ) -> AdminUpstreamFuture<'a, Vec<AdminUpstreamResourceItem>> {
        Box::pin(async move {
            account_group_resource::list(&self.pool, subject, account_group_id).await
        })
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
            account_group_resource::replace(
                &self.pool,
                subject,
                account_group_id,
                expected_version,
                items,
                requested_at,
            )
            .await
        })
    }
}

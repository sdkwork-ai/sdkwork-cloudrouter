use std::sync::Arc;

use crate::ports::{
    AdminAiResourceGroupItem, AdminAiResourceGroupListPage, AdminAiResourceGroupResourceItem,
    AdminAiResourceGroupResourcesPage, AdminAiResourceItem, AdminAiResourceListPage,
    AdminAiResourceReadFuture, AdminAiResourceStore, CreateAdminAiResourceCommand,
    CreateAdminAiResourceGroupCommand, DeleteAdminAiResourceGroupCommand,
    DeleteAdminAiResourceGroupMemberCommand, ListAdminAiResourceGroupResourcesQuery,
    ListAdminAiResourceGroupsQuery, ListAdminAiResourcesQuery,
    ReplaceAdminAiResourceHierarchyCommand, UpdateAdminAiResourceCommand,
    UpdateAdminAiResourceGroupCommand, UpsertAdminAiResourceGroupMemberCommand,
};
use sdkwork_models_contract_service::{
    AdminAiModelItem, AdminAiModelListPage, AdminModelCatalogSyncItem, AdminModelCommandFuture,
    AdminModelMappingListPage, AdminModelMappingRuleItem, AdminModelVendorItem,
    CreateAdminAiModelCommand, CreateAdminModelMappingCommand, CreateAdminModelVendorCommand,
    DeleteAdminAiModelCommand, DeleteAdminModelMappingCommand, DomainResult,
    ListAdminAiModelsQuery, ListAdminModelMappingsQuery, ListAdminModelVendorsQuery,
    ModelCatalogAdminStore, ResolveAdminModelMappingQuery, ResolveAdminModelMappingResult,
    SyncAdminModelCatalogCommand, UpdateAdminAiModelCommand, UpdateAdminModelMappingCommand,
};

use super::{
    RuntimeCacheManager, ROUTING_CONFIG_VERSION_CACHE_NAMESPACE,
    ROUTING_DISABLED_UPSTREAM_ACCOUNT_CACHE_NAMESPACE, ROUTING_SNAPSHOT_CACHE_NAMESPACE,
    ROUTING_UPSTREAM_OBJECT_ROUTE_CACHE_NAMESPACE,
};

#[derive(Clone)]
pub struct AiRoutingCacheInvalidator {
    manager: RuntimeCacheManager,
}

impl AiRoutingCacheInvalidator {
    pub fn new(manager: RuntimeCacheManager) -> Self {
        Self { manager }
    }

    /// Fixed version key under the routing config-version namespace. Read side
    /// compares the snapshot's stamped version against this; a mismatch means the
    /// cached snapshot is stale and must be re-read from origin (no reliance on the
    /// SCAN+DEL sweep finishing, so the cross-instance eventual window is removed).
    pub const CONFIG_VERSION_KEY: &'static str = "version";

    /// Returns the current routing config version (0 when never set).
    pub async fn current_routing_config_version(&self) -> DomainResult<i64> {
        let value = self
            .manager
            .get_json(ROUTING_CONFIG_VERSION_CACHE_NAMESPACE, Self::CONFIG_VERSION_KEY)
            .await?;
        Ok(value
            .and_then(|value| value.as_i64())
            .unwrap_or(0))
    }

    /// Atomically-ish bumps the routing config version (admin configuration change).
    ///
    /// NOTE: get+set is not a single Redis INCR; for low-frequency admin writes that
    /// is acceptable. For higher concurrency, a Redis `INCR` primitive should be used.
    /// The key point is that readers compare versions, so a stale snapshot generated
    /// before this bump is rejected immediately without waiting for the namespace
    /// sweep to complete.
    pub async fn bump_routing_config_version(&self) -> DomainResult<i64> {
        let next = self.current_routing_config_version().await? + 1;
        self.manager
            .set_json(
                ROUTING_CONFIG_VERSION_CACHE_NAMESPACE,
                Self::CONFIG_VERSION_KEY,
                serde_json::json!(next),
            )
            .await?;
        Ok(next)
    }

    pub async fn invalidate_routing_facts(&self) -> DomainResult<()> {
        for namespace in [
            ROUTING_SNAPSHOT_CACHE_NAMESPACE,
            ROUTING_CONFIG_VERSION_CACHE_NAMESPACE,
            ROUTING_DISABLED_UPSTREAM_ACCOUNT_CACHE_NAMESPACE,
            ROUTING_UPSTREAM_OBJECT_ROUTE_CACHE_NAMESPACE,
        ] {
            self.manager.delete_namespace(namespace).await?;
        }
        // After clearing, stamp a fresh config version so any reader that cached a
        // snapshot under the OLD version can detect staleness by version comparison
        // instead of waiting for the namespace sweep.
        self.bump_routing_config_version().await?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::application::default_desktop_cache_manager;

    #[tokio::test]
    async fn routing_config_version_bumps_so_stale_snapshot_can_be_rejected() {
        let manager = default_desktop_cache_manager();
        let invalidator = AiRoutingCacheInvalidator::new(manager.clone());

        // Fresh: version 0, no snapshot cached.
        assert_eq!(0, invalidator.current_routing_config_version().await.unwrap());

        // Simulate a reader caching a snapshot stamped at the current version.
        manager
            .set_json(
                ROUTING_SNAPSHOT_CACHE_NAMESPACE,
                "snapshot:v0",
                serde_json::json!({"version": 0}),
            )
            .await
            .unwrap();

        // Admin writes → invalidate_routing_facts: sweeps namespaces AND bumps version.
        invalidator.invalidate_routing_facts().await.unwrap();

        let version = invalidator.current_routing_config_version().await.unwrap();
        assert!(
            version >= 1,
            "config version must advance after invalidation, got {version}"
        );

        // The old snapshot key is gone (swept) and its stamped version (0) now lags
        // the config version (>=1), so a reader must reject it and re-read origin.
        let stale = manager
            .get_json(ROUTING_SNAPSHOT_CACHE_NAMESPACE, "snapshot:v0")
            .await
            .unwrap();
        assert!(stale.is_none(), "stale snapshot namespace must be swept");

        // Two successful invalidations advance monotonically (readers see increasing versions).
        let v1 = invalidator.bump_routing_config_version().await.unwrap();
        let v2 = invalidator.bump_routing_config_version().await.unwrap();
        assert!(v2 > v1, "config version must grow monotonically");
    }
}

#[derive(Clone)]
pub struct AiRoutingCacheInvalidatingAdminAiResourceStore {
    inner: Arc<dyn AdminAiResourceStore + Send + Sync>,
    invalidator: AiRoutingCacheInvalidator,
}

impl AiRoutingCacheInvalidatingAdminAiResourceStore {
    pub fn new(
        inner: Arc<dyn AdminAiResourceStore + Send + Sync>,
        manager: RuntimeCacheManager,
    ) -> Self {
        Self {
            inner,
            invalidator: AiRoutingCacheInvalidator::new(manager),
        }
    }
}

impl AdminAiResourceStore for AiRoutingCacheInvalidatingAdminAiResourceStore {
    fn list_ai_resources<'a>(
        &'a self,
        query: ListAdminAiResourcesQuery,
    ) -> AdminAiResourceReadFuture<'a, AdminAiResourceListPage> {
        self.inner.list_ai_resources(query)
    }

    fn create_ai_resource<'a>(
        &'a self,
        command: CreateAdminAiResourceCommand,
    ) -> AdminAiResourceReadFuture<'a, AdminAiResourceItem> {
        Box::pin(async move {
            let item = self.inner.create_ai_resource(command).await?;
            self.invalidator.invalidate_routing_facts().await?;
            Ok(item)
        })
    }

    fn update_ai_resource<'a>(
        &'a self,
        command: UpdateAdminAiResourceCommand,
    ) -> AdminAiResourceReadFuture<'a, Option<AdminAiResourceItem>> {
        Box::pin(async move {
            let item = self.inner.update_ai_resource(command).await?;
            if item.is_some() {
                self.invalidator.invalidate_routing_facts().await?;
            }
            Ok(item)
        })
    }

    fn replace_ai_resource_hierarchy<'a>(
        &'a self,
        command: ReplaceAdminAiResourceHierarchyCommand,
    ) -> AdminAiResourceReadFuture<'a, AdminAiResourceItem> {
        Box::pin(async move {
            let item = self.inner.replace_ai_resource_hierarchy(command).await?;
            self.invalidator.invalidate_routing_facts().await?;
            Ok(item)
        })
    }

    fn list_ai_resource_groups<'a>(
        &'a self,
        query: ListAdminAiResourceGroupsQuery,
    ) -> AdminAiResourceReadFuture<'a, AdminAiResourceGroupListPage> {
        self.inner.list_ai_resource_groups(query)
    }

    fn list_ai_resource_group_resources<'a>(
        &'a self,
        query: ListAdminAiResourceGroupResourcesQuery,
    ) -> AdminAiResourceReadFuture<'a, AdminAiResourceGroupResourcesPage> {
        self.inner.list_ai_resource_group_resources(query)
    }

    fn create_ai_resource_group<'a>(
        &'a self,
        command: CreateAdminAiResourceGroupCommand,
    ) -> AdminAiResourceReadFuture<'a, AdminAiResourceGroupItem> {
        Box::pin(async move {
            let item = self.inner.create_ai_resource_group(command).await?;
            self.invalidator.invalidate_routing_facts().await?;
            Ok(item)
        })
    }

    fn update_ai_resource_group<'a>(
        &'a self,
        command: UpdateAdminAiResourceGroupCommand,
    ) -> AdminAiResourceReadFuture<'a, Option<AdminAiResourceGroupItem>> {
        Box::pin(async move {
            let item = self.inner.update_ai_resource_group(command).await?;
            if item.is_some() {
                self.invalidator.invalidate_routing_facts().await?;
            }
            Ok(item)
        })
    }

    fn upsert_ai_resource_group_member<'a>(
        &'a self,
        command: UpsertAdminAiResourceGroupMemberCommand,
    ) -> AdminAiResourceReadFuture<'a, Option<AdminAiResourceGroupResourceItem>> {
        Box::pin(async move {
            let item = self.inner.upsert_ai_resource_group_member(command).await?;
            if item.is_some() {
                self.invalidator.invalidate_routing_facts().await?;
            }
            Ok(item)
        })
    }

    fn delete_ai_resource_group_member<'a>(
        &'a self,
        command: DeleteAdminAiResourceGroupMemberCommand,
    ) -> AdminAiResourceReadFuture<'a, bool> {
        Box::pin(async move {
            let deleted = self.inner.delete_ai_resource_group_member(command).await?;
            if deleted {
                self.invalidator.invalidate_routing_facts().await?;
            }
            Ok(deleted)
        })
    }

    fn delete_ai_resource_group<'a>(
        &'a self,
        command: DeleteAdminAiResourceGroupCommand,
    ) -> AdminAiResourceReadFuture<'a, bool> {
        Box::pin(async move {
            let deleted = self.inner.delete_ai_resource_group(command).await?;
            if deleted {
                self.invalidator.invalidate_routing_facts().await?;
            }
            Ok(deleted)
        })
    }
}

#[derive(Clone)]
pub struct AiRoutingCacheInvalidatingAdminModelStore {
    inner: Arc<dyn ModelCatalogAdminStore + Send + Sync>,
    invalidator: AiRoutingCacheInvalidator,
}

impl AiRoutingCacheInvalidatingAdminModelStore {
    pub fn new(
        inner: Arc<dyn ModelCatalogAdminStore + Send + Sync>,
        manager: RuntimeCacheManager,
    ) -> Self {
        Self {
            inner,
            invalidator: AiRoutingCacheInvalidator::new(manager),
        }
    }
}

impl ModelCatalogAdminStore for AiRoutingCacheInvalidatingAdminModelStore {
    fn list_vendors<'a>(
        &'a self,
        query: ListAdminModelVendorsQuery,
    ) -> AdminModelCommandFuture<'a, Vec<AdminModelVendorItem>> {
        self.inner.list_vendors(query)
    }

    fn list_models<'a>(
        &'a self,
        query: ListAdminAiModelsQuery,
    ) -> AdminModelCommandFuture<'a, AdminAiModelListPage> {
        self.inner.list_models(query)
    }

    fn list_model_mappings<'a>(
        &'a self,
        query: ListAdminModelMappingsQuery,
    ) -> AdminModelCommandFuture<'a, AdminModelMappingListPage> {
        self.inner.list_model_mappings(query)
    }

    fn create_vendor<'a>(
        &'a self,
        command: CreateAdminModelVendorCommand,
    ) -> AdminModelCommandFuture<'a, AdminModelVendorItem> {
        Box::pin(async move {
            let item = self.inner.create_vendor(command).await?;
            self.invalidator.invalidate_routing_facts().await?;
            Ok(item)
        })
    }

    fn create_model<'a>(
        &'a self,
        command: CreateAdminAiModelCommand,
    ) -> AdminModelCommandFuture<'a, AdminAiModelItem> {
        Box::pin(async move {
            let item = self.inner.create_model(command).await?;
            self.invalidator.invalidate_routing_facts().await?;
            Ok(item)
        })
    }

    fn create_model_mapping<'a>(
        &'a self,
        command: CreateAdminModelMappingCommand,
    ) -> AdminModelCommandFuture<'a, AdminModelMappingRuleItem> {
        Box::pin(async move {
            let item = self.inner.create_model_mapping(command).await?;
            self.invalidator.invalidate_routing_facts().await?;
            Ok(item)
        })
    }

    fn update_model<'a>(
        &'a self,
        command: UpdateAdminAiModelCommand,
    ) -> AdminModelCommandFuture<'a, AdminAiModelItem> {
        Box::pin(async move {
            let item = self.inner.update_model(command).await?;
            self.invalidator.invalidate_routing_facts().await?;
            Ok(item)
        })
    }

    fn update_model_mapping<'a>(
        &'a self,
        command: UpdateAdminModelMappingCommand,
    ) -> AdminModelCommandFuture<'a, AdminModelMappingRuleItem> {
        Box::pin(async move {
            let item = self.inner.update_model_mapping(command).await?;
            self.invalidator.invalidate_routing_facts().await?;
            Ok(item)
        })
    }

    fn sync_catalog<'a>(
        &'a self,
        command: SyncAdminModelCatalogCommand,
    ) -> AdminModelCommandFuture<'a, AdminModelCatalogSyncItem> {
        Box::pin(async move {
            let item = self.inner.sync_catalog(command).await?;
            self.invalidator.invalidate_routing_facts().await?;
            Ok(item)
        })
    }

    fn delete_model<'a>(
        &'a self,
        command: DeleteAdminAiModelCommand,
    ) -> AdminModelCommandFuture<'a, bool> {
        Box::pin(async move {
            let deleted = self.inner.delete_model(command).await?;
            self.invalidator.invalidate_routing_facts().await?;
            Ok(deleted)
        })
    }

    fn delete_model_mapping<'a>(
        &'a self,
        command: DeleteAdminModelMappingCommand,
    ) -> AdminModelCommandFuture<'a, bool> {
        Box::pin(async move {
            let deleted = self.inner.delete_model_mapping(command).await?;
            self.invalidator.invalidate_routing_facts().await?;
            Ok(deleted)
        })
    }

    fn resolve_model_mapping<'a>(
        &'a self,
        query: ResolveAdminModelMappingQuery,
    ) -> AdminModelCommandFuture<'a, ResolveAdminModelMappingResult> {
        self.inner.resolve_model_mapping(query)
    }
}

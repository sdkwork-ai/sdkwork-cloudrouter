use std::sync::Arc;

use crate::ports::{
    AdminAiResourceGroupItem, AdminAiResourceGroupResourcesPage, AdminAiResourceItem,
    AdminAiResourceListPage, AdminAiResourceReadFuture, AdminAiResourceStore,
    CreateAdminAiResourceCommand, CreateAdminAiResourceGroupCommand,
    DeleteAdminAiResourceGroupCommand, ListAdminAiResourceGroupResourcesQuery,
    ListAdminAiResourceGroupsQuery, ListAdminAiResourcesQuery, UpdateAdminAiResourceCommand,
    UpdateAdminAiResourceGroupCommand,
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

    pub async fn invalidate_routing_facts(&self) -> DomainResult<()> {
        for namespace in [
            ROUTING_SNAPSHOT_CACHE_NAMESPACE,
            ROUTING_CONFIG_VERSION_CACHE_NAMESPACE,
            ROUTING_DISABLED_UPSTREAM_ACCOUNT_CACHE_NAMESPACE,
            ROUTING_UPSTREAM_OBJECT_ROUTE_CACHE_NAMESPACE,
        ] {
            self.manager.delete_namespace(namespace).await?;
        }
        Ok(())
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

    fn list_ai_resource_groups<'a>(
        &'a self,
        query: ListAdminAiResourceGroupsQuery,
    ) -> AdminAiResourceReadFuture<'a, Vec<AdminAiResourceGroupItem>> {
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
    ) -> AdminModelCommandFuture<'a, ()> {
        Box::pin(async move {
            self.inner.delete_model(command).await?;
            self.invalidator.invalidate_routing_facts().await?;
            Ok(())
        })
    }

    fn delete_model_mapping<'a>(
        &'a self,
        command: DeleteAdminModelMappingCommand,
    ) -> AdminModelCommandFuture<'a, ()> {
        Box::pin(async move {
            self.inner.delete_model_mapping(command).await?;
            self.invalidator.invalidate_routing_facts().await?;
            Ok(())
        })
    }

    fn resolve_model_mapping<'a>(
        &'a self,
        query: ResolveAdminModelMappingQuery,
    ) -> AdminModelCommandFuture<'a, ResolveAdminModelMappingResult> {
        self.inner.resolve_model_mapping(query)
    }
}

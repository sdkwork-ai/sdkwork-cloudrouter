use std::sync::Arc;

use crate::ports::{
    AdminAiResourceGroupItem, AdminAiResourceGroupResourcesPage, AdminAiResourceItem,
    AdminAiResourceListPage, AdminAiResourceReadFuture, AdminAiResourceStore,
    AdminChannelCommandFuture, AdminChannelGroupChannelBindingItem, AdminChannelGroupCommandFuture,
    AdminChannelGroupItem, AdminChannelGroupListPage, AdminChannelGroupStore, AdminChannelItem,
    AdminChannelListPage, AdminChannelStore, AdminChannelTestOutcome,
    AdminProviderSecretCommandFuture, AdminProviderSecretItem, AdminProviderSecretListPage,
    AdminProviderSecretStore, CreateAdminAiResourceCommand, CreateAdminAiResourceGroupCommand,
    CreateAdminChannelCommand, CreateAdminChannelGroupCommand, CreateAdminProviderSecretCommand,
    DeleteAdminAiResourceGroupCommand, DeleteAdminChannelCommand, DeleteAdminChannelGroupCommand,
    DeleteAdminProviderSecretCommand, ListAdminAiResourceGroupResourcesQuery,
    ListAdminAiResourceGroupsQuery, ListAdminAiResourcesQuery,
    ListAdminChannelGroupChannelBindingsQuery, ListAdminChannelGroupsQuery, ListAdminChannelsQuery,
    ListAdminProviderSecretsQuery, ReplaceAdminChannelGroupChannelBindingsCommand,
    TestAdminChannelCommand, UpdateAdminAiResourceCommand, UpdateAdminAiResourceGroupCommand,
    UpdateAdminChannelCommand, UpdateAdminChannelGroupCommand, UpdateAdminProviderSecretCommand,
};
use sdkwork_models_contract_service::{
    AdminAiModelItem, AdminAiModelListPage, AdminModelCatalogSyncItem, AdminModelCommandFuture,
    AdminModelMappingRuleItem, AdminModelVendorItem, CreateAdminAiModelCommand,
    CreateAdminModelMappingCommand, CreateAdminModelVendorCommand, DeleteAdminAiModelCommand,
    DeleteAdminModelMappingCommand, DomainResult, ListAdminAiModelsQuery,
    ListAdminModelMappingsQuery, ListAdminModelVendorsQuery, ModelCatalogAdminStore,
    ResolveAdminModelMappingQuery, ResolveAdminModelMappingResult, SyncAdminModelCatalogCommand,
    UpdateAdminAiModelCommand, UpdateAdminModelMappingCommand,
};

use super::{
    RuntimeCacheManager, ROUTING_CONFIG_VERSION_CACHE_NAMESPACE,
    ROUTING_DISABLED_CHANNEL_CACHE_NAMESPACE, ROUTING_PROVIDER_OBJECT_ROUTE_CACHE_NAMESPACE,
    ROUTING_SNAPSHOT_CACHE_NAMESPACE,
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
            ROUTING_DISABLED_CHANNEL_CACHE_NAMESPACE,
            ROUTING_PROVIDER_OBJECT_ROUTE_CACHE_NAMESPACE,
        ] {
            self.manager.delete_namespace(namespace).await?;
        }
        Ok(())
    }

    pub async fn invalidate_routing_binding_facts(&self) -> DomainResult<()> {
        for namespace in [
            ROUTING_SNAPSHOT_CACHE_NAMESPACE,
            ROUTING_CONFIG_VERSION_CACHE_NAMESPACE,
            ROUTING_DISABLED_CHANNEL_CACHE_NAMESPACE,
        ] {
            self.manager.delete_namespace(namespace).await?;
        }
        Ok(())
    }
}

#[derive(Clone)]
pub struct AiRoutingCacheInvalidatingAdminChannelStore {
    inner: Arc<dyn AdminChannelStore + Send + Sync>,
    invalidator: AiRoutingCacheInvalidator,
}

impl AiRoutingCacheInvalidatingAdminChannelStore {
    pub fn new(
        inner: Arc<dyn AdminChannelStore + Send + Sync>,
        manager: RuntimeCacheManager,
    ) -> Self {
        Self {
            inner,
            invalidator: AiRoutingCacheInvalidator::new(manager),
        }
    }
}

impl AdminChannelStore for AiRoutingCacheInvalidatingAdminChannelStore {
    fn list_channels<'a>(
        &'a self,
        query: ListAdminChannelsQuery,
    ) -> AdminChannelCommandFuture<'a, AdminChannelListPage> {
        self.inner.list_channels(query)
    }

    fn create_channel<'a>(
        &'a self,
        command: CreateAdminChannelCommand,
    ) -> AdminChannelCommandFuture<'a, AdminChannelItem> {
        Box::pin(async move {
            let item = self.inner.create_channel(command).await?;
            self.invalidator.invalidate_routing_facts().await?;
            Ok(item)
        })
    }

    fn update_channel<'a>(
        &'a self,
        command: UpdateAdminChannelCommand,
    ) -> AdminChannelCommandFuture<'a, Option<AdminChannelItem>> {
        Box::pin(async move {
            let item = self.inner.update_channel(command).await?;
            if item.is_some() {
                self.invalidator.invalidate_routing_facts().await?;
            }
            Ok(item)
        })
    }

    fn delete_channel<'a>(
        &'a self,
        command: DeleteAdminChannelCommand,
    ) -> AdminChannelCommandFuture<'a, bool> {
        Box::pin(async move {
            let deleted = self.inner.delete_channel(command).await?;
            if deleted {
                self.invalidator.invalidate_routing_facts().await?;
            }
            Ok(deleted)
        })
    }

    fn test_channel<'a>(
        &'a self,
        command: TestAdminChannelCommand,
    ) -> AdminChannelCommandFuture<'a, Option<AdminChannelTestOutcome>> {
        Box::pin(async move {
            let outcome = self.inner.test_channel(command).await?;
            if outcome.is_some() {
                self.invalidator.invalidate_routing_facts().await?;
            }
            Ok(outcome)
        })
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
    ) -> AdminModelCommandFuture<'a, Vec<AdminModelMappingRuleItem>> {
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

#[derive(Clone)]
pub struct AiRoutingCacheInvalidatingAdminChannelGroupStore {
    inner: Arc<dyn AdminChannelGroupStore + Send + Sync>,
    invalidator: AiRoutingCacheInvalidator,
}

impl AiRoutingCacheInvalidatingAdminChannelGroupStore {
    pub fn new(
        inner: Arc<dyn AdminChannelGroupStore + Send + Sync>,
        manager: RuntimeCacheManager,
    ) -> Self {
        Self {
            inner,
            invalidator: AiRoutingCacheInvalidator::new(manager),
        }
    }
}

impl AdminChannelGroupStore for AiRoutingCacheInvalidatingAdminChannelGroupStore {
    fn list_channel_groups<'a>(
        &'a self,
        query: ListAdminChannelGroupsQuery,
    ) -> AdminChannelGroupCommandFuture<'a, AdminChannelGroupListPage> {
        self.inner.list_channel_groups(query)
    }

    fn create_channel_group<'a>(
        &'a self,
        command: CreateAdminChannelGroupCommand,
    ) -> AdminChannelGroupCommandFuture<'a, AdminChannelGroupItem> {
        Box::pin(async move {
            let item = self.inner.create_channel_group(command).await?;
            self.invalidator.invalidate_routing_facts().await?;
            Ok(item)
        })
    }

    fn update_channel_group<'a>(
        &'a self,
        command: UpdateAdminChannelGroupCommand,
    ) -> AdminChannelGroupCommandFuture<'a, Option<AdminChannelGroupItem>> {
        Box::pin(async move {
            let item = self.inner.update_channel_group(command).await?;
            if item.is_some() {
                self.invalidator.invalidate_routing_facts().await?;
            }
            Ok(item)
        })
    }

    fn delete_channel_group<'a>(
        &'a self,
        command: DeleteAdminChannelGroupCommand,
    ) -> AdminChannelGroupCommandFuture<'a, bool> {
        Box::pin(async move {
            let deleted = self.inner.delete_channel_group(command).await?;
            if deleted {
                self.invalidator.invalidate_routing_facts().await?;
            }
            Ok(deleted)
        })
    }

    fn list_channel_bindings<'a>(
        &'a self,
        query: ListAdminChannelGroupChannelBindingsQuery,
    ) -> AdminChannelGroupCommandFuture<'a, Vec<AdminChannelGroupChannelBindingItem>> {
        self.inner.list_channel_bindings(query)
    }

    fn replace_channel_bindings<'a>(
        &'a self,
        command: ReplaceAdminChannelGroupChannelBindingsCommand,
    ) -> AdminChannelGroupCommandFuture<'a, Vec<AdminChannelGroupChannelBindingItem>> {
        Box::pin(async move {
            let items = self.inner.replace_channel_bindings(command).await?;
            self.invalidator.invalidate_routing_binding_facts().await?;
            Ok(items)
        })
    }
}

#[derive(Clone)]
pub struct AiRoutingCacheInvalidatingAdminProviderSecretStore {
    inner: Arc<dyn AdminProviderSecretStore + Send + Sync>,
    invalidator: AiRoutingCacheInvalidator,
}

impl AiRoutingCacheInvalidatingAdminProviderSecretStore {
    pub fn new(
        inner: Arc<dyn AdminProviderSecretStore + Send + Sync>,
        manager: RuntimeCacheManager,
    ) -> Self {
        Self {
            inner,
            invalidator: AiRoutingCacheInvalidator::new(manager),
        }
    }
}

impl AdminProviderSecretStore for AiRoutingCacheInvalidatingAdminProviderSecretStore {
    fn list_provider_secrets<'a>(
        &'a self,
        query: ListAdminProviderSecretsQuery,
    ) -> AdminProviderSecretCommandFuture<'a, AdminProviderSecretListPage> {
        self.inner.list_provider_secrets(query)
    }

    fn create_provider_secret<'a>(
        &'a self,
        command: CreateAdminProviderSecretCommand,
    ) -> AdminProviderSecretCommandFuture<'a, AdminProviderSecretItem> {
        Box::pin(async move {
            let item = self.inner.create_provider_secret(command).await?;
            self.invalidator.invalidate_routing_facts().await?;
            Ok(item)
        })
    }

    fn update_provider_secret<'a>(
        &'a self,
        command: UpdateAdminProviderSecretCommand,
    ) -> AdminProviderSecretCommandFuture<'a, Option<AdminProviderSecretItem>> {
        Box::pin(async move {
            let item = self.inner.update_provider_secret(command).await?;
            if item.is_some() {
                self.invalidator.invalidate_routing_facts().await?;
            }
            Ok(item)
        })
    }

    fn delete_provider_secret<'a>(
        &'a self,
        command: DeleteAdminProviderSecretCommand,
    ) -> AdminProviderSecretCommandFuture<'a, bool> {
        Box::pin(async move {
            let deleted = self.inner.delete_provider_secret(command).await?;
            if deleted {
                self.invalidator.invalidate_routing_facts().await?;
            }
            Ok(deleted)
        })
    }
}

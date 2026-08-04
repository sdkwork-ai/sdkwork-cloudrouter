mod catalog;
mod contract;
mod operation;
mod plugin;

pub use catalog::{standard_paas_service_groups, PaasServiceGroup};
pub use contract::{
    PaasBlockBoundingBox, PaasDocumentBlock, PaasDocumentPage, PaasFaceCompareRequest,
    PaasFaceCompareResponse, PaasFaceLivenessRequest, PaasFaceLivenessResponse, PaasImageInput,
    PaasOcrRequest, PaasOcrResponse, PaasProviderRequestContext, PaasStandardRequest,
    PaasStandardResponse,
};
pub use operation::{PaasCapability, PaasOperation};
pub use plugin::{
    default_paas_plugin_registry, AlibabaPaasProviderPlugin, BaiduPaasProviderPlugin,
    PaasProviderPlugin, PaasProviderPluginError, PaasProviderPluginFuture,
    PaasProviderPluginMetadata, PaasProviderRegistry, PaasProviderRoutingKey,
    TencentPaasProviderPlugin,
};

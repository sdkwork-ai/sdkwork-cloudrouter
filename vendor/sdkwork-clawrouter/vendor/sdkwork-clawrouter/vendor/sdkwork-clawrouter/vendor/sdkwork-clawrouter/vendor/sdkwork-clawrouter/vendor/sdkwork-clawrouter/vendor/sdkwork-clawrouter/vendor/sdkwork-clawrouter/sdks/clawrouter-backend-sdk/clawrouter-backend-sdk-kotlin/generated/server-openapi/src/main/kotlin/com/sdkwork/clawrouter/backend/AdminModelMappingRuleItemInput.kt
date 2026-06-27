package com.sdkwork.clawrouter.backend

data class AdminModelMappingRuleItemInput(
    val enabled: Boolean? = null,
    val id: String? = null,
    val sourceCatalogKey: String? = null,
    val sourceModel: String? = null,
    val targetCatalogKey: String? = null,
    val targetModel: String? = null,
    val targetProviderModel: String? = null,
    val targetProviderNativeModel: String? = null
)

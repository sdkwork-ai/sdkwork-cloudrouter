package com.sdkwork.clawrouter.backend

data class AdminModelMappingResolveResponse(
    val matched: Boolean? = null,
    val matchedBindingType: String? = null,
    val rule: AdminModelMappingRule? = null,
    val sourceModel: String? = null,
    val targetCatalogKey: String? = null,
    val targetModel: String? = null,
    val targetProviderModel: String? = null,
    val targetProviderNativeModel: String? = null,
    val targetVendorCode: String? = null
)

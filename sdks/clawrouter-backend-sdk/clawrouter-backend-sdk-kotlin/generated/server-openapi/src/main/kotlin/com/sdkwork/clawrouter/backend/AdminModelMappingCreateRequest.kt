package com.sdkwork.clawrouter.backend

data class AdminModelMappingCreateRequest(
    val bindings: List<AdminModelMappingRuleBindingInput>? = null,
    val enabled: Boolean? = null,
    val mappingItems: List<AdminModelMappingRuleItemInput>? = null,
    val mappingMode: String? = null,
    val matchType: String? = null,
    val sourceVendorCode: String? = null,
    val sourceVendorId: String? = null,
    val targetVendorCode: String? = null,
    val targetVendorId: String? = null
)

package com.sdkwork.clawrouter.backend

data class AdminModelMappingRule(
    val bindingType: String? = null,
    val bindings: List<AdminModelMappingRuleBinding>? = null,
    val createdAt: String? = null,
    val enabled: Boolean? = null,
    val id: String? = null,
    val mappingItems: List<AdminModelMappingRuleItem>? = null,
    val mappingMode: String? = null,
    val matchType: String? = null,
    val sourceVendorCode: String? = null,
    val sourceVendorId: String? = null,
    val targetVendorCode: String? = null,
    val targetVendorId: String? = null,
    val updatedAt: String? = null
)

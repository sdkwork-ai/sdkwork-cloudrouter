package com.sdkwork.clawrouter.backend

data class AdminChannelGroupRouteExplainResponse(
    val activeHealthyBindingCount: Int? = null,
    val apiScope: List<String>? = null,
    val capabilities: List<String>? = null,
    val configuredResourceAccessCount: Int? = null,
    val configuredResourceGroupAccessCount: Int? = null,
    val effectiveResourceCodes: List<String>? = null,
    val issueCodes: List<String>? = null,
    val issues: List<AdminChannelGroupRouteExplainIssue>? = null,
    val ready: Boolean? = null,
    val resourceCodes: List<String>? = null,
    val resourceGroupCodes: List<String>? = null,
    val routableBindingCount: Int? = null,
    val source: String? = null
)

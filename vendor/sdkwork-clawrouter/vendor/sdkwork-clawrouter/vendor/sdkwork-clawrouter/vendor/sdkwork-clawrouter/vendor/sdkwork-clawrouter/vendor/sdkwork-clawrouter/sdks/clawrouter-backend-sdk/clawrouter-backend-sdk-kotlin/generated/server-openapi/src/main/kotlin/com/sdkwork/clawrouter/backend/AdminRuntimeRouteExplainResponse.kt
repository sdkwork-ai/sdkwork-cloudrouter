package com.sdkwork.clawrouter.backend

data class AdminRuntimeRouteExplainResponse(
    val apiCode: String? = null,
    val apiKeyId: String? = null,
    val billingMeter: String? = null,
    val blockedReasons: List<AdminRuntimeRouteExplainIssue>? = null,
    val candidateCount: Int? = null,
    val capability: String? = null,
    val catalogKey: String? = null,
    val channelGroupId: String? = null,
    val groupCode: String? = null,
    val model: String? = null,
    val policyId: String? = null,
    val policySnapshotVersion: String? = null,
    val pricingPlanCode: String? = null,
    val ready: Boolean? = null,
    val resourceCode: String? = null,
    val ruleId: String? = null,
    val selectedCandidates: List<AdminRuntimeRouteExplainCandidate>? = null,
    val source: String? = null,
    val warnings: List<AdminRuntimeRouteExplainIssue>? = null
)

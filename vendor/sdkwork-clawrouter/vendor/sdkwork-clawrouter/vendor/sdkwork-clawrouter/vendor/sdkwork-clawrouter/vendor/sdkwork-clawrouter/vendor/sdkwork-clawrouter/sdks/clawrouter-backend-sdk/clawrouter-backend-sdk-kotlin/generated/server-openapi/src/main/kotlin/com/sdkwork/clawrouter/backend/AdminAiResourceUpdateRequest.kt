package com.sdkwork.clawrouter.backend

data class AdminAiResourceUpdateRequest(
    val apiEndpointCode: String? = null,
    val catalogKey: String? = null,
    val compositionMode: String? = null,
    val displayName: String? = null,
    val members: List<AdminAiResourceMemberInput>? = null,
    val modalityCode: String? = null,
    val model: String? = null,
    val providerNativeModel: String? = null,
    val resourceCode: String? = null,
    val resourceType: String? = null,
    val sortOrder: String? = null,
    val status: String? = null,
    val vendorCode: String? = null
)

package com.sdkwork.clawrouter.backend

data class AdminModelMappingResolveRequest(
    val channelCode: String? = null,
    val channelId: String? = null,
    val providerAccountCode: String? = null,
    val providerAccountId: String? = null,
    val sourceModel: String? = null,
    val vendorCode: String? = null
)

package com.sdkwork.clawrouter.backend

data class ServiceProviderCollectionResponse(
    val items: List<Map<String, String>>? = null,
    val page: String? = null,
    val pageSize: String? = null,
    val total: String? = null
)

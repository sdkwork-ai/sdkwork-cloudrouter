package com.sdkwork.clawrouter.app

data class ModelCatalogPage(
    val groups: List<Map<String, Any>>? = null,
    val items: List<Map<String, String>>? = null,
    val pageInfo: PageInfo? = null
)

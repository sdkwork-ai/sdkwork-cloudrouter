package com.sdkwork.clawrouter.backend

data class ModelRankingsPage(
    val history: List<Map<String, String>>? = null,
    val items: List<Map<String, String>>? = null,
    val pageInfo: PageInfo? = null,
    val source: Map<String, String>? = null
)

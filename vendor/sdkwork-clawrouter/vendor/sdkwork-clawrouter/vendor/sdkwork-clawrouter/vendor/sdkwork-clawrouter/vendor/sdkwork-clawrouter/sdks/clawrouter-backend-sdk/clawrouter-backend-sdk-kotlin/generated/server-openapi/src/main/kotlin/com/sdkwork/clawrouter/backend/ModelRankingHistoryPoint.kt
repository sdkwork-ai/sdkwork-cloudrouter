package com.sdkwork.clawrouter.backend

data class ModelRankingHistoryPoint(
    val date: String? = null,
    val entries: List<ModelRankingHistoryEntry>? = null,
    val index: String? = null
)

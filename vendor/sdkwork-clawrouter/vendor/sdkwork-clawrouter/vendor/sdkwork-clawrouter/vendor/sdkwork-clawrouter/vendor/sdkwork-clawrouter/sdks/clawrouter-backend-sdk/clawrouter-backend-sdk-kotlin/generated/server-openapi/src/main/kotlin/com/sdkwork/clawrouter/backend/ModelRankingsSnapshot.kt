package com.sdkwork.clawrouter.backend

data class ModelRankingsSnapshot(
    val history: List<ModelRankingHistoryPoint>? = null,
    val items: List<ModelRankingItem>? = null,
    val source: ModelRankingsSource? = null
)

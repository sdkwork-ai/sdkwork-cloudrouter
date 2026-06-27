package com.sdkwork.clawrouter.app

data class ModelRankingsSnapshot(
    val history: List<ModelRankingHistoryPoint>? = null,
    val items: List<ModelRankingItem>? = null,
    val source: ModelRankingsSource? = null
)

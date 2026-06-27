package com.sdkwork.clawrouter.app

data class ModelRankingItem(
    val baseVolume: String? = null,
    val color: String? = null,
    val contextSize: String? = null,
    val cost: Double? = null,
    val costIndicator: String? = null,
    val currency: String? = null,
    val id: String? = null,
    val isNew: Boolean? = null,
    val latency: String? = null,
    val license: String? = null,
    val modality: String? = null,
    val name: String? = null,
    val prevRank: String? = null,
    val pricing: String? = null,
    val rank: String? = null,
    val requests: String? = null,
    val strengths: List<String>? = null,
    val tokens: String? = null,
    val trendScore: Double? = null,
    val vendor: String? = null,
    val vendorCode: String? = null,
    val winRate: Double? = null
)

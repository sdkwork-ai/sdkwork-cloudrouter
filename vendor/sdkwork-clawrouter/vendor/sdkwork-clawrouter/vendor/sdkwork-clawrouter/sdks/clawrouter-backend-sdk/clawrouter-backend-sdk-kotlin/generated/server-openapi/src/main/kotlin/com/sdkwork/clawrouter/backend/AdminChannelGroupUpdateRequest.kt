package com.sdkwork.clawrouter.backend

data class AdminChannelGroupUpdateRequest(
    val capacity: Map<String, Any>? = null,
    val groupCode: String? = null,
    val groupName: String? = null,
    val groupType: String? = null,
    val officialPriceMultiplier: Double? = null,
    val priceReferenceMode: String? = null,
    val rateMultiplier: Double? = null,
    val resourceCodes: List<String>? = null,
    val resourceGroupCodes: List<String>? = null,
    val status: String? = null
)

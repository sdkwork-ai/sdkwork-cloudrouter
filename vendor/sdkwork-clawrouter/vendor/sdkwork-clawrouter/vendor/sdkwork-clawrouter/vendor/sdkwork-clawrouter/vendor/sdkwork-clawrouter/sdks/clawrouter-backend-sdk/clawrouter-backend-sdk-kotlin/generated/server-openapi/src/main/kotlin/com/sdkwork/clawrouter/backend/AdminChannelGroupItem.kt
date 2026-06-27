package com.sdkwork.clawrouter.backend

data class AdminChannelGroupItem(
    val accountCount: AdminCountPair? = null,
    val capacity: AdminCapacityPair? = null,
    val groupCode: String? = null,
    val groupName: String? = null,
    val groupType: String? = null,
    val id: String? = null,
    val officialPriceMultiplier: Double? = null,
    val priceReferenceMode: String? = null,
    val providerCode: String? = null,
    val rateMultiplier: Double? = null,
    val resourceCodes: List<String>? = null,
    val resourceGroupCodes: List<String>? = null,
    val status: String? = null,
    val usage: AdminUsagePair? = null
)

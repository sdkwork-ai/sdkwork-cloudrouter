package com.sdkwork.clawrouter.backend

data class AdminAiResourceGroupItem(
    val capabilities: List<String>? = null,
    val capability: String? = null,
    val description: String? = null,
    val dynamic_: Boolean? = null,
    val groupCode: String? = null,
    val groupName: String? = null,
    val groupType: String? = null,
    val id: String? = null,
    val resourceCount: String? = null,
    val selectionMode: String? = null,
    val sortOrder: String? = null,
    val status: String? = null,
    val vendorCodes: List<String>? = null
)

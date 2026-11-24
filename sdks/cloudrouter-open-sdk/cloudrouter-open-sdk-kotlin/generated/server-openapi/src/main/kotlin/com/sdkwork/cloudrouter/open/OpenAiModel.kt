package com.sdkwork.cloudrouter.open

data class OpenAiModel(
    val created: Int? = null,
    val displayName: String? = null,
    val id: String,
    val object_: String,
    val ownedBy: String,
    val vendorDisplayName: String? = null
)

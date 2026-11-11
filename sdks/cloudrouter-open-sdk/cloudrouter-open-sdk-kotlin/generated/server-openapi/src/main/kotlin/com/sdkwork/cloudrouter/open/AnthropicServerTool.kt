package com.sdkwork.cloudrouter.open

data class AnthropicServerTool(
    val allowedCallers: List<String>? = null,
    val allowedDomains: List<String>? = null,
    val blockedDomains: List<String>? = null,
    val cacheControl: AnthropicCacheControl? = null,
    val deferLoading: Boolean? = null,
    val displayHeightPx: Int? = null,
    val displayNumber: Int? = null,
    val displayWidthPx: Int? = null,
    val maxCharacters: Int? = null,
    val maxUses: Int? = null,
    val name: String? = null,
    val strict: Boolean? = null,
    val type: String? = null,
    val userLocation: Map<String, String>? = null
)

package com.sdkwork.clawrouter.open

data class GoogleCachedContentCreateRequest(
    val contents: List<GoogleContent>? = null,
    val displayName: String? = null,
    val expireTime: String? = null,
    val model: String? = null,
    val systemInstruction: GoogleContent? = null,
    val toolConfig: GoogleToolConfig? = null,
    val tools: List<GoogleTool>? = null,
    val ttl: String? = null
)

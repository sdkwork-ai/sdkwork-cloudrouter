package com.sdkwork.clawrouter.open

data class GoogleCachedContent(
    val contents: List<GoogleContent>? = null,
    val createTime: String? = null,
    val displayName: String? = null,
    val expireTime: String? = null,
    val model: String? = null,
    val name: String? = null,
    val systemInstruction: GoogleContent? = null,
    val toolConfig: GoogleToolConfig? = null,
    val tools: List<GoogleTool>? = null,
    val updateTime: String? = null,
    val usageMetadata: GoogleCachedContentUsageMetadata? = null
)

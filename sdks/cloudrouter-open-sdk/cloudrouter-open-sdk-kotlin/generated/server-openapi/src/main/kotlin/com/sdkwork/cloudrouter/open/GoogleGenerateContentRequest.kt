package com.sdkwork.cloudrouter.open

data class GoogleGenerateContentRequest(
    val cachedContent: String? = null,
    val contents: List<GoogleContent>? = null,
    val continuationToken: String? = null,
    val generationConfig: GoogleGenerationConfig? = null,
    val labels: Map<String, String>? = null,
    val model: String? = null,
    val safetySettings: List<GoogleSafetySetting>? = null,
    val serviceTier: String? = null,
    val store: Boolean? = null,
    val systemInstruction: GoogleContent? = null,
    val toolConfig: GoogleToolConfig? = null,
    val tools: List<GoogleTool>? = null
)

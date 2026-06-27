package com.sdkwork.clawrouter.open

data class GoogleGenerateContentRequest(
    val cachedContent: String? = null,
    val contents: List<GoogleContent>? = null,
    val generationConfig: GoogleGenerationConfig? = null,
    val safetySettings: List<GoogleSafetySetting>? = null,
    val systemInstruction: GoogleContent? = null,
    val toolConfig: GoogleToolConfig? = null,
    val tools: List<GoogleTool>? = null
)

package com.sdkwork.clawrouter.open

data class GoogleGenerationConfig(
    val candidateCount: Int? = null,
    val maxOutputTokens: Int? = null,
    val responseMimeType: String? = null,
    val responseSchema: GoogleSchema? = null,
    val stopSequences: List<String>? = null,
    val temperature: Double? = null,
    val thinkingConfig: GoogleThinkingConfig? = null,
    val topK: Int? = null,
    val topP: Double? = null
)

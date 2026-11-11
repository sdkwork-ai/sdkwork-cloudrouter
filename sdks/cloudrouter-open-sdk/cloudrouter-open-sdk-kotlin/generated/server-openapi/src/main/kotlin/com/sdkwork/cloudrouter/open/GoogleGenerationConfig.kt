package com.sdkwork.cloudrouter.open

data class GoogleGenerationConfig(
    val audioTranscriptionConfig: Map<String, String>? = null,
    val candidateCount: Int? = null,
    val enableAffectiveDialog: Boolean? = null,
    val enableEnhancedCivicAnswers: Boolean? = null,
    val frequencyPenalty: Double? = null,
    val imageConfig: Map<String, String>? = null,
    val logprobs: Int? = null,
    val maxOutputTokens: Int? = null,
    val mediaResolution: String? = null,
    val presencePenalty: Double? = null,
    val responseFormat: Map<String, String>? = null,
    val responseJsonSchema: String? = null,
    val responseLogprobs: Boolean? = null,
    val responseMimeType: String? = null,
    val responseModalities: List<String>? = null,
    val responseSchema: GoogleSchema? = null,
    val seed: Int? = null,
    val speechConfig: Map<String, String>? = null,
    val stopSequences: List<String>? = null,
    val temperature: Double? = null,
    val thinkingConfig: GoogleThinkingConfig? = null,
    val topK: Int? = null,
    val topP: Double? = null,
    val translationConfig: Map<String, String>? = null
)

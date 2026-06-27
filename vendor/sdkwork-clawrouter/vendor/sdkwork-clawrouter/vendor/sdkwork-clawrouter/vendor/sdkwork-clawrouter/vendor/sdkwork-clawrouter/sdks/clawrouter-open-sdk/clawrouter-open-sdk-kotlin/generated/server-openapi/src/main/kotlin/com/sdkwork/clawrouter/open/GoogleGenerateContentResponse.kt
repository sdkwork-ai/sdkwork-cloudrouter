package com.sdkwork.clawrouter.open

data class GoogleGenerateContentResponse(
    val candidates: List<GoogleCandidate>? = null,
    val modelVersion: String? = null,
    val promptFeedback: GooglePromptFeedback? = null,
    val responseId: String? = null,
    val usageMetadata: GoogleUsageMetadata? = null
)

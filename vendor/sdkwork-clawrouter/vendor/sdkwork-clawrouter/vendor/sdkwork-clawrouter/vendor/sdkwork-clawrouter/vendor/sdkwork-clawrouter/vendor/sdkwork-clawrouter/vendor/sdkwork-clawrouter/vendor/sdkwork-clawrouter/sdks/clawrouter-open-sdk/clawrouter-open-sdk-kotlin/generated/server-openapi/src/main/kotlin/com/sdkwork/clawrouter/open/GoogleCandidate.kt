package com.sdkwork.clawrouter.open

data class GoogleCandidate(
    val citationMetadata: GoogleCitationMetadata? = null,
    val content: GoogleContent? = null,
    val finishReason: String? = null,
    val index: Int? = null,
    val safetyRatings: List<GoogleSafetyRating>? = null,
    val tokenCount: Int? = null
)

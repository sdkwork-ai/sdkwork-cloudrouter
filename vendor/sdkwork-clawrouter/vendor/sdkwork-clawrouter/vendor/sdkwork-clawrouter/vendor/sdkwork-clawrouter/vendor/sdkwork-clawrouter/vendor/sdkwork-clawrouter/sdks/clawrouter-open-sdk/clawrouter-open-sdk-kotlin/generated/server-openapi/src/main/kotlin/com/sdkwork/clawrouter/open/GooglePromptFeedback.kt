package com.sdkwork.clawrouter.open

data class GooglePromptFeedback(
    val blockReason: String? = null,
    val safetyRatings: List<GoogleSafetyRating>? = null
)

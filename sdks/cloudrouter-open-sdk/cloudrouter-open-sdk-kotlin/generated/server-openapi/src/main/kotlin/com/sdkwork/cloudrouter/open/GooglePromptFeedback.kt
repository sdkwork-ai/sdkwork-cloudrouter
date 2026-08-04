package com.sdkwork.cloudrouter.open

data class GooglePromptFeedback(
    val blockReason: String? = null,
    val safetyRatings: List<GoogleSafetyRating>? = null
)

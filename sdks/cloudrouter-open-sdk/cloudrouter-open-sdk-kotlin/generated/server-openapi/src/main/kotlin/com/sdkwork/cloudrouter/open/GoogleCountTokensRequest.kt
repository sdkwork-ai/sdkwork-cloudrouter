package com.sdkwork.cloudrouter.open

data class GoogleCountTokensRequest(
    val contents: List<GoogleContent>? = null,
    val generateContentRequest: GoogleGenerateContentRequest? = null
)

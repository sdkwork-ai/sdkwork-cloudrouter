package com.sdkwork.clawrouter.open

data class GoogleCountTokensRequest(
    val contents: List<GoogleContent>? = null,
    val generateContentRequest: GoogleGenerateContentRequest? = null
)

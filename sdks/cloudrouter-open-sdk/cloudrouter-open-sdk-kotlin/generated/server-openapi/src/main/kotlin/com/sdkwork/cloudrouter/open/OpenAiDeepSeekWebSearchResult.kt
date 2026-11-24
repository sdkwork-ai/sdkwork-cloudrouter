package com.sdkwork.cloudrouter.open

data class OpenAiDeepSeekWebSearchResult(
    val authority: Int,
    val content: String,
    val date: String,
    val rerankScore: Double,
    val siteIcon: String,
    val siteName: String,
    val snippet: String,
    val summary: String,
    val title: String,
    val url: String
)

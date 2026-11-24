package com.sdkwork.cloudrouter.open

data class OpenAiError(
    val code: String,
    val message: String,
    val param_: String? = null,
    val path: String? = null,
    val type: String
)

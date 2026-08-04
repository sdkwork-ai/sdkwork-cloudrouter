package com.sdkwork.cloudrouter.open

data class OpenAiRunSubmitToolOutputsRequest(
    val stream: Boolean? = null,
    val toolOutputs: List<String>? = null
)

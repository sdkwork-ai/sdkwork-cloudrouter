package com.sdkwork.clawrouter.open

data class OpenAiRunSubmitToolOutputsRequest(
    val stream: Boolean? = null,
    val toolOutputs: List<String>? = null
)

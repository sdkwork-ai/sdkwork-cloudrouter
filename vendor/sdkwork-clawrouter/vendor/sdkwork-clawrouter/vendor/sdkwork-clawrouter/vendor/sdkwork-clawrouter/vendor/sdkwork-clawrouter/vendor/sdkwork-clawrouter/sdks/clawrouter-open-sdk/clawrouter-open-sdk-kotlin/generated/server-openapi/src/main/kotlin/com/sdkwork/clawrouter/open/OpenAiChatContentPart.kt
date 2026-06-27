package com.sdkwork.clawrouter.open

data class OpenAiChatContentPart(
    val file_: OpenAiChatFile? = null,
    val imageUrl: OpenAiChatImageUrl? = null,
    val inputAudio: OpenAiChatInputAudio? = null,
    val text: String? = null,
    val type: String? = null
)

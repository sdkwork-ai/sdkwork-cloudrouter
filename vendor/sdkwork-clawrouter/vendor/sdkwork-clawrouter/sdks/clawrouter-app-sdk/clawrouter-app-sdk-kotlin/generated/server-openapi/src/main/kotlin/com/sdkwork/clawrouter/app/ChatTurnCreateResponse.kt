package com.sdkwork.clawrouter.app

data class ChatTurnCreateResponse(
    val messages: List<ChatMessageItem>? = null,
    val turn: ChatTurnItem? = null
)

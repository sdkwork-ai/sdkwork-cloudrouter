package com.sdkwork.clawrouter.open

data class OpenAiAssistant(
    val createdAt: Int? = null,
    val description: String? = null,
    val id: String? = null,
    val instructions: String? = null,
    val metadata: Map<String, String>? = null,
    val model: String? = null,
    val name: String? = null,
    val object_: String? = null,
    val responseFormat: String? = null,
    val temperature: Double? = null,
    val toolResources: String? = null,
    val tools: List<String>? = null,
    val topP: Double? = null
)

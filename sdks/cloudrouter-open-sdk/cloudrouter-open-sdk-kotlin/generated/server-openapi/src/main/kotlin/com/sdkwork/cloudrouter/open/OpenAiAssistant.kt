package com.sdkwork.cloudrouter.open

data class OpenAiAssistant(
    val createdAt: Int,
    val description: String? = null,
    val id: String,
    val instructions: String? = null,
    val metadata: Map<String, String>? = null,
    val model: String,
    val name: String? = null,
    val object_: String,
    val responseFormat: String? = null,
    val temperature: Double? = null,
    val toolResources: String? = null,
    val tools: List<String>? = null,
    val topP: Double? = null
)

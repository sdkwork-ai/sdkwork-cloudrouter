package com.sdkwork.clawrouter.backend

data class AdminPromptVersionCreateRequest(
    val content: String? = null,
    val examplesJson: List<Map<String, String>>? = null,
    val modelConstraints: Map<String, String>? = null,
    val outputSchema: Map<String, String>? = null,
    val safetyPolicy: Map<String, String>? = null,
    val title: String? = null,
    val variableSchema: Map<String, String>? = null,
    val versionNo: String? = null
)

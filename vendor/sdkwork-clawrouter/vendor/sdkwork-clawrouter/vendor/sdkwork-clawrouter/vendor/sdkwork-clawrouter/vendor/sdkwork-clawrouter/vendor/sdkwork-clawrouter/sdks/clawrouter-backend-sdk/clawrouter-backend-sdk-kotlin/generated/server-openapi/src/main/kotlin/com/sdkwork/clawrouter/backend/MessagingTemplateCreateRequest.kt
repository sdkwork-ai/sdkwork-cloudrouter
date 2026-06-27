package com.sdkwork.clawrouter.backend

data class MessagingTemplateCreateRequest(
    val bodyTemplate: String? = null,
    val category: String? = null,
    val channel: String? = null,
    val contentFormat: String? = null,
    val deliveryPurpose: String? = null,
    val locale: String? = null,
    val sceneCode: String? = null,
    val subjectTemplate: String? = null,
    val templateCode: String? = null,
    val templateName: String? = null,
    val variableSchema: Map<String, String>? = null
)

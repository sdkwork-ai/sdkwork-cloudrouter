package com.sdkwork.clawrouter.backend

data class AdminMcpServerRevisionCreateRequest(
    val argsJson: List<String>? = null,
    val authType: String? = null,
    val command: String? = null,
    val endpointUrl: String? = null,
    val envSchema: Map<String, String>? = null,
    val retryPolicy: Map<String, String>? = null,
    val revisionNo: String? = null,
    val secretRef: String? = null,
    val timeoutMs: Int? = null,
    val transport: String? = null
)

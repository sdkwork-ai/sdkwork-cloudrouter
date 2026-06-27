package com.sdkwork.clawrouter.app

data class RuntimeInvocationCreateRequest(
    val agentRunId: String? = null,
    val agentRunStepId: String? = null,
    val agentSessionId: String? = null,
    val approvalPolicy: String? = null,
    val chatItemId: String? = null,
    val chatTurnId: String? = null,
    val conversationId: String? = null,
    val cwd: String? = null,
    val endpoint: String? = null,
    val invocationType: String? = null,
    val metadata: Map<String, String>? = null,
    val model: String? = null,
    val permissionMode: String? = null,
    val provider: String? = null,
    val requestJson: Map<String, String>? = null,
    val runtime: String? = null,
    val sandboxPolicy: String? = null,
    val status: String? = null,
    val streaming: Boolean? = null,
    val toolCallId: String? = null,
    val toolName: String? = null,
    val traceId: String? = null
)

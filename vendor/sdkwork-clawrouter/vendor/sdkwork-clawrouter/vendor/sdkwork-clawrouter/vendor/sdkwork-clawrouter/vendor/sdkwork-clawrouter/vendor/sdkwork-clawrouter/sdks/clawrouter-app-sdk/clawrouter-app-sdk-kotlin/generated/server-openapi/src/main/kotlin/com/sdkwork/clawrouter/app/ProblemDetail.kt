package com.sdkwork.clawrouter.app

data class ProblemDetail(
    val code: String? = null,
    val detail: String? = null,
    val errors: List<FieldError>? = null,
    val instance: String? = null,
    val requestId: String? = null,
    val status: Int? = null,
    val title: String? = null,
    val traceId: String? = null,
    val type: String? = null
)

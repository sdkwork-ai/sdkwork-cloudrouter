package com.sdkwork.clawrouter.backend

data class ProblemDetail(
    val code: Int? = null,
    val detail: String? = null,
    val errors: List<FieldError>? = null,
    val instance: String? = null,
    val status: Int? = null,
    val title: String? = null,
    val traceId: String? = null,
    val type: String? = null
)

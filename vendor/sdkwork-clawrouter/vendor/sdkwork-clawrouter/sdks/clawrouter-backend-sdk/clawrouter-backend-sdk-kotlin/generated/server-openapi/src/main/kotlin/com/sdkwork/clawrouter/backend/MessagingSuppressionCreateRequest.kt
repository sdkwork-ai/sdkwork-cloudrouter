package com.sdkwork.clawrouter.backend

data class MessagingSuppressionCreateRequest(
    val channel: String? = null,
    val endsAt: String? = null,
    val note: String? = null,
    val reasonCode: String? = null,
    val scopeId: String? = null,
    val scopeType: String? = null,
    val source: String? = null,
    val startsAt: String? = null,
    val targetHash: String? = null,
    val targetMasked: String? = null
)

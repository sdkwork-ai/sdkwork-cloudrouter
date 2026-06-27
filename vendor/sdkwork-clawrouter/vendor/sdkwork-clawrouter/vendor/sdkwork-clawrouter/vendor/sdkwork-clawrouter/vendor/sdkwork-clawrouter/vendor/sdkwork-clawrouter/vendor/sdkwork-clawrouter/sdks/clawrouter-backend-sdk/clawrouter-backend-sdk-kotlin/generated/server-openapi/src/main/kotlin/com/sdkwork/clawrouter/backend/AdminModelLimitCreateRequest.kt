package com.sdkwork.clawrouter.backend

data class AdminModelLimitCreateRequest(
    val channelGroup: String? = null,
    val model: String? = null,
    val rpm: Int? = null,
    val status: String? = null,
    val tpm: Int? = null
)

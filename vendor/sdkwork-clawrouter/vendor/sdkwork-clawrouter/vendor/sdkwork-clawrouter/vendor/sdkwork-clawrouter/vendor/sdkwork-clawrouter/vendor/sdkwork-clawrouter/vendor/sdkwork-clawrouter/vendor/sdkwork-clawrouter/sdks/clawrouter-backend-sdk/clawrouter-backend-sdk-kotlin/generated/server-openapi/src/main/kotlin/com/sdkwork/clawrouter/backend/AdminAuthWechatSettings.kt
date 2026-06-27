package com.sdkwork.clawrouter.backend

data class AdminAuthWechatSettings(
    val mini: List<AdminAuthWechatMini>? = null,
    val official: List<AdminAuthWechatOfficial>? = null
)

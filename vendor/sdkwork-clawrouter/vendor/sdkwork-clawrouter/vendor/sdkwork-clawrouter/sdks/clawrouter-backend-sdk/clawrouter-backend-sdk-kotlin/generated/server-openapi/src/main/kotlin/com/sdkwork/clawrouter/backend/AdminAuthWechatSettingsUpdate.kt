package com.sdkwork.clawrouter.backend

data class AdminAuthWechatSettingsUpdate(
    val mini: List<AdminAuthWechatMini>? = null,
    val official: List<AdminAuthWechatOfficial>? = null
)

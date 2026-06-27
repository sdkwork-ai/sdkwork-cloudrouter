package com.sdkwork.clawrouter.app

data class SettingsDataResponse(
    val language: String? = null,
    val notifications: SettingsNotifications? = null,
    val timezone: String? = null,
    val webhookUrl: String? = null
)

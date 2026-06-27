package com.sdkwork.clawrouter.backend

data class AdminAuthSettingsUpdateRequest(
    val leftRailMode: String? = null,
    val loginMethods: List<String>? = null,
    val oauthLoginEnabled: Boolean? = null,
    val oauthProviders: List<String>? = null,
    val oauthRegion: String? = null,
    val qrLoginEnabled: Boolean? = null,
    val qrLoginType: String? = null,
    val recoveryMethods: List<String>? = null,
    val registerMethods: List<String>? = null,
    val verificationPolicy: AdminAuthVerificationPolicy? = null,
    val wechat: AdminAuthWechatSettingsUpdate? = null
)

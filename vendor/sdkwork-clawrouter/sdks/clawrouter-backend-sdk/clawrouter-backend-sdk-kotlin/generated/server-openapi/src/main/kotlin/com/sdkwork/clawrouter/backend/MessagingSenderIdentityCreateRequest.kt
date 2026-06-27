package com.sdkwork.clawrouter.backend

data class MessagingSenderIdentityCreateRequest(
    val channel: String? = null,
    val countryCode: String? = null,
    val displayName: String? = null,
    val domainName: String? = null,
    val fromEmail: String? = null,
    val fromName: String? = null,
    val identityCode: String? = null,
    val providerAccountId: String? = null,
    val replyTo: String? = null,
    val senderId: String? = null,
    val signName: String? = null
)

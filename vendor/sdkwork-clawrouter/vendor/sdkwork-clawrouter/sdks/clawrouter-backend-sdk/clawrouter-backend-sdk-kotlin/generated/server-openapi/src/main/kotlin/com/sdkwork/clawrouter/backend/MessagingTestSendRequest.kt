package com.sdkwork.clawrouter.backend

data class MessagingTestSendRequest(
    val channel: String? = null,
    val countryCode: String? = null,
    val deliveryPurpose: String? = null,
    val dryRun: Boolean? = null,
    val locale: String? = null,
    val sceneCode: String? = null,
    val targetHash: String? = null,
    val targetMasked: String? = null,
    val templateCode: String? = null,
    val userSegment: String? = null,
    val variables: Map<String, String>? = null
)

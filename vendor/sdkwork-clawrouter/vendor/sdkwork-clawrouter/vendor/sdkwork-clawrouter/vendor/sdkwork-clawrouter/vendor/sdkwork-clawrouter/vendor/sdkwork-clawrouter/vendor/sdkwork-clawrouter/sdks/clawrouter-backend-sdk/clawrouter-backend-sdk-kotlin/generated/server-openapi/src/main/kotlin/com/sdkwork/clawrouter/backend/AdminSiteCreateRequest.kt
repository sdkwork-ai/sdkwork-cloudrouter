package com.sdkwork.clawrouter.backend

data class AdminSiteCreateRequest(
    val baseUrl: String? = null,
    val credentialRef: String? = null,
    val description: String? = null,
    val displayName: String? = null,
    val docsUrl: String? = null,
    val domains: List<String>? = null,
    val environment: String? = null,
    val logo: MediaResource? = null,
    val maskedLabel: String? = null,
    val ownerKind: String? = null,
    val regionCode: String? = null,
    val siteCode: String? = null,
    val siteName: String? = null,
    val siteType: String? = null,
    val status: String? = null,
    val vendorCodes: List<String>? = null,
    val websiteUrl: String? = null
)

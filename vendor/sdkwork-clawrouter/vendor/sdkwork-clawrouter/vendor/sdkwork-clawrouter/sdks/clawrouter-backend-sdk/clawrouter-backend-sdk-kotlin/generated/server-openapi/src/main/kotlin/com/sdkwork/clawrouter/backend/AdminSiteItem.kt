package com.sdkwork.clawrouter.backend

data class AdminSiteItem(
    val baseUrl: String? = null,
    val consecutiveErrorCount: String? = null,
    val description: String? = null,
    val displayName: String? = null,
    val docsUrl: String? = null,
    val domains: List<String>? = null,
    val environment: String? = null,
    val healthStatus: String? = null,
    val id: String? = null,
    val lastCheckedAt: String? = null,
    val lastLatencyMs: String? = null,
    val lastSyncAt: String? = null,
    val logo: MediaResource? = null,
    val ownerKind: String? = null,
    val regionCode: String? = null,
    val siteCode: String? = null,
    val siteName: String? = null,
    val siteType: String? = null,
    val sortOrder: String? = null,
    val status: String? = null,
    val vendorCodes: List<String>? = null,
    val websiteUrl: String? = null
)

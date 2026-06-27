package com.sdkwork.clawrouter.app

data class SiteRuntimeSettingsResponse(
    val accentColor: String? = null,
    val brandColor: String? = null,
    val customCss: String? = null,
    val description: String? = null,
    val docsUrl: String? = null,
    val favicon: MediaResource? = null,
    val footerCopyright: String? = null,
    val icon: MediaResource? = null,
    val icpRecordNumber: String? = null,
    val icpRecordUrl: String? = null,
    val logo: MediaResource? = null,
    val policeRecordNumber: String? = null,
    val policeRecordUrl: String? = null,
    val privacyUrl: String? = null,
    val seoDescription: String? = null,
    val seoTitle: String? = null,
    val shortName: String? = null,
    val siteName: String? = null,
    val supportUrl: String? = null,
    val termsUrl: String? = null
)

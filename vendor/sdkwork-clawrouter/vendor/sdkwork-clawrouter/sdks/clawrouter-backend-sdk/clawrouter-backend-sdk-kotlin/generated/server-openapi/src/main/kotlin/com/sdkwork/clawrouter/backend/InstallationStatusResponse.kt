package com.sdkwork.clawrouter.backend

data class InstallationStatusResponse(
    val catalogSource: String? = null,
    val catalogVersion: String? = null,
    val changed: Boolean? = null,
    val environment: String? = null,
    val externalCatalog: Boolean? = null,
    val lastCatalogRefreshStatus: String? = null,
    val schemaVersion: String? = null,
    val seedProfile: String? = null,
    val status: String? = null
)

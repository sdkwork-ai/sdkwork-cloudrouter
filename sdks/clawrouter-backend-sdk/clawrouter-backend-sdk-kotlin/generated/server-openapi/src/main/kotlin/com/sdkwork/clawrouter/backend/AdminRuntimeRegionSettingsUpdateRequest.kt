package com.sdkwork.clawrouter.backend

data class AdminRuntimeRegionSettingsUpdateRequest(
    val currentRegionCode: String? = null,
    val currentRegionName: String? = null,
    val remark: String? = null
)

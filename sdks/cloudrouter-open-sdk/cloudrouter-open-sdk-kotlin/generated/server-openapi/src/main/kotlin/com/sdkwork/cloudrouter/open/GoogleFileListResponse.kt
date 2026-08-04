package com.sdkwork.cloudrouter.open

data class GoogleFileListResponse(
    val files: List<GoogleFile>? = null,
    val nextPageToken: String? = null
)

package com.sdkwork.clawrouter.open

data class GoogleFileListResponse(
    val files: List<GoogleFile>? = null,
    val nextPageToken: String? = null
)

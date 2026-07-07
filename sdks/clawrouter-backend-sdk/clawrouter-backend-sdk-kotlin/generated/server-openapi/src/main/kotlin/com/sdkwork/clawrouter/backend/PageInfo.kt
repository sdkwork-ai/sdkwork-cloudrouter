package com.sdkwork.clawrouter.backend

data class PageInfo(
    val hasMore: Boolean? = null,
    val mode: String? = null,
    val nextCursor: String? = null,
    val page: Int? = null,
    val pageSize: Int? = null,
    val totalItems: String? = null,
    val totalPages: Int? = null
)

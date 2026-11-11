package com.sdkwork.cloudrouter.open

data class TypeSafeSystemOneRequest(
    val model: String? = null,
    val questions: Map<String, TypeSafeQuestion>? = null,
    val state: String? = null
)

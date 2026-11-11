package com.sdkwork.cloudrouter.open

data class TypeSafeSystemOneResponse(
    val answers: Map<String, TypeSafeAnswer>? = null,
    val model: String? = null,
    val usage: TypeSafeUsage? = null
)

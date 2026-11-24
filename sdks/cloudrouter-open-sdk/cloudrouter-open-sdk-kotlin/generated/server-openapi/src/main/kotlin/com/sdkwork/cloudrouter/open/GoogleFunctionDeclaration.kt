package com.sdkwork.cloudrouter.open

data class GoogleFunctionDeclaration(
    val description: String? = null,
    val name: String,
    val parameters: GoogleSchema? = null,
    val response: GoogleSchema? = null
)

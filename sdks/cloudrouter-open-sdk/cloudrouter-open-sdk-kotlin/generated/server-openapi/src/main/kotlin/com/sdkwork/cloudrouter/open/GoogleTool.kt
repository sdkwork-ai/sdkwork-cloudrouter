package com.sdkwork.cloudrouter.open

data class GoogleTool(
    val codeExecution: GoogleCodeExecutionTool? = null,
    val computerUse: Map<String, String>? = null,
    val fileSearch: Map<String, String>? = null,
    val functionDeclarations: List<GoogleFunctionDeclaration>? = null,
    val googleMaps: Map<String, String>? = null,
    val googleSearch: GoogleSearchTool? = null,
    val googleSearchRetrieval: Map<String, String>? = null,
    val mcpServers: List<Map<String, String>>? = null,
    val urlContext: GoogleUrlContextTool? = null
)

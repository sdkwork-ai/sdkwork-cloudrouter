package com.sdkwork.clawrouter.open

data class GoogleTool(
    val codeExecution: GoogleCodeExecutionTool? = null,
    val functionDeclarations: List<GoogleFunctionDeclaration>? = null,
    val googleSearch: GoogleSearchTool? = null,
    val urlContext: GoogleUrlContextTool? = null
)

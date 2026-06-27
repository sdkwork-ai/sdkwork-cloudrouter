package com.sdkwork.clawrouter.open

data class GooglePart(
    val codeExecutionResult: GoogleCodeExecutionResult? = null,
    val executableCode: GoogleExecutableCode? = null,
    val fileData: GoogleFileData? = null,
    val functionCall: GoogleFunctionCall? = null,
    val functionResponse: GoogleFunctionResponse? = null,
    val inlineData: GoogleBlob? = null,
    val text: String? = null
)

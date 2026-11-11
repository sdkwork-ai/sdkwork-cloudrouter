package com.sdkwork.cloudrouter.open

data class GooglePart(
    val audioTranscription: Map<String, String>? = null,
    val codeExecutionResult: GoogleCodeExecutionResult? = null,
    val executableCode: GoogleExecutableCode? = null,
    val fileData: GoogleFileData? = null,
    val functionCall: GoogleFunctionCall? = null,
    val functionResponse: GoogleFunctionResponse? = null,
    val inlineData: GoogleBlob? = null,
    val mediaProcessing: String? = null,
    val mediaResolution: Map<String, String>? = null,
    val partMetadata: Map<String, String>? = null,
    val speechMetadata: Map<String, String>? = null,
    val text: String? = null,
    val thought: Boolean? = null,
    val thoughtSignature: String? = null,
    val toolCall: Map<String, String>? = null,
    val toolResponse: Map<String, String>? = null,
    val videoMetadata: Map<String, String>? = null
)

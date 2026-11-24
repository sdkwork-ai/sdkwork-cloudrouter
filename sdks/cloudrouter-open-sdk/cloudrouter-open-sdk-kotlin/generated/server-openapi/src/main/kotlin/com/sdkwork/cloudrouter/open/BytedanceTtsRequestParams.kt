package com.sdkwork.cloudrouter.open

data class BytedanceTtsRequestParams(
    val additions: String? = null,
    val audioParams: BytedanceTtsAudioParams,
    val model: String? = null,
    val pronunciationDict: Map<String, String>? = null,
    val speaker: String,
    val ssml: String? = null,
    val text: String,
    val tone: List<String>? = null
)

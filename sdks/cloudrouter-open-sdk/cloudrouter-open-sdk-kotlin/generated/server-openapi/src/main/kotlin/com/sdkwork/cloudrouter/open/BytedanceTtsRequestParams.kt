package com.sdkwork.cloudrouter.open

data class BytedanceTtsRequestParams(
    val additions: String? = null,
    val audioParams: BytedanceTtsAudioParams? = null,
    val model: String? = null,
    val pronunciationDict: Map<String, String>? = null,
    val speaker: String? = null,
    val ssml: String? = null,
    val text: String? = null,
    val tone: List<String>? = null
)

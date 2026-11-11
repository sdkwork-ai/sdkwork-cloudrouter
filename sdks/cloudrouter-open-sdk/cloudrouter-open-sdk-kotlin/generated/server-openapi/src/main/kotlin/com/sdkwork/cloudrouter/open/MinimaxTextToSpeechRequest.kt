package com.sdkwork.cloudrouter.open

data class MinimaxTextToSpeechRequest(
    val audioSetting: Map<String, String>? = null,
    val languageBoost: String? = null,
    val model: String? = null,
    val outputFormat: String? = null,
    val pronunciationDict: Map<String, String>? = null,
    val stream: Boolean? = null,
    val streamOptions: MinimaxStreamOptions? = null,
    val subtitleEnable: Boolean? = null,
    val subtitleType: String? = null,
    val text: String? = null,
    val textNormalizationMode: String? = null,
    val timbreWeights: List<MinimaxTimbreWeight>? = null,
    val voiceModify: MinimaxVoiceModify? = null,
    val voiceSetting: Map<String, String>? = null
)

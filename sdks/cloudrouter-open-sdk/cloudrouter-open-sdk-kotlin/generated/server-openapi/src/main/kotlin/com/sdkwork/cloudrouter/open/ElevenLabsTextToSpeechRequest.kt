package com.sdkwork.cloudrouter.open

data class ElevenLabsTextToSpeechRequest(
    val applyLanguageTextNormalization: Boolean? = null,
    val applyTextNormalization: String? = null,
    val audioEffects: ElevenLabsAudioEffects? = null,
    val languageCode: String? = null,
    val modelId: String? = null,
    val nextRequestIds: List<String>? = null,
    val nextText: String? = null,
    val previousRequestIds: List<String>? = null,
    val previousText: String? = null,
    val pronunciationDictionaryLocators: List<ElevenLabsPronunciationDictionaryLocator>? = null,
    val seed: Int? = null,
    val text: String? = null,
    val usePvcAsIvc: Boolean? = null,
    val voiceSettings: ElevenLabsVoiceSettings? = null
)

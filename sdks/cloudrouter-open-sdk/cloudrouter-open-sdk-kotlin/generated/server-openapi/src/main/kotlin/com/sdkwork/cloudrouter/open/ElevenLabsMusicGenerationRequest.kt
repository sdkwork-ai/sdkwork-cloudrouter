package com.sdkwork.cloudrouter.open

data class ElevenLabsMusicGenerationRequest(
    val compositionPlan: ElevenLabsMusicPrompt? = null,
    val finetuneId: String? = null,
    val finetuneStrength: Double? = null,
    val forceInstrumental: Boolean? = null,
    val generationMode: String? = null,
    val lyricsText: String? = null,
    val modelId: String? = null,
    val musicLengthMs: Int? = null,
    val musicPrompt: ElevenLabsMusicPrompt? = null,
    val prompt: String? = null,
    val respectSectionsDurations: Boolean? = null,
    val seed: Int? = null,
    val signWithC2pa: Boolean? = null,
    val storeForInpainting: Boolean? = null,
    val usePhoneticNames: Boolean? = null
)

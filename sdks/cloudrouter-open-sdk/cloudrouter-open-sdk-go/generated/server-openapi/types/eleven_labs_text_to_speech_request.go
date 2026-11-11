package types

// ElevenLabs text-to-speech request (`POST /v1/text-to-speech/{voice_id}`).
type ElevenLabsTextToSpeechRequest struct {
	ApplyLanguageTextNormalization bool `json:"apply_language_text_normalization"`
	ApplyTextNormalization string `json:"apply_text_normalization"`
	AudioEffects ElevenLabsAudioEffects `json:"audio_effects"`
	LanguageCode string `json:"language_code"`
	ModelId string `json:"model_id"`
	NextRequestIds []string `json:"next_request_ids"`
	NextText string `json:"next_text"`
	PreviousRequestIds []string `json:"previous_request_ids"`
	PreviousText string `json:"previous_text"`
	PronunciationDictionaryLocators []ElevenLabsPronunciationDictionaryLocator `json:"pronunciation_dictionary_locators"`
	Seed int `json:"seed"`
	Text string `json:"text"`
	UsePvcAsIvc bool `json:"use_pvc_as_ivc"`
	VoiceSettings ElevenLabsVoiceSettings `json:"voice_settings"`
}

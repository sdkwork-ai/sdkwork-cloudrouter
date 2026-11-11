package types

// ElevenLabs music generation request (`POST /v1/music`). Supply `prompt`, or `composition_plan`, but not both.
type ElevenLabsMusicGenerationRequest struct {
	CompositionPlan ElevenLabsMusicPrompt `json:"composition_plan"`
	FinetuneId string `json:"finetune_id"`
	FinetuneStrength float64 `json:"finetune_strength"`
	ForceInstrumental bool `json:"force_instrumental"`
	GenerationMode string `json:"generation_mode"`
	LyricsText string `json:"lyrics_text"`
	ModelId string `json:"model_id"`
	MusicLengthMs int `json:"music_length_ms"`
	MusicPrompt ElevenLabsMusicPrompt `json:"music_prompt"`
	Prompt string `json:"prompt"`
	RespectSectionsDurations bool `json:"respect_sections_durations"`
	Seed int `json:"seed"`
	SignWithC2pa bool `json:"sign_with_c2pa"`
	StoreForInpainting bool `json:"store_for_inpainting"`
	UsePhoneticNames bool `json:"use_phonetic_names"`
}

package types

// Alibaba DashScope Qwen-Audio-TTS / CosyVoice speech synthesis request.
type AlibabaSpeechRequest struct {
	Input AlibabaSpeechInput `json:"input"`
	Model string `json:"model"`
	Parameters map[string]ProviderJsonValue `json:"parameters"`
}

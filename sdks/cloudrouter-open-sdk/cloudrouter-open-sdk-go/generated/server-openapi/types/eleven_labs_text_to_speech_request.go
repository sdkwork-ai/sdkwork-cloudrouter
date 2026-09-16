package types

// Eleven labs text to speech request schema exposed by Cloud Router.
type ElevenLabsTextToSpeechRequest struct {
	ModelId string `json:"model_id"`
	Text string `json:"text"`
	VoiceSettings map[string]interface{} `json:"voice_settings"`
}

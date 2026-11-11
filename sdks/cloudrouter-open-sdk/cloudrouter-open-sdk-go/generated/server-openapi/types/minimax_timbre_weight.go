package types

// One voice in a mixed-voice TTS request.
type MinimaxTimbreWeight struct {
	VoiceId string `json:"voice_id"`
	Weight int `json:"weight"`
}

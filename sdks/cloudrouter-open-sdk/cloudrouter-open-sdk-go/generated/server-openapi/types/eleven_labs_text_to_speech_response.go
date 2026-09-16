package types

// Eleven labs text to speech response schema exposed by Cloud Router.
type ElevenLabsTextToSpeechResponse struct {
	AudioUrl string `json:"audio_url"`
	Id string `json:"id"`
	Status string `json:"status"`
	Url string `json:"url"`
}

package types

// Eleven labs sound generation response schema exposed by Cloud Router.
type ElevenLabsSoundGenerationResponse struct {
	Audio map[string]interface{} `json:"audio"`
	AudioUrl string `json:"audio_url"`
	Id string `json:"id"`
	Status string `json:"status"`
	Url string `json:"url"`
}

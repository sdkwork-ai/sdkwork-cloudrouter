package types

// Mureka song generation task and its produced audio.
type MurekaMusicGenerationTask struct {
	AudioUrl string `json:"audio_url"`
	Duration int `json:"duration"`
	Error map[string]ProviderJsonValue `json:"error"`
	Id string `json:"id"`
	Status string `json:"status"`
	TaskId string `json:"task_id"`
	Title string `json:"title"`
}

package types

// Jimeng video generation task and its generated video.
type JimengVideoGenerationTask struct {
	CreatedAt int `json:"created_at"`
	Error map[string]ProviderJsonValue `json:"error"`
	Id string `json:"id"`
	Status string `json:"status"`
	TaskId string `json:"task_id"`
	VideoUrl string `json:"video_url"`
}

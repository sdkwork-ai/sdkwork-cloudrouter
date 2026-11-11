package types

// Zhipu asynchronous video/image generation result.
type ZhipuVideoGenerationTask struct {
	Created int `json:"created"`
	Id string `json:"id"`
	ImageResult []ZhipuImageResult `json:"image_result"`
	Model string `json:"model"`
	RequestId string `json:"request_id"`
	TaskStatus string `json:"task_status"`
	VideoResult []ZhipuVideoResult `json:"video_result"`
}

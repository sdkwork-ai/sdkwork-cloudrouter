package types

// Kling image generation request (`POST /v1/images/generations`).
type KlingImageGenerationRequest struct {
	AspectRatio string `json:"aspect_ratio"`
	CallbackUrl string `json:"callback_url"`
	ElementList []KlingElementReference `json:"element_list"`
	ExternalTaskId string `json:"external_task_id"`
	HumanFidelity float64 `json:"human_fidelity"`
	Image string `json:"image"`
	ImageFidelity float64 `json:"image_fidelity"`
	ImageReference string `json:"image_reference"`
	ModelName string `json:"model_name"`
	N int `json:"n"`
	NegativePrompt string `json:"negative_prompt"`
	Prompt string `json:"prompt"`
	Resolution string `json:"resolution"`
	WatermarkInfo KlingWatermarkInfo `json:"watermark_info"`
}

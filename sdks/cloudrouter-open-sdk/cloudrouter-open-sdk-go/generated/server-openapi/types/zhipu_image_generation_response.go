package types

// Zhipu image generation response.
type ZhipuImageGenerationResponse struct {
	ContentFilter []ZhipuContentFilter `json:"content_filter"`
	Created int `json:"created"`
	Data []ZhipuImageResult `json:"data"`
}

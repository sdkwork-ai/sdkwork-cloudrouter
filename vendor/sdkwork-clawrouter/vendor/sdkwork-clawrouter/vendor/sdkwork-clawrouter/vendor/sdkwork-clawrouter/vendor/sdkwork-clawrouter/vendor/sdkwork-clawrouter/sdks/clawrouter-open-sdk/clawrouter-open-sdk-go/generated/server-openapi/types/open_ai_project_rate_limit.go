package types

// OpenAI-compatible project rate limit object.
type OpenAiProjectRateLimit struct {
	Batch1DayMaxInputTokens int `json:"batch_1_day_max_input_tokens"`
	Id string `json:"id"`
	MaxImagesPer1Minute int `json:"max_images_per_1_minute"`
	MaxRequestsPer1Minute int `json:"max_requests_per_1_minute"`
	MaxTokensPer1Minute int `json:"max_tokens_per_1_minute"`
	Model string `json:"model"`
	Object string `json:"object"`
}

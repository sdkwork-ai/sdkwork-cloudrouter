package types

// OpenAI-compatible request to update a project rate limit.
type OpenAiProjectRateLimitUpdateRequest struct {
	Batch1DayMaxInputTokens int `json:"batch_1_day_max_input_tokens"`
	MaxImagesPer1Minute int `json:"max_images_per_1_minute"`
	MaxRequestsPer1Minute int `json:"max_requests_per_1_minute"`
	MaxTokensPer1Minute int `json:"max_tokens_per_1_minute"`
}

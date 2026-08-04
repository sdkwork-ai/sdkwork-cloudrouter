package types

// Token log probability details returned for a completion choice.
type CreateCompletionLogprobs struct {
	TextOffset []int `json:"text_offset"`
	TokenLogprobs []float64 `json:"token_logprobs"`
	Tokens []string `json:"tokens"`
	TopLogprobs []ProviderJsonObject `json:"top_logprobs"`
}

package types

// OpenAI-compatible request to create a legacy text completion.
type OpenAiCompletionCreateRequest struct {
	BestOf int `json:"best_of"`
	Echo bool `json:"echo"`
	FrequencyPenalty float64 `json:"frequency_penalty"`
	LogitBias map[string]float64 `json:"logit_bias"`
	Logprobs int `json:"logprobs"`
	MaxTokens int `json:"max_tokens"`
	Model string `json:"model"`
	N int `json:"n"`
	PresencePenalty float64 `json:"presence_penalty"`
	Prompt string `json:"prompt"`
	Seed int `json:"seed"`
	Stop string `json:"stop"`
	Stream bool `json:"stream"`
	Suffix string `json:"suffix"`
	Temperature float64 `json:"temperature"`
	TopP float64 `json:"top_p"`
	User string `json:"user"`
}

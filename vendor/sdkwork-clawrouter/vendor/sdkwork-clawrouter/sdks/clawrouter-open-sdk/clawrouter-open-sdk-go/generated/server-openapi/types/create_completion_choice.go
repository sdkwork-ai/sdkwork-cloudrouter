package types

// Single choice returned by the legacy OpenAI-compatible completions API.
type CreateCompletionChoice struct {
	FinishReason string `json:"finish_reason"`
	Index int `json:"index"`
	Logprobs CreateCompletionLogprobs `json:"logprobs"`
	Text string `json:"text"`
}

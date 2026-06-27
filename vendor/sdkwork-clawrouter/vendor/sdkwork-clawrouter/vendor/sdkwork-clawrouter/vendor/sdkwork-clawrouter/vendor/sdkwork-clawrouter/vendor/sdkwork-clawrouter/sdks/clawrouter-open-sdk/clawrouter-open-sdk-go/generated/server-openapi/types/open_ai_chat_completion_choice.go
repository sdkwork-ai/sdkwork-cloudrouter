package types

// OpenAI-compatible open ai chat completion choice schema exposed by Claw Router.
type OpenAiChatCompletionChoice struct {
	FinishReason string `json:"finish_reason"`
	Index int `json:"index"`
	Logprobs OpenAiChoiceLogprobs `json:"logprobs"`
	Message OpenAiChatMessage `json:"message"`
}

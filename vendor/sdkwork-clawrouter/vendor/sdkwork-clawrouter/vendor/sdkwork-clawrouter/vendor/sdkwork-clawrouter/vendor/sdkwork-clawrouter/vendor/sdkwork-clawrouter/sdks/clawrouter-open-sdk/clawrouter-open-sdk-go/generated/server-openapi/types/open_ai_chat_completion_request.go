package types

// OpenAI-compatible open ai chat completion request schema exposed by Claw Router.
type OpenAiChatCompletionRequest struct {
	Audio OpenAiChatAudioConfig `json:"audio"`
	FrequencyPenalty float64 `json:"frequency_penalty"`
	FunctionCall OpenAiFunctionCallChoice `json:"function_call"`
	Functions []OpenAiFunctionDefinition `json:"functions"`
	LogitBias map[string]float64 `json:"logit_bias"`
	Logprobs bool `json:"logprobs"`
	MaxCompletionTokens int `json:"max_completion_tokens"`
	MaxTokens int `json:"max_tokens"`
	Messages []OpenAiChatMessage `json:"messages"`
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Modalities []string `json:"modalities"`
	Model string `json:"model"`
	N int `json:"n"`
	ParallelToolCalls bool `json:"parallel_tool_calls"`
	Prediction OpenAiPredictionConfig `json:"prediction"`
	PresencePenalty float64 `json:"presence_penalty"`
	ReasoningEffort string `json:"reasoning_effort"`
	ResponseFormat OpenAiResponseFormat `json:"response_format"`
	Seed int `json:"seed"`
	ServiceTier string `json:"service_tier"`
	Stop string `json:"stop"`
	Store bool `json:"store"`
	Stream bool `json:"stream"`
	StreamOptions OpenAiStreamOptions `json:"stream_options"`
	Temperature float64 `json:"temperature"`
	ToolChoice OpenAiToolChoice `json:"tool_choice"`
	Tools []OpenAiTool `json:"tools"`
	TopLogprobs int `json:"top_logprobs"`
	TopP float64 `json:"top_p"`
	User string `json:"user"`
}

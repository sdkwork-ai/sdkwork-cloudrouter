package types

// OpenAI-compatible open ai completion tokens details schema exposed by Claw Router.
type OpenAiCompletionTokensDetails struct {
	AcceptedPredictionTokens int `json:"accepted_prediction_tokens"`
	AudioTokens int `json:"audio_tokens"`
	ReasoningTokens int `json:"reasoning_tokens"`
	RejectedPredictionTokens int `json:"rejected_prediction_tokens"`
}

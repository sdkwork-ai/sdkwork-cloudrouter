package types

// OpenAI-compatible open ai choice logprobs schema exposed by Claw Router.
type OpenAiChoiceLogprobs struct {
	Content []OpenAiTokenLogprob `json:"content"`
	Refusal []OpenAiTokenLogprob `json:"refusal"`
}

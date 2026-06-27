package types

// OpenAI-compatible open ai token logprob schema exposed by Claw Router.
type OpenAiTokenLogprob struct {
	Bytes []int `json:"bytes"`
	Logprob float64 `json:"logprob"`
	Token string `json:"token"`
	TopLogprobs []OpenAiTopLogprob `json:"top_logprobs"`
}

package types

// OpenAI-compatible open ai top logprob schema exposed by Cloud Router.
type OpenAiTopLogprob struct {
	Bytes []int `json:"bytes"`
	Logprob float64 `json:"logprob"`
	Token string `json:"token"`
}

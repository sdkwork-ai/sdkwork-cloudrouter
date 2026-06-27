package types

// OpenAI-compatible open ai chat image url schema exposed by Claw Router.
type OpenAiChatImageUrl struct {
	Detail string `json:"detail"`
	Url string `json:"url"`
}

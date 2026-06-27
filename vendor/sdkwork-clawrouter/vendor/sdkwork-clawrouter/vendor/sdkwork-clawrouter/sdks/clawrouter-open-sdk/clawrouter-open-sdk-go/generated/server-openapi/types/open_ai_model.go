package types

// OpenAI-compatible open ai model schema exposed by Claw Router.
type OpenAiModel struct {
	Created int `json:"created"`
	Id string `json:"id"`
	Object string `json:"object"`
	OwnedBy string `json:"owned_by"`
}

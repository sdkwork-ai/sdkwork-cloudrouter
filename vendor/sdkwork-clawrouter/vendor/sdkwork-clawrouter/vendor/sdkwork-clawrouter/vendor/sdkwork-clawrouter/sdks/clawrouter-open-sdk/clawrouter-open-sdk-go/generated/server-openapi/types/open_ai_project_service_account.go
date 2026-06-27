package types

// OpenAI-compatible project service account object.
type OpenAiProjectServiceAccount struct {
	ApiKey OpenAiProjectApiKey `json:"api_key"`
	CreatedAt int `json:"created_at"`
	Id string `json:"id"`
	Name string `json:"name"`
	Object string `json:"object"`
	Role string `json:"role"`
}

package types

// OpenAI-compatible open ai response schema exposed by Claw Router.
type OpenAiResponse struct {
	CreatedAt int `json:"created_at"`
	Error OpenAiResponseError `json:"error"`
	Id string `json:"id"`
	IncompleteDetails OpenAiIncompleteDetails `json:"incomplete_details"`
	Model string `json:"model"`
	Object string `json:"object"`
	Output []OpenAiResponseOutputItem `json:"output"`
	OutputText string `json:"output_text"`
	Status string `json:"status"`
	Usage OpenAiResponseUsage `json:"usage"`
}

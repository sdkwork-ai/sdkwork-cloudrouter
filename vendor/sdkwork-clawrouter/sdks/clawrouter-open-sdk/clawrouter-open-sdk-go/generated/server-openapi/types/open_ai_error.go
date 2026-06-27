package types

// OpenAI-compatible open ai error schema exposed by Claw Router.
type OpenAiError struct {
	Code string `json:"code"`
	Message string `json:"message"`
	Param string `json:"param"`
	Path string `json:"path"`
	Type string `json:"type"`
}

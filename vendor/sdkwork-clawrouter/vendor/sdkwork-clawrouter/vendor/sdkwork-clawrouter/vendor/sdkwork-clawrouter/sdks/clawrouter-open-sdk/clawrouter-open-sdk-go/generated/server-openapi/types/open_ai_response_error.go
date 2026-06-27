package types

// OpenAI-compatible open ai response error schema exposed by Claw Router.
type OpenAiResponseError struct {
	Code string `json:"code"`
	Message string `json:"message"`
	Param string `json:"param"`
	Type string `json:"type"`
}

package types

// OpenAI-compatible open ai response output content schema exposed by Claw Router.
type OpenAiResponseOutputContent struct {
	Annotations []OpenAiAnnotation `json:"annotations"`
	Refusal string `json:"refusal"`
	Text string `json:"text"`
	Type string `json:"type"`
}

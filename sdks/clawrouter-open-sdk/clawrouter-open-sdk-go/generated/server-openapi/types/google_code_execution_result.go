package types

// Google Gemini google code execution result schema exposed by Claw Router vendor routing.
type GoogleCodeExecutionResult struct {
	Outcome string `json:"outcome"`
	Output string `json:"output"`
}

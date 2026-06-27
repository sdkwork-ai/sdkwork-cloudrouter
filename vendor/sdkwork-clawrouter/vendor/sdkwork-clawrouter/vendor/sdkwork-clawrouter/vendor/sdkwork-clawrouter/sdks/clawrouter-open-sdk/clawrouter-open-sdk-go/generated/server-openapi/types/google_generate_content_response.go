package types

// Google Gemini google generate content response schema exposed by Claw Router vendor routing.
type GoogleGenerateContentResponse struct {
	Candidates []GoogleCandidate `json:"candidates"`
	ModelVersion string `json:"modelVersion"`
	PromptFeedback GooglePromptFeedback `json:"promptFeedback"`
	ResponseId string `json:"responseId"`
	UsageMetadata GoogleUsageMetadata `json:"usageMetadata"`
}

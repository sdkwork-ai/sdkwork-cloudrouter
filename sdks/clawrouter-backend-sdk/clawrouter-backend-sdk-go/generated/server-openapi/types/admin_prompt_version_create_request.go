package types

// Admin prompt version create request schema exposed by Claw Router.
type AdminPromptVersionCreateRequest struct {
	Content string `json:"content"`
	ExamplesJson []map[string]JsonValue `json:"examplesJson"`
	ModelConstraints map[string]JsonValue `json:"modelConstraints"`
	OutputSchema map[string]JsonValue `json:"outputSchema"`
	SafetyPolicy map[string]JsonValue `json:"safetyPolicy"`
	Title string `json:"title"`
	VariableSchema map[string]JsonValue `json:"variableSchema"`
	VersionNo string `json:"versionNo"`
}

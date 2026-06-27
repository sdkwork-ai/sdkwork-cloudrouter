package types

// Admin ai models response schema exposed by Claw Router.
type AdminAiModelsResponse struct {
	Items []AdminAiModelItem `json:"items"`
}

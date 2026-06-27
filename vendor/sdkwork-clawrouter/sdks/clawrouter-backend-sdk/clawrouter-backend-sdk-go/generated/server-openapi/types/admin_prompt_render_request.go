package types

// Admin prompt render request schema exposed by Claw Router.
type AdminPromptRenderRequest struct {
	Variables map[string]JsonValue `json:"variables"`
}

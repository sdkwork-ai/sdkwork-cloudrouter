package types

// Type safe system one response schema exposed by Cloud Router.
type TypeSafeSystemOneResponse struct {
	Answers map[string]TypeSafeAnswer `json:"answers"`
	Model string `json:"model"`
	Usage TypeSafeUsage `json:"usage"`
}

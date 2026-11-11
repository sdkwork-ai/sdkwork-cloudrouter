package types

// Type safe system one request schema exposed by Cloud Router.
type TypeSafeSystemOneRequest struct {
	Model string `json:"model"`
	Questions map[string]TypeSafeQuestion `json:"questions"`
	State ProviderJsonValue `json:"state"`
}

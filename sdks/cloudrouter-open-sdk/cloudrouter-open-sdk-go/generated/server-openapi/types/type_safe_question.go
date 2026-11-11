package types

// Type safe question schema exposed by Cloud Router.
type TypeSafeQuestion struct {
	Criteria ProviderJsonValue `json:"criteria"`
	Instructions string `json:"instructions"`
	Type string `json:"type"`
}

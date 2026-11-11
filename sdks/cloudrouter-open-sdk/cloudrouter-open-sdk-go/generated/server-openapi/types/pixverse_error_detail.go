package types

// PixVerse supplemental error detail.
type PixverseErrorDetail struct {
	Message string `json:"Message"`
	Param map[string]ProviderJsonValue `json:"Param"`
	Type string `json:"Type"`
}

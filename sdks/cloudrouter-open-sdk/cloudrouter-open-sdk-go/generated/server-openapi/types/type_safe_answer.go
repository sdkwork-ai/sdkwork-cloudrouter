package types

// Type safe answer schema exposed by Cloud Router.
type TypeSafeAnswer struct {
	Choice string `json:"choice"`
	Confidence float64 `json:"confidence"`
	Legend map[string]string `json:"legend"`
	Noul float64 `json:"noul"`
	Probabilities map[string]float64 `json:"probabilities"`
	Score float64 `json:"score"`
	Type string `json:"type"`
}

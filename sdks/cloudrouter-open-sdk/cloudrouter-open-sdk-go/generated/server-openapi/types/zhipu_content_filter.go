package types

// Zhipu content-safety verdict.
type ZhipuContentFilter struct {
	Level int `json:"level"`
	Role string `json:"role"`
}

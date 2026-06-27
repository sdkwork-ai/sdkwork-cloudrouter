package types

// Field-level validation problem detail.
type FieldError struct {
	Code string `json:"code"`
	Field string `json:"field"`
	Message string `json:"message"`
}

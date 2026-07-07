package types


type FieldError struct {
	Code int `json:"code"`
	Field string `json:"field"`
	Message string `json:"message"`
}

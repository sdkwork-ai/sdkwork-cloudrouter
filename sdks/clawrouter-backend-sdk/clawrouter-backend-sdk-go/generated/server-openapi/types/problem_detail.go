package types

// RFC 9457 problem details error response.
type ProblemDetail struct {
	Code string `json:"code"`
	Detail string `json:"detail"`
	Errors []FieldError `json:"errors"`
	Instance string `json:"instance"`
	RequestId string `json:"requestId"`
	Status int `json:"status"`
	Title string `json:"title"`
	TraceId string `json:"traceId"`
	Type string `json:"type"`
}

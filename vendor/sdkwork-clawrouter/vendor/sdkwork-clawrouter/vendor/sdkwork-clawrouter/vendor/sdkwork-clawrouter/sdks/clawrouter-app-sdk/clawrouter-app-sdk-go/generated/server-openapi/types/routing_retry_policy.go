package types

// Routing retry policy schema exposed by Claw Router.
type RoutingRetryPolicy struct {
	BackoffMs string `json:"backoffMs"`
	MaxAttempts string `json:"maxAttempts"`
	RetryableStatusCodes []string `json:"retryableStatusCodes"`
}

package types

// Provider retry policy schema exposed by Claw Router.
type ProviderRetryPolicy struct {
	BackoffMs int `json:"backoffMs"`
	MaxAttempts int `json:"maxAttempts"`
	RetryableStatusCodes []int `json:"retryableStatusCodes"`
}

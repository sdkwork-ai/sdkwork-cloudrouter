package types

// Provider circuit breaker policy schema exposed by Claw Router.
type ProviderCircuitBreakerPolicy struct {
	FailureThreshold int `json:"failureThreshold"`
}

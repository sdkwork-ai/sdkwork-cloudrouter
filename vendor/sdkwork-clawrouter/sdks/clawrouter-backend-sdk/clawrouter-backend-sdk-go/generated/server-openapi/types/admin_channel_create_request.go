package types

// Admin channel create request schema exposed by Claw Router.
type AdminChannelCreateRequest struct {
	AccessType string `json:"accessType"`
	Capabilities []string `json:"capabilities"`
	ChannelType string `json:"channelType"`
	CircuitBreakerPolicy ProviderCircuitBreakerPolicy `json:"circuitBreakerPolicy"`
	CredentialRotation string `json:"credentialRotation"`
	Credentials []AdminChannelCredentialInput `json:"credentials"`
	ExpiresAt string `json:"expiresAt"`
	Name string `json:"name"`
	Protocol string `json:"protocol"`
	ResourceCodes []string `json:"resourceCodes"`
	RetryPolicy ProviderRetryPolicy `json:"retryPolicy"`
	Status string `json:"status"`
	TimeoutMs string `json:"timeoutMs"`
	Vendor string `json:"vendor"`
	Weight string `json:"weight"`
}

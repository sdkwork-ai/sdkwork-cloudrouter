package types

// Persisted channel snapshot returned after the provider health probe. Admin management responses may return the stored plaintext provider API key for channel credential relay operations.
type AdminChannelItem struct {
	AccessType string `json:"accessType"`
	Balance string `json:"balance"`
	Capabilities []string `json:"capabilities"`
	ChannelId string `json:"channelId"`
	ChannelType string `json:"channelType"`
	CircuitBreakerPolicy ProviderCircuitBreakerPolicy `json:"circuitBreakerPolicy"`
	CreatedAt string `json:"createdAt"`
	CredentialRotation string `json:"credentialRotation"`
	Credentials []AdminChannelCredentialItem `json:"credentials"`
	Errors string `json:"errors"`
	ExpiresAt string `json:"expiresAt"`
	Id string `json:"id"`
	IsMultimodal bool `json:"isMultimodal"`
	Name string `json:"name"`
	Protocol string `json:"protocol"`
	ResourceCodes []string `json:"resourceCodes"`
	RetryPolicy ProviderRetryPolicy `json:"retryPolicy"`
	Status string `json:"status"`
	TimeoutMs string `json:"timeoutMs"`
	Vendor string `json:"vendor"`
	Weight string `json:"weight"`
}

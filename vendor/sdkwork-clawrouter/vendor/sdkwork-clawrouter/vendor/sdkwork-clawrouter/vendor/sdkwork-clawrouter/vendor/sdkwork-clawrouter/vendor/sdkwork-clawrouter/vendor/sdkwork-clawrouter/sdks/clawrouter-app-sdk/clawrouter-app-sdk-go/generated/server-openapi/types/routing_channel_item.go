package types

// Routing channel item schema exposed by Claw Router.
type RoutingChannelItem struct {
	AccessType string `json:"accessType"`
	ApiKey string `json:"apiKey"`
	Balance string `json:"balance"`
	BaseUrl string `json:"baseUrl"`
	Capabilities []string `json:"capabilities"`
	CircuitBreakerPolicy RoutingCircuitBreakerPolicy `json:"circuitBreakerPolicy"`
	Errors string `json:"errors"`
	Id string `json:"id"`
	IsMultimodal bool `json:"isMultimodal"`
	Latency string `json:"latency"`
	Models []string `json:"models"`
	Name string `json:"name"`
	Protocol string `json:"protocol"`
	Provider string `json:"provider"`
	ProviderCode string `json:"providerCode"`
	RetryPolicy RoutingRetryPolicy `json:"retryPolicy"`
	Rpm string `json:"rpm"`
	Status string `json:"status"`
	TimeoutMs string `json:"timeoutMs"`
	Vendor string `json:"vendor"`
	Weight string `json:"weight"`
}

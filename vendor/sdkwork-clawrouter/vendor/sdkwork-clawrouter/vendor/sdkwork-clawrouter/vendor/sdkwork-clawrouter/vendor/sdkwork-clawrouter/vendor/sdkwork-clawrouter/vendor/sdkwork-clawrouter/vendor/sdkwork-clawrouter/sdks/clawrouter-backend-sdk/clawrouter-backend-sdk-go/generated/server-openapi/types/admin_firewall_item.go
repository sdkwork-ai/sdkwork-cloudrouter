package types

// Persisted firewall rule snapshot returned by the backend.
type AdminFirewallItem struct {
	Id string `json:"id"`
	Reason string `json:"reason"`
	Time string `json:"time"`
	Type string `json:"type"`
	Value string `json:"value"`
}

package types

// Admin dashboard recent usage item schema exposed by Claw Router.
type AdminDashboardRecentUsageItem struct {
	BillingMode string `json:"billingMode"`
	Cost string `json:"cost"`
	Id string `json:"id"`
	IsApiUser bool `json:"isApiUser"`
	Model string `json:"model"`
	Status string `json:"status"`
	Time string `json:"time"`
	Type string `json:"type"`
	UsageCount float64 `json:"usageCount"`
	UsageIn float64 `json:"usageIn"`
	UsageOut float64 `json:"usageOut"`
	User string `json:"user"`
}

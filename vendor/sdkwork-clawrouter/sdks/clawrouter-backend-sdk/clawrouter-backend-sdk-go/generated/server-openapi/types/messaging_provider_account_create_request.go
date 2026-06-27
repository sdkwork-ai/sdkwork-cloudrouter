package types

// Messaging provider account create request schema exposed by Claw Router.
type MessagingProviderAccountCreateRequest struct {
	AccountCode string `json:"accountCode"`
	AccountName string `json:"accountName"`
	BaseUrl string `json:"baseUrl"`
	CapabilitySchema map[string]JsonValue `json:"capabilitySchema"`
	Channel string `json:"channel"`
	Credential map[string]interface{} `json:"credential"`
	DeliveryPurpose string `json:"deliveryPurpose"`
	ProviderCode string `json:"providerCode"`
}

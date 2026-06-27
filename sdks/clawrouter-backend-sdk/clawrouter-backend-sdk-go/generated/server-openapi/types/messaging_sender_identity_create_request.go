package types

// Messaging sender identity create request schema exposed by Claw Router.
type MessagingSenderIdentityCreateRequest struct {
	Channel string `json:"channel"`
	CountryCode string `json:"countryCode"`
	DisplayName string `json:"displayName"`
	DomainName string `json:"domainName"`
	FromEmail string `json:"fromEmail"`
	FromName string `json:"fromName"`
	IdentityCode string `json:"identityCode"`
	ProviderAccountId string `json:"providerAccountId"`
	ReplyTo string `json:"replyTo"`
	SenderId string `json:"senderId"`
	SignName string `json:"signName"`
}

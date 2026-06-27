package types

// Messaging test send response schema exposed by Claw Router.
type MessagingTestSendResponse struct {
	DeliveryStatus string `json:"deliveryStatus"`
	ProviderCode string `json:"providerCode"`
	RequestId string `json:"requestId"`
}

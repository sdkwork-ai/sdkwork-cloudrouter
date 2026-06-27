package api

import (
    sdktypes "github.com/sdkwork/clawrouter-open-sdk/types"
    sdkhttp "github.com/sdkwork/clawrouter-open-sdk/http"
)

type ChatAnthropicApi struct {
    client *sdkhttp.Client
}

func NewChatAnthropicApi(client *sdkhttp.Client) *ChatAnthropicApi {
    return &ChatAnthropicApi{client: client}
}

// Anthropic Claude message
func (a *ChatAnthropicApi) CreateV1Message(body sdktypes.AnthropicMessageCreateRequest) (sdktypes.AnthropicMessage, error) {
    raw, err := a.client.Post(AiApiPath("/anthropic/v1/messages"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.AnthropicMessage
        return zero, err
    }
    return decodeResult[sdktypes.AnthropicMessage](raw)
}

// Anthropic count message tokens
func (a *ChatAnthropicApi) CreateV1MessagesCountToken(body sdktypes.AnthropicCountMessageTokensRequest) (sdktypes.AnthropicCountMessageTokensResponse, error) {
    raw, err := a.client.Post(AiApiPath("/anthropic/v1/messages/count_tokens"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.AnthropicCountMessageTokensResponse
        return zero, err
    }
    return decodeResult[sdktypes.AnthropicCountMessageTokensResponse](raw)
}

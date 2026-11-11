package api

import (
    sdktypes "github.com/sdkwork/cloudrouter-open-sdk/types"
    sdkhttp "github.com/sdkwork/cloudrouter-open-sdk/http"
)

type ToolApi struct {
    client *sdkhttp.Client
}

func NewToolApi(client *sdkhttp.Client) *ToolApi {
    return &ToolApi{client: client}
}

// Fetch a web page
func (a *ToolApi) CreateFetch(body sdktypes.OpenAiDeepSeekWebFetchRequest) (sdktypes.OpenAiDeepSeekWebFetchResponse, error) {
    raw, err := a.client.Post(AiApiPath("/tools/fetch"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.OpenAiDeepSeekWebFetchResponse
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiDeepSeekWebFetchResponse](raw)
}

// Search the web
func (a *ToolApi) Search(body sdktypes.OpenAiDeepSeekWebSearchRequest) (sdktypes.OpenAiDeepSeekWebSearchResponse, error) {
    raw, err := a.client.Post(AiApiPath("/tools/search"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.OpenAiDeepSeekWebSearchResponse
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiDeepSeekWebSearchResponse](raw)
}

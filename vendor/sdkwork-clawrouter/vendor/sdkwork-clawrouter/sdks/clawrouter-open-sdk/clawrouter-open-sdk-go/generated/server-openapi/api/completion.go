package api

import (
    sdktypes "github.com/sdkwork/clawrouter-open-sdk/types"
    sdkhttp "github.com/sdkwork/clawrouter-open-sdk/http"
)

type CompletionApi struct {
    client *sdkhttp.Client
}

func NewCompletionApi(client *sdkhttp.Client) *CompletionApi {
    return &CompletionApi{client: client}
}

// Create completion
func (a *CompletionApi) Create(body sdktypes.OpenAiCompletionCreateRequest) (sdktypes.OpenAiCompletion, error) {
    raw, err := a.client.Post(AiApiPath("/completions"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.OpenAiCompletion
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiCompletion](raw)
}

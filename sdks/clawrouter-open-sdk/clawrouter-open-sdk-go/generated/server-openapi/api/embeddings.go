package api

import (
    sdktypes "github.com/sdkwork/clawrouter-open-sdk/types"
    sdkhttp "github.com/sdkwork/clawrouter-open-sdk/http"
)

type EmbeddingsApi struct {
    client *sdkhttp.Client
}

func NewEmbeddingsApi(client *sdkhttp.Client) *EmbeddingsApi {
    return &EmbeddingsApi{client: client}
}

// Create embeddings
func (a *EmbeddingsApi) Create(body sdktypes.OpenAiEmbeddingsRequest) (sdktypes.OpenAiEmbeddingList, error) {
    raw, err := a.client.Post(AiApiPath("/embeddings"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.OpenAiEmbeddingList
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiEmbeddingList](raw)
}

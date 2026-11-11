package api

import (
    sdktypes "github.com/sdkwork/cloudrouter-open-sdk/types"
    sdkhttp "github.com/sdkwork/cloudrouter-open-sdk/http"
)

type ImagesMinimaxApi struct {
    client *sdkhttp.Client
}

func NewImagesMinimaxApi(client *sdkhttp.Client) *ImagesMinimaxApi {
    return &ImagesMinimaxApi{client: client}
}

// MiniMax image generation
func (a *ImagesMinimaxApi) CreateV1ImageGeneration(body sdktypes.MinimaxImageGenerationRequest) (sdktypes.MinimaxImageGenerationResponse, error) {
    raw, err := a.client.Post("/minimax/v1/image_generation", body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.MinimaxImageGenerationResponse
        return zero, err
    }
    return decodeResult[sdktypes.MinimaxImageGenerationResponse](raw)
}

package api

import (
    sdktypes "github.com/sdkwork/cloudrouter-open-sdk/types"
    sdkhttp "github.com/sdkwork/cloudrouter-open-sdk/http"
)

type ImagesZhipuApi struct {
    client *sdkhttp.Client
}

func NewImagesZhipuApi(client *sdkhttp.Client) *ImagesZhipuApi {
    return &ImagesZhipuApi{client: client}
}

// Zhipu CogView image generation
func (a *ImagesZhipuApi) CreateApiPaasV4ImagesGeneration(body sdktypes.ZhipuImageGenerationRequest) (sdktypes.ZhipuImageGenerationResponse, error) {
    raw, err := a.client.Post("/zhipu/api/paas/v4/images/generations", body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.ZhipuImageGenerationResponse
        return zero, err
    }
    return decodeResult[sdktypes.ZhipuImageGenerationResponse](raw)
}

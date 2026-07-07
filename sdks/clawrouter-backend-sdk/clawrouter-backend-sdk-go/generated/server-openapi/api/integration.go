package api

import (
    "fmt"
    "net/url"
    "strings"
    sdktypes "github.com/sdkwork/clawrouter-backend-sdk/types"
    sdkhttp "github.com/sdkwork/clawrouter-backend-sdk/http"
)

type IntegrationApi struct {
    client *sdkhttp.Client
}

func NewIntegrationApi(client *sdkhttp.Client) *IntegrationApi {
    return &IntegrationApi{client: client}
}

// List
func (a *IntegrationApi) ChannelsList() (sdktypes.ChannelsListResult, error) {
    raw, err := a.client.Get(BackendApiPath("/integration/channels"), nil, nil)
    if err != nil {
        var zero sdktypes.ChannelsListResult
        return zero, err
    }
    return decodeResult[sdktypes.ChannelsListResult](raw)
}

// Create
func (a *IntegrationApi) ChannelsCreate() (sdktypes.ChannelsCreateResult, error) {
    raw, err := a.client.Post(BackendApiPath("/integration/channels"), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ChannelsCreateResult
        return zero, err
    }
    return decodeResult[sdktypes.ChannelsCreateResult](raw)
}

// Update
func (a *IntegrationApi) ChannelsUpdate() (sdktypes.ChannelsUpdateResult, error) {
    raw, err := a.client.Put(BackendApiPath("/integration/channels"), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ChannelsUpdateResult
        return zero, err
    }
    return decodeResult[sdktypes.ChannelsUpdateResult](raw)
}

// Delete
func (a *IntegrationApi) ChannelsDelete(channelId string) (sdktypes.ChannelsDeleteResult, error) {
    raw, err := a.client.Delete(BackendApiPath(fmt.Sprintf("/integration/channels/%s", SerializePathParameter(channelId, PathParameterSpec{Name: "channelId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.ChannelsDeleteResult
        return zero, err
    }
    return decodeResult[sdktypes.ChannelsDeleteResult](raw)
}

// Verify
func (a *IntegrationApi) ChannelsVerify(channelId string) (sdktypes.ChannelsVerifyResult, error) {
    raw, err := a.client.Post(BackendApiPath(fmt.Sprintf("/integration/channels/%s/verify", SerializePathParameter(channelId, PathParameterSpec{Name: "channelId", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ChannelsVerifyResult
        return zero, err
    }
    return decodeResult[sdktypes.ChannelsVerifyResult](raw)
}

// List
func (a *IntegrationApi) ProviderSecretsList() (sdktypes.ProviderSecretsListResult, error) {
    raw, err := a.client.Get(BackendApiPath("/integration/provider_secrets"), nil, nil)
    if err != nil {
        var zero sdktypes.ProviderSecretsListResult
        return zero, err
    }
    return decodeResult[sdktypes.ProviderSecretsListResult](raw)
}

// Create
func (a *IntegrationApi) ProviderSecretsCreate() (sdktypes.ProviderSecretsCreateResult, error) {
    raw, err := a.client.Post(BackendApiPath("/integration/provider_secrets"), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ProviderSecretsCreateResult
        return zero, err
    }
    return decodeResult[sdktypes.ProviderSecretsCreateResult](raw)
}

// Update
func (a *IntegrationApi) ProviderSecretsUpdate() (sdktypes.ProviderSecretsUpdateResult, error) {
    raw, err := a.client.Put(BackendApiPath("/integration/provider_secrets"), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ProviderSecretsUpdateResult
        return zero, err
    }
    return decodeResult[sdktypes.ProviderSecretsUpdateResult](raw)
}

// Delete
func (a *IntegrationApi) ProviderSecretsDelete(secretId string) (sdktypes.ProviderSecretsDeleteResult, error) {
    raw, err := a.client.Delete(BackendApiPath(fmt.Sprintf("/integration/provider_secrets/%s", SerializePathParameter(secretId, PathParameterSpec{Name: "secretId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.ProviderSecretsDeleteResult
        return zero, err
    }
    return decodeResult[sdktypes.ProviderSecretsDeleteResult](raw)
}

type PathParameterSpec struct {
    Name    string
    Style   string
    Explode bool
}

func SerializePathParameter(value interface{}, spec PathParameterSpec) string {
    if value == nil {
        return ""
    }
    style := spec.Style
    if style == "" {
        style = "simple"
    }

    switch typed := value.(type) {
    case []string:
        return SerializePathArray(spec.Name, stringSliceToInterface(typed), style, spec.Explode)
    case []int:
        return SerializePathArray(spec.Name, intSliceToInterface(typed), style, spec.Explode)
    case []interface{}:
        return SerializePathArray(spec.Name, typed, style, spec.Explode)
    case map[string]string:
        return SerializePathObject(spec.Name, stringMapToInterface(typed), style, spec.Explode)
    case map[string]int:
        return SerializePathObject(spec.Name, intMapToInterface(typed), style, spec.Explode)
    case map[string]interface{}:
        return SerializePathObject(spec.Name, typed, style, spec.Explode)
    default:
        return PathPrefix(spec.Name, style) + url.PathEscape(fmt.Sprint(value))
    }
}

func SerializePathArray(name string, values []interface{}, style string, explode bool) string {
    serialized := make([]string, 0, len(values))
    for _, item := range values {
        if item != nil {
            serialized = append(serialized, url.PathEscape(fmt.Sprint(item)))
        }
    }
    if len(serialized) == 0 {
        return PathPrefix(name, style)
    }
    if style == "matrix" {
        if explode {
            parts := make([]string, 0, len(serialized))
            for _, item := range serialized {
                parts = append(parts, ";"+name+"="+item)
            }
            return strings.Join(parts, "")
        }
        return ";" + name + "=" + strings.Join(serialized, ",")
    }
    separator := ","
    if explode {
        separator = "."
    }
    return PathPrefix(name, style) + strings.Join(serialized, separator)
}

func SerializePathObject(name string, values map[string]interface{}, style string, explode bool) string {
    entries := make([]string, 0, len(values)*2)
    exploded := make([]string, 0, len(values))
    for key, value := range values {
        if value == nil {
            continue
        }
        escapedKey := url.PathEscape(key)
        escapedValue := url.PathEscape(fmt.Sprint(value))
        if explode {
            if style == "matrix" {
                exploded = append(exploded, ";"+escapedKey+"="+escapedValue)
            } else {
                exploded = append(exploded, escapedKey+"="+escapedValue)
            }
        } else {
            entries = append(entries, escapedKey, escapedValue)
        }
    }
    if style == "matrix" {
        if explode {
            return strings.Join(exploded, "")
        }
        return ";" + name + "=" + strings.Join(entries, ",")
    }
    if explode {
        separator := ","
        if style == "label" {
            separator = "."
        }
        return PathPrefix(name, style) + strings.Join(exploded, separator)
    }
    return PathPrefix(name, style) + strings.Join(entries, ",")
}

func PathPrefix(name string, style string) string {
    if style == "label" {
        return "."
    }
    if style == "matrix" {
        return ";" + name
    }
    return ""
}


func stringSliceToInterface(values []string) []interface{} {
    result := make([]interface{}, 0, len(values))
    for _, value := range values {
        result = append(result, value)
    }
    return result
}

func intSliceToInterface(values []int) []interface{} {
    result := make([]interface{}, 0, len(values))
    for _, value := range values {
        result = append(result, value)
    }
    return result
}

func stringMapToInterface(values map[string]string) map[string]interface{} {
    result := make(map[string]interface{}, len(values))
    for key, value := range values {
        result[key] = value
    }
    return result
}

func intMapToInterface(values map[string]int) map[string]interface{} {
    result := make(map[string]interface{}, len(values))
    for key, value := range values {
        result[key] = value
    }
    return result
}

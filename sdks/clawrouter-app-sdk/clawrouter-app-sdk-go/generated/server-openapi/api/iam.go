package api

import (
    "fmt"
    "net/url"
    "strings"
    sdktypes "github.com/sdkwork/clawrouter-app-sdk/types"
    sdkhttp "github.com/sdkwork/clawrouter-app-sdk/http"
)

type IamApi struct {
    client *sdkhttp.Client
}

func NewIamApi(client *sdkhttp.Client) *IamApi {
    return &IamApi{client: client}
}

// List
func (a *IamApi) ApiKeysList() (sdktypes.ApiKeysListResult, error) {
    raw, err := a.client.Get(AppApiPath("/iam/api_keys"), nil, nil)
    if err != nil {
        var zero sdktypes.ApiKeysListResult
        return zero, err
    }
    return decodeResult[sdktypes.ApiKeysListResult](raw)
}

// Create
func (a *IamApi) ApiKeysCreate() (sdktypes.ApiKeysCreateResult, error) {
    raw, err := a.client.Post(AppApiPath("/iam/api_keys"), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ApiKeysCreateResult
        return zero, err
    }
    return decodeResult[sdktypes.ApiKeysCreateResult](raw)
}

// Delete
func (a *IamApi) ApiKeysDelete(apiKeyId string) (sdktypes.ApiKeysDeleteResult, error) {
    raw, err := a.client.Delete(AppApiPath(fmt.Sprintf("/iam/api_keys/%s", SerializePathParameter(apiKeyId, PathParameterSpec{Name: "apiKeyId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.ApiKeysDeleteResult
        return zero, err
    }
    return decodeResult[sdktypes.ApiKeysDeleteResult](raw)
}

// Update
func (a *IamApi) ApiKeysUpdate(apiKeyId string) (sdktypes.ApiKeysUpdateResult, error) {
    raw, err := a.client.Patch(AppApiPath(fmt.Sprintf("/iam/api_keys/%s", SerializePathParameter(apiKeyId, PathParameterSpec{Name: "apiKeyId", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ApiKeysUpdateResult
        return zero, err
    }
    return decodeResult[sdktypes.ApiKeysUpdateResult](raw)
}

// Retrieve
func (a *IamApi) UsersSettingsRetrieve() (sdktypes.UsersSettingsRetrieveResult, error) {
    raw, err := a.client.Get(AppApiPath("/iam/users/settings"), nil, nil)
    if err != nil {
        var zero sdktypes.UsersSettingsRetrieveResult
        return zero, err
    }
    return decodeResult[sdktypes.UsersSettingsRetrieveResult](raw)
}

// Update
func (a *IamApi) UsersSettingsUpdate() (sdktypes.UsersSettingsUpdateResult, error) {
    raw, err := a.client.Put(AppApiPath("/iam/users/settings"), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.UsersSettingsUpdateResult
        return zero, err
    }
    return decodeResult[sdktypes.UsersSettingsUpdateResult](raw)
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

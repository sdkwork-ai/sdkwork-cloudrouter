package api

import "strings"

const AI_API_PREFIX = "/v1"

func AiApiPath(path string) string {
    if path == "" {
        return AI_API_PREFIX
    }
    if strings.HasPrefix(path, "http://") || strings.HasPrefix(path, "https://") {
        return path
    }

    normalizedPrefix := strings.TrimSpace(AI_API_PREFIX)
    if normalizedPrefix != "" && normalizedPrefix != "/" {
        normalizedPrefix = "/" + strings.Trim(normalizedPrefix, "/")
    } else {
        normalizedPrefix = ""
    }

    normalizedPath := path
    if !strings.HasPrefix(normalizedPath, "/") {
        normalizedPath = "/" + normalizedPath
    }

    if normalizedPrefix == "" {
        return normalizedPath
    }
    if normalizedPath == normalizedPrefix || strings.HasPrefix(normalizedPath, normalizedPrefix+"/") {
        return normalizedPath
    }
    return normalizedPrefix + normalizedPath
}

func AppendQueryString(path string, rawQueryString string) string {
    query := strings.TrimLeft(rawQueryString, "?")
    if query == "" {
        return path
    }
    if strings.Contains(path, "?") {
        return path + "&" + query
    }
    return path + "?" + query
}

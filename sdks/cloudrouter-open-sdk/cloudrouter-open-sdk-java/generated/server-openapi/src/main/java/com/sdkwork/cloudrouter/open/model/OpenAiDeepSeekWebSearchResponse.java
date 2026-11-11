package com.sdkwork.cloudrouter.open.model;

import java.util.List;

public class OpenAiDeepSeekWebSearchResponse {
    private List<OpenAiDeepSeekWebSearchResult> results;

    public List<OpenAiDeepSeekWebSearchResult> getResults() {
        return this.results;
    }

    public void setResults(List<OpenAiDeepSeekWebSearchResult> results) {
        this.results = results;
    }
}

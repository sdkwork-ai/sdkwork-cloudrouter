package com.sdkwork.clawrouter.open.model;

import java.util.List;

public class OpenAiVectorStoreSearchResponse {
    private List<OpenAiVectorStoreSearchResult> data;
    private String object;
    private List<String> searchQuery;

    public List<OpenAiVectorStoreSearchResult> getData() {
        return this.data;
    }

    public void setData(List<OpenAiVectorStoreSearchResult> data) {
        this.data = data;
    }

    public String getObject() {
        return this.object;
    }

    public void setObject(String object) {
        this.object = object;
    }

    public List<String> getSearchQuery() {
        return this.searchQuery;
    }

    public void setSearchQuery(List<String> searchQuery) {
        this.searchQuery = searchQuery;
    }
}

package com.sdkwork.cloudrouter.open.model;

import java.util.List;

public class GoogleBatchEmbedContentsRequest {
    private List<GoogleEmbedContentRequest> requests;

    public List<GoogleEmbedContentRequest> getRequests() {
        return this.requests;
    }

    public void setRequests(List<GoogleEmbedContentRequest> requests) {
        this.requests = requests;
    }
}

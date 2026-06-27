package com.sdkwork.clawrouter.open.model;

import java.util.List;

public class GoogleCachedContentListResponse {
    private List<GoogleCachedContent> cachedContents;
    private String nextPageToken;

    public List<GoogleCachedContent> getCachedContents() {
        return this.cachedContents;
    }

    public void setCachedContents(List<GoogleCachedContent> cachedContents) {
        this.cachedContents = cachedContents;
    }

    public String getNextPageToken() {
        return this.nextPageToken;
    }

    public void setNextPageToken(String nextPageToken) {
        this.nextPageToken = nextPageToken;
    }
}

package com.sdkwork.clawrouter.open.model;

import java.util.List;

public class GoogleFileListResponse {
    private List<GoogleFile> files;
    private String nextPageToken;

    public List<GoogleFile> getFiles() {
        return this.files;
    }

    public void setFiles(List<GoogleFile> files) {
        this.files = files;
    }

    public String getNextPageToken() {
        return this.nextPageToken;
    }

    public void setNextPageToken(String nextPageToken) {
        this.nextPageToken = nextPageToken;
    }
}

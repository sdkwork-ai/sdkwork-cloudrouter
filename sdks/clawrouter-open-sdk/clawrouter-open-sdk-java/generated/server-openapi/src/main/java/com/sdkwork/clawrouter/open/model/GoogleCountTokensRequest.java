package com.sdkwork.clawrouter.open.model;

import java.util.List;

public class GoogleCountTokensRequest {
    private List<GoogleContent> contents;
    private GoogleGenerateContentRequest generateContentRequest;

    public List<GoogleContent> getContents() {
        return this.contents;
    }

    public void setContents(List<GoogleContent> contents) {
        this.contents = contents;
    }

    public GoogleGenerateContentRequest getGenerateContentRequest() {
        return this.generateContentRequest;
    }

    public void setGenerateContentRequest(GoogleGenerateContentRequest generateContentRequest) {
        this.generateContentRequest = generateContentRequest;
    }
}

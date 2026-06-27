package com.sdkwork.clawrouter.backend.model;


public class StorageProviderMutationResponse {
    private StorageProviderConfig provider;
    private String requestId;

    public StorageProviderConfig getProvider() {
        return this.provider;
    }

    public void setProvider(StorageProviderConfig provider) {
        this.provider = provider;
    }

    public String getRequestId() {
        return this.requestId;
    }

    public void setRequestId(String requestId) {
        this.requestId = requestId;
    }
}

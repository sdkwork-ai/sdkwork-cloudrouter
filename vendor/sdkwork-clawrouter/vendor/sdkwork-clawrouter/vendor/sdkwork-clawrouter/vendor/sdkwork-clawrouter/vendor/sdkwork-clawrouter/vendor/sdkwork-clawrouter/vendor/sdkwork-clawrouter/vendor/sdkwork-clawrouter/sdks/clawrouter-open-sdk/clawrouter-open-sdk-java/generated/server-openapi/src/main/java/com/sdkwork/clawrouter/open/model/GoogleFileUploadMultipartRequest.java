package com.sdkwork.clawrouter.open.model;


public class GoogleFileUploadMultipartRequest {
    private String file;
    private String metadata;

    public String getFile() {
        return this.file;
    }

    public void setFile(String file) {
        this.file = file;
    }

    public String getMetadata() {
        return this.metadata;
    }

    public void setMetadata(String metadata) {
        this.metadata = metadata;
    }
}

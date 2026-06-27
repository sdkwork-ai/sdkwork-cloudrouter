package com.sdkwork.clawrouter.open.model;


public class OpenAiVectorStoreFileBatch {
    private Integer createdAt;
    private OpenAiVectorStoreFileCounts fileCounts;
    private String id;
    private String object;
    private String status;
    private String vectorStoreId;

    public Integer getCreatedAt() {
        return this.createdAt;
    }

    public void setCreatedAt(Integer createdAt) {
        this.createdAt = createdAt;
    }

    public OpenAiVectorStoreFileCounts getFileCounts() {
        return this.fileCounts;
    }

    public void setFileCounts(OpenAiVectorStoreFileCounts fileCounts) {
        this.fileCounts = fileCounts;
    }

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getObject() {
        return this.object;
    }

    public void setObject(String object) {
        this.object = object;
    }

    public String getStatus() {
        return this.status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getVectorStoreId() {
        return this.vectorStoreId;
    }

    public void setVectorStoreId(String vectorStoreId) {
        this.vectorStoreId = vectorStoreId;
    }
}

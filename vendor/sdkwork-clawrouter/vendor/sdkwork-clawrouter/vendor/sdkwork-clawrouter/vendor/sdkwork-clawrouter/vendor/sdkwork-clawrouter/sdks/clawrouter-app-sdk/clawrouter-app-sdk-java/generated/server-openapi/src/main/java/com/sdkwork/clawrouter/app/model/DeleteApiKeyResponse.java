package com.sdkwork.clawrouter.app.model;


public class DeleteApiKeyResponse {
    private Boolean deleted;
    private String id;

    public Boolean getDeleted() {
        return this.deleted;
    }

    public void setDeleted(Boolean deleted) {
        this.deleted = deleted;
    }

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }
}

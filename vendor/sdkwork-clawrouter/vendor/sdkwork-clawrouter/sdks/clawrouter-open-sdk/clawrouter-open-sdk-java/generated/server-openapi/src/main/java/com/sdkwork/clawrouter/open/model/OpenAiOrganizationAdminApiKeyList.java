package com.sdkwork.clawrouter.open.model;

import java.util.List;

public class OpenAiOrganizationAdminApiKeyList {
    private List<OpenAiOrganizationAdminApiKey> data;
    private String firstId;
    private Boolean hasMore;
    private String lastId;
    private String object;

    public List<OpenAiOrganizationAdminApiKey> getData() {
        return this.data;
    }

    public void setData(List<OpenAiOrganizationAdminApiKey> data) {
        this.data = data;
    }

    public String getFirstId() {
        return this.firstId;
    }

    public void setFirstId(String firstId) {
        this.firstId = firstId;
    }

    public Boolean getHasMore() {
        return this.hasMore;
    }

    public void setHasMore(Boolean hasMore) {
        this.hasMore = hasMore;
    }

    public String getLastId() {
        return this.lastId;
    }

    public void setLastId(String lastId) {
        this.lastId = lastId;
    }

    public String getObject() {
        return this.object;
    }

    public void setObject(String object) {
        this.object = object;
    }
}

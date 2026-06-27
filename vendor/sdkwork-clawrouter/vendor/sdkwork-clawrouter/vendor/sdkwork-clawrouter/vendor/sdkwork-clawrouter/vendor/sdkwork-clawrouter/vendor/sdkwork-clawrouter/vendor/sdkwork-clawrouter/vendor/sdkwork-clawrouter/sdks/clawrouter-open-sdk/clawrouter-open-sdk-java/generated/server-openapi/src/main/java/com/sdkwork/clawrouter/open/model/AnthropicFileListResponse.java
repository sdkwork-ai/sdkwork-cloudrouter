package com.sdkwork.clawrouter.open.model;

import java.util.List;

public class AnthropicFileListResponse {
    private List<AnthropicFile> data;
    private String firstId;
    private Boolean hasMore;
    private String lastId;

    public List<AnthropicFile> getData() {
        return this.data;
    }

    public void setData(List<AnthropicFile> data) {
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
}

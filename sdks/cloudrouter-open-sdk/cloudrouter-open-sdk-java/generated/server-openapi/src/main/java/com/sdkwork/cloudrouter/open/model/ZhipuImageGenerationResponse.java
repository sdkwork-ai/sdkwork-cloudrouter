package com.sdkwork.cloudrouter.open.model;

import java.util.List;

public class ZhipuImageGenerationResponse {
    private List<ZhipuContentFilter> contentFilter;
    private Integer created;
    private List<ZhipuImageResult> data;

    public List<ZhipuContentFilter> getContentFilter() {
        return this.contentFilter;
    }

    public void setContentFilter(List<ZhipuContentFilter> contentFilter) {
        this.contentFilter = contentFilter;
    }

    public Integer getCreated() {
        return this.created;
    }

    public void setCreated(Integer created) {
        this.created = created;
    }

    public List<ZhipuImageResult> getData() {
        return this.data;
    }

    public void setData(List<ZhipuImageResult> data) {
        this.data = data;
    }
}

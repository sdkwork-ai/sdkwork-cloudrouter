package com.sdkwork.cloudrouter.open.model;

import java.util.List;

public class XaiImageGenerationResponse {
    private List<XaiGeneratedImage> data;
    private XaiUsage usage;

    public List<XaiGeneratedImage> getData() {
        return this.data;
    }

    public void setData(List<XaiGeneratedImage> data) {
        this.data = data;
    }

    public XaiUsage getUsage() {
        return this.usage;
    }

    public void setUsage(XaiUsage usage) {
        this.usage = usage;
    }
}

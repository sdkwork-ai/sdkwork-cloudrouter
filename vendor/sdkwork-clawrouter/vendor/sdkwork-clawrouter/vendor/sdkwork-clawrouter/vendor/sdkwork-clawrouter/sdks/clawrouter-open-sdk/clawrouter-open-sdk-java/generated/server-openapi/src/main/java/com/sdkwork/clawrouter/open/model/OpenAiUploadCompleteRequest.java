package com.sdkwork.clawrouter.open.model;

import java.util.List;

public class OpenAiUploadCompleteRequest {
    private String md5;
    private List<String> partIds;

    public String getMd5() {
        return this.md5;
    }

    public void setMd5(String md5) {
        this.md5 = md5;
    }

    public List<String> getPartIds() {
        return this.partIds;
    }

    public void setPartIds(List<String> partIds) {
        this.partIds = partIds;
    }
}

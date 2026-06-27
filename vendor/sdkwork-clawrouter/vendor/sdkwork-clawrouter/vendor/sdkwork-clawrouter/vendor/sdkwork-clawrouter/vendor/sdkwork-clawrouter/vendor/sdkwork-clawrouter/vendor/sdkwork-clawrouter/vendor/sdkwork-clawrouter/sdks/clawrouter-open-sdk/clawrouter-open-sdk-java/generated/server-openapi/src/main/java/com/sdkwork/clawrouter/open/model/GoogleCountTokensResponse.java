package com.sdkwork.clawrouter.open.model;


public class GoogleCountTokensResponse {
    private Integer cachedContentTokenCount;
    private Integer totalTokens;

    public Integer getCachedContentTokenCount() {
        return this.cachedContentTokenCount;
    }

    public void setCachedContentTokenCount(Integer cachedContentTokenCount) {
        this.cachedContentTokenCount = cachedContentTokenCount;
    }

    public Integer getTotalTokens() {
        return this.totalTokens;
    }

    public void setTotalTokens(Integer totalTokens) {
        this.totalTokens = totalTokens;
    }
}

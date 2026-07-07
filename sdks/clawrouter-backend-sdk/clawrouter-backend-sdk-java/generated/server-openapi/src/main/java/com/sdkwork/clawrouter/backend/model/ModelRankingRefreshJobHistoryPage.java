package com.sdkwork.clawrouter.backend.model;

import java.util.List;
import java.util.Map;

public class ModelRankingRefreshJobHistoryPage {
    private List<Map<String, String>> items;
    private PageInfo pageInfo;

    public List<Map<String, String>> getItems() {
        return this.items;
    }

    public void setItems(List<Map<String, String>> items) {
        this.items = items;
    }

    public PageInfo getPageInfo() {
        return this.pageInfo;
    }

    public void setPageInfo(PageInfo pageInfo) {
        this.pageInfo = pageInfo;
    }
}

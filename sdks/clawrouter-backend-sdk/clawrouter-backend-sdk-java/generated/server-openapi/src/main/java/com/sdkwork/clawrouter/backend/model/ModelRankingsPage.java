package com.sdkwork.clawrouter.backend.model;

import java.util.List;
import java.util.Map;

public class ModelRankingsPage {
    private List<Map<String, String>> history;
    private List<Map<String, String>> items;
    private PageInfo pageInfo;
    private Map<String, String> source;

    public List<Map<String, String>> getHistory() {
        return this.history;
    }

    public void setHistory(List<Map<String, String>> history) {
        this.history = history;
    }

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

    public Map<String, String> getSource() {
        return this.source;
    }

    public void setSource(Map<String, String> source) {
        this.source = source;
    }
}

package com.sdkwork.clawrouter.backend.model;

import java.util.List;
import java.util.Map;

public class ModelCatalogPage {
    private List<Map<String, Object>> groups;
    private List<Map<String, String>> items;
    private PageInfo pageInfo;

    public List<Map<String, Object>> getGroups() {
        return this.groups;
    }

    public void setGroups(List<Map<String, Object>> groups) {
        this.groups = groups;
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
}

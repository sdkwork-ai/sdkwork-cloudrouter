package com.sdkwork.clawrouter.backend.model;

import java.util.List;
import java.util.Map;

public class CacheNamespaceKeyPage {
    private String instanceName;
    private List<Map<String, Object>> items;
    private String namespace;
    private PageInfo pageInfo;
    private String returnedItems;
    private Boolean scanComplete;
    private String scannedItems;

    public String getInstanceName() {
        return this.instanceName;
    }

    public void setInstanceName(String instanceName) {
        this.instanceName = instanceName;
    }

    public List<Map<String, Object>> getItems() {
        return this.items;
    }

    public void setItems(List<Map<String, Object>> items) {
        this.items = items;
    }

    public String getNamespace() {
        return this.namespace;
    }

    public void setNamespace(String namespace) {
        this.namespace = namespace;
    }

    public PageInfo getPageInfo() {
        return this.pageInfo;
    }

    public void setPageInfo(PageInfo pageInfo) {
        this.pageInfo = pageInfo;
    }

    public String getReturnedItems() {
        return this.returnedItems;
    }

    public void setReturnedItems(String returnedItems) {
        this.returnedItems = returnedItems;
    }

    public Boolean getScanComplete() {
        return this.scanComplete;
    }

    public void setScanComplete(Boolean scanComplete) {
        this.scanComplete = scanComplete;
    }

    public String getScannedItems() {
        return this.scannedItems;
    }

    public void setScannedItems(String scannedItems) {
        this.scannedItems = scannedItems;
    }
}

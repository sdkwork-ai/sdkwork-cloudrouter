package com.sdkwork.clawrouter.backend.model;


public class ModelsRefreshResult {
    private String code;
    private AdminModelCatalogSyncResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public AdminModelCatalogSyncResponse getData() {
        return this.data;
    }

    public void setData(AdminModelCatalogSyncResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}

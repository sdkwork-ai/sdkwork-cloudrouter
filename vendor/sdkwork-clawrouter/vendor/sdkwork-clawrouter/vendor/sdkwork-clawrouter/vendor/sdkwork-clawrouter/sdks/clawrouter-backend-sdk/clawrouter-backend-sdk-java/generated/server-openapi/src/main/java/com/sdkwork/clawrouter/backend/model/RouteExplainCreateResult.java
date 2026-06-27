package com.sdkwork.clawrouter.backend.model;


public class RouteExplainCreateResult {
    private String code;
    private AdminRuntimeRouteExplainResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public AdminRuntimeRouteExplainResponse getData() {
        return this.data;
    }

    public void setData(AdminRuntimeRouteExplainResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}

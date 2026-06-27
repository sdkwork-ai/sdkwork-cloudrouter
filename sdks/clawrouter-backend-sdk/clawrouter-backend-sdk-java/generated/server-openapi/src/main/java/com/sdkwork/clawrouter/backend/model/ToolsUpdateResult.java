package com.sdkwork.clawrouter.backend.model;


public class ToolsUpdateResult {
    private String code;
    private AdminMcpToolMutationResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public AdminMcpToolMutationResponse getData() {
        return this.data;
    }

    public void setData(AdminMcpToolMutationResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}

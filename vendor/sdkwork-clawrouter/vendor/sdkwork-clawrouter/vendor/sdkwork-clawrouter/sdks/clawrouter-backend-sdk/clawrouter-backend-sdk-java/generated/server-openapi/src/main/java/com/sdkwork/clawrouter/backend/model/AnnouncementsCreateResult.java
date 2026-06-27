package com.sdkwork.clawrouter.backend.model;


public class AnnouncementsCreateResult {
    private String code;
    private AdminAnnouncementMutationResponse data;
    private String msg;

    public String getCode() {
        return this.code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public AdminAnnouncementMutationResponse getData() {
        return this.data;
    }

    public void setData(AdminAnnouncementMutationResponse data) {
        this.data = data;
    }

    public String getMsg() {
        return this.msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }
}

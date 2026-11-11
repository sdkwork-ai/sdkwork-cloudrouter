package com.sdkwork.cloudrouter.open.model;


public class PixverseVideoGenerationResponse {
    private Integer errCode;
    private String errMsg;
    private PixverseErrorDetail error;
    private PixverseTaskResp resp;

    public Integer getErrCode() {
        return this.errCode;
    }

    public void setErrCode(Integer errCode) {
        this.errCode = errCode;
    }

    public String getErrMsg() {
        return this.errMsg;
    }

    public void setErrMsg(String errMsg) {
        this.errMsg = errMsg;
    }

    public PixverseErrorDetail getError() {
        return this.error;
    }

    public void setError(PixverseErrorDetail error) {
        this.error = error;
    }

    public PixverseTaskResp getResp() {
        return this.resp;
    }

    public void setResp(PixverseTaskResp resp) {
        this.resp = resp;
    }
}

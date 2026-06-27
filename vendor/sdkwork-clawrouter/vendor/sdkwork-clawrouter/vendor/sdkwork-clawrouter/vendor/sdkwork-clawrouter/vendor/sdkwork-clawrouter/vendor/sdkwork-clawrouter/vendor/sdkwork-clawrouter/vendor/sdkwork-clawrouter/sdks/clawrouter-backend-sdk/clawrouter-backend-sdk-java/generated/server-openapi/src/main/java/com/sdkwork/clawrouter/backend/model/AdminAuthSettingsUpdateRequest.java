package com.sdkwork.clawrouter.backend.model;

import java.util.List;

public class AdminAuthSettingsUpdateRequest {
    private String leftRailMode;
    private List<String> loginMethods;
    private Boolean oauthLoginEnabled;
    private List<String> oauthProviders;
    private String oauthRegion;
    private Boolean qrLoginEnabled;
    private String qrLoginType;
    private List<String> recoveryMethods;
    private List<String> registerMethods;
    private AdminAuthVerificationPolicy verificationPolicy;
    private AdminAuthWechatSettingsUpdate wechat;

    public String getLeftRailMode() {
        return this.leftRailMode;
    }

    public void setLeftRailMode(String leftRailMode) {
        this.leftRailMode = leftRailMode;
    }

    public List<String> getLoginMethods() {
        return this.loginMethods;
    }

    public void setLoginMethods(List<String> loginMethods) {
        this.loginMethods = loginMethods;
    }

    public Boolean getOauthLoginEnabled() {
        return this.oauthLoginEnabled;
    }

    public void setOauthLoginEnabled(Boolean oauthLoginEnabled) {
        this.oauthLoginEnabled = oauthLoginEnabled;
    }

    public List<String> getOauthProviders() {
        return this.oauthProviders;
    }

    public void setOauthProviders(List<String> oauthProviders) {
        this.oauthProviders = oauthProviders;
    }

    public String getOauthRegion() {
        return this.oauthRegion;
    }

    public void setOauthRegion(String oauthRegion) {
        this.oauthRegion = oauthRegion;
    }

    public Boolean getQrLoginEnabled() {
        return this.qrLoginEnabled;
    }

    public void setQrLoginEnabled(Boolean qrLoginEnabled) {
        this.qrLoginEnabled = qrLoginEnabled;
    }

    public String getQrLoginType() {
        return this.qrLoginType;
    }

    public void setQrLoginType(String qrLoginType) {
        this.qrLoginType = qrLoginType;
    }

    public List<String> getRecoveryMethods() {
        return this.recoveryMethods;
    }

    public void setRecoveryMethods(List<String> recoveryMethods) {
        this.recoveryMethods = recoveryMethods;
    }

    public List<String> getRegisterMethods() {
        return this.registerMethods;
    }

    public void setRegisterMethods(List<String> registerMethods) {
        this.registerMethods = registerMethods;
    }

    public AdminAuthVerificationPolicy getVerificationPolicy() {
        return this.verificationPolicy;
    }

    public void setVerificationPolicy(AdminAuthVerificationPolicy verificationPolicy) {
        this.verificationPolicy = verificationPolicy;
    }

    public AdminAuthWechatSettingsUpdate getWechat() {
        return this.wechat;
    }

    public void setWechat(AdminAuthWechatSettingsUpdate wechat) {
        this.wechat = wechat;
    }
}

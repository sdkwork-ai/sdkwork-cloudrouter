package com.sdkwork.clawrouter.backend.model;


public class AdminAuthVerificationPolicy {
    private Boolean emailCodeLoginEnabled;
    private Boolean emailRegistrationVerificationRequired;
    private Boolean phoneCodeLoginEnabled;
    private Boolean phoneRegistrationVerificationRequired;

    public Boolean getEmailCodeLoginEnabled() {
        return this.emailCodeLoginEnabled;
    }

    public void setEmailCodeLoginEnabled(Boolean emailCodeLoginEnabled) {
        this.emailCodeLoginEnabled = emailCodeLoginEnabled;
    }

    public Boolean getEmailRegistrationVerificationRequired() {
        return this.emailRegistrationVerificationRequired;
    }

    public void setEmailRegistrationVerificationRequired(Boolean emailRegistrationVerificationRequired) {
        this.emailRegistrationVerificationRequired = emailRegistrationVerificationRequired;
    }

    public Boolean getPhoneCodeLoginEnabled() {
        return this.phoneCodeLoginEnabled;
    }

    public void setPhoneCodeLoginEnabled(Boolean phoneCodeLoginEnabled) {
        this.phoneCodeLoginEnabled = phoneCodeLoginEnabled;
    }

    public Boolean getPhoneRegistrationVerificationRequired() {
        return this.phoneRegistrationVerificationRequired;
    }

    public void setPhoneRegistrationVerificationRequired(Boolean phoneRegistrationVerificationRequired) {
        this.phoneRegistrationVerificationRequired = phoneRegistrationVerificationRequired;
    }
}

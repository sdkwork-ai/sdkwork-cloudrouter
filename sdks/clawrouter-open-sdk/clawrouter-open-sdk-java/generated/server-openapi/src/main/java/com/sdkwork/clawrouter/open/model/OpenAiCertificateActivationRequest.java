package com.sdkwork.clawrouter.open.model;

import java.util.List;

public class OpenAiCertificateActivationRequest {
    private List<String> certificateIds;

    public List<String> getCertificateIds() {
        return this.certificateIds;
    }

    public void setCertificateIds(List<String> certificateIds) {
        this.certificateIds = certificateIds;
    }
}

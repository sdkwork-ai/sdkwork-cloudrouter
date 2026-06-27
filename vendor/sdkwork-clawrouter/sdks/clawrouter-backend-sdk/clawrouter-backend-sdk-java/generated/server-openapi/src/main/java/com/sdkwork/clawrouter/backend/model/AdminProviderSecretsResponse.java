package com.sdkwork.clawrouter.backend.model;

import java.util.List;

public class AdminProviderSecretsResponse {
    private List<AdminProviderSecretItem> items;

    public List<AdminProviderSecretItem> getItems() {
        return this.items;
    }

    public void setItems(List<AdminProviderSecretItem> items) {
        this.items = items;
    }
}

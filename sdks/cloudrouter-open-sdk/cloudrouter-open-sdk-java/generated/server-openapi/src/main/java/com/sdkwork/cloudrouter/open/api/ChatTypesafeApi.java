package com.sdkwork.cloudrouter.open.api;

import com.fasterxml.jackson.core.type.TypeReference;
import com.sdkwork.cloudrouter.open.http.HttpClient;
import com.sdkwork.cloudrouter.open.model.*;
import java.util.List;
import java.util.Map;

public class ChatTypesafeApi {
    private final HttpClient client;

    public ChatTypesafeApi(HttpClient client) {
        this.client = client;
    }

    /** TypeSafe AI System One decision */
    public TypeSafeSystemOneResponse createV1Systemone(TypeSafeSystemOneRequest body) throws Exception {
        Object raw = client.post("/typesafe/v1/systemone", body, null, null, "application/json");
        return client.convertValue(raw, new TypeReference<TypeSafeSystemOneResponse>() {});
    }




}

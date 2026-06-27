package com.sdkwork.clawrouter.backend.api

import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.registerKotlinModule
import com.sdkwork.clawrouter.backend.*
import com.sdkwork.clawrouter.backend.http.HttpClient

class StorageApi(private val client: HttpClient) {

    /** List storage buckets */
    suspend fun ossBucketsList(cursor: String? = null, limit: String? = null, status: String? = null): OssBucketsListResult? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("cursor", cursor, "form", true, false, null),
            QueryParameterSpec("limit", limit, "form", true, false, null),
            QueryParameterSpec("status", status, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/storage/buckets"), query))
        return client.convertValue(raw, object : TypeReference<OssBucketsListResult>() {})
    }

    /** Create storage bucket */
    suspend fun ossBucketsCreate(body: CreateStorageBucketRequest, idempotencyKey: String): OssBucketsCreateResult? {
        val requestHeaders = buildRequestHeaders(
            mapOf(
                "Idempotency-Key" to HeaderParameterSpec(idempotencyKey, "simple", false, null),
            ),
            emptyMap()
        )
        val raw = client.post(ApiPaths.backendPath("/storage/buckets"), body, null, requestHeaders, "application/json")
        return client.convertValue(raw, object : TypeReference<OssBucketsCreateResult>() {})
    }

    /** Update storage bucket status */
    suspend fun ossBucketsUpdate(bucketId: String, body: UpdateStorageBucketRequest): OssBucketsUpdateResult? {
        val raw = client.patch(ApiPaths.backendPath("/storage/buckets/${serializePathParameter(bucketId, PathParameterSpec("bucketId", "simple", false))}"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<OssBucketsUpdateResult>() {})
    }

    /** List default storage bucket routes */
    suspend fun ossDefaultBucketsList(logicalScope: String? = null): OssDefaultBucketsListResult? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("logical_scope", logicalScope, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/storage/default_buckets"), query))
        return client.convertValue(raw, object : TypeReference<OssDefaultBucketsListResult>() {})
    }

    /** Set default storage bucket route */
    suspend fun ossDefaultBucketsUpdate(logicalScope: String, body: SetStorageDefaultBucketRequest): OssDefaultBucketsUpdateResult? {
        val raw = client.patch(ApiPaths.backendPath("/storage/default_buckets/${serializePathParameter(logicalScope, PathParameterSpec("logicalScope", "simple", false))}"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<OssDefaultBucketsUpdateResult>() {})
    }

    /** List storage garbage collection jobs */
    suspend fun ossGcJobsList(cursor: String? = null, limit: String? = null, status: String? = null): OssGcJobsListResult? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("cursor", cursor, "form", true, false, null),
            QueryParameterSpec("limit", limit, "form", true, false, null),
            QueryParameterSpec("status", status, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/storage/gc_jobs"), query))
        return client.convertValue(raw, object : TypeReference<OssGcJobsListResult>() {})
    }

    /** Create storage garbage collection job */
    suspend fun ossGcJobsCreate(body: CreateStorageGarbageCollectionJobRequest, idempotencyKey: String): OssGcJobsCreateResult? {
        val requestHeaders = buildRequestHeaders(
            mapOf(
                "Idempotency-Key" to HeaderParameterSpec(idempotencyKey, "simple", false, null),
            ),
            emptyMap()
        )
        val raw = client.post(ApiPaths.backendPath("/storage/gc_jobs"), body, null, requestHeaders, "application/json")
        return client.convertValue(raw, object : TypeReference<OssGcJobsCreateResult>() {})
    }

    /** List storage providers */
    suspend fun ossProvidersList(): OssProvidersListResult? {
        val raw = client.get(ApiPaths.backendPath("/storage/providers"))
        return client.convertValue(raw, object : TypeReference<OssProvidersListResult>() {})
    }

    /** Create storage provider */
    suspend fun ossProvidersCreate(body: CreateStorageProviderRequest, idempotencyKey: String): OssProvidersCreateResult? {
        val requestHeaders = buildRequestHeaders(
            mapOf(
                "Idempotency-Key" to HeaderParameterSpec(idempotencyKey, "simple", false, null),
            ),
            emptyMap()
        )
        val raw = client.post(ApiPaths.backendPath("/storage/providers"), body, null, requestHeaders, "application/json")
        return client.convertValue(raw, object : TypeReference<OssProvidersCreateResult>() {})
    }

    /** Update storage provider status */
    suspend fun ossProvidersUpdate(providerId: String, body: UpdateStorageProviderRequest): OssProvidersUpdateResult? {
        val raw = client.patch(ApiPaths.backendPath("/storage/providers/${serializePathParameter(providerId, PathParameterSpec("providerId", "simple", false))}"), body, null, null, "application/json")
        return client.convertValue(raw, object : TypeReference<OssProvidersUpdateResult>() {})
    }

    /** Check storage provider health */
    suspend fun ossProvidersHealthChecksCreate(providerId: String): OssProvidersHealthChecksCreateResult? {
        val raw = client.post(ApiPaths.backendPath("/storage/providers/${serializePathParameter(providerId, PathParameterSpec("providerId", "simple", false))}/health_check"), null)
        return client.convertValue(raw, object : TypeReference<OssProvidersHealthChecksCreateResult>() {})
    }

    /** List storage quota policies */
    suspend fun ossQuotasList(): OssQuotasListResult? {
        val raw = client.get(ApiPaths.backendPath("/storage/quotas"))
        return client.convertValue(raw, object : TypeReference<OssQuotasListResult>() {})
    }

    /** Create storage quota policy */
    suspend fun ossQuotasCreate(body: CreateStorageQuotaPolicyRequest, idempotencyKey: String): OssQuotasCreateResult? {
        val requestHeaders = buildRequestHeaders(
            mapOf(
                "Idempotency-Key" to HeaderParameterSpec(idempotencyKey, "simple", false, null),
            ),
            emptyMap()
        )
        val raw = client.post(ApiPaths.backendPath("/storage/quotas"), body, null, requestHeaders, "application/json")
        return client.convertValue(raw, object : TypeReference<OssQuotasCreateResult>() {})
    }

    /** List storage reconciliation runs */
    suspend fun ossReconciliationRunsList(cursor: String? = null, limit: String? = null, runType: String? = null, status: String? = null): OssReconciliationRunsListResult? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("cursor", cursor, "form", true, false, null),
            QueryParameterSpec("limit", limit, "form", true, false, null),
            QueryParameterSpec("run_type", runType, "form", true, false, null),
            QueryParameterSpec("status", status, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/storage/reconciliation_runs"), query))
        return client.convertValue(raw, object : TypeReference<OssReconciliationRunsListResult>() {})
    }

    /** Create storage reconciliation run */
    suspend fun ossReconciliationRunsCreate(body: CreateStorageReconciliationRunRequest, idempotencyKey: String): OssReconciliationRunsCreateResult? {
        val requestHeaders = buildRequestHeaders(
            mapOf(
                "Idempotency-Key" to HeaderParameterSpec(idempotencyKey, "simple", false, null),
            ),
            emptyMap()
        )
        val raw = client.post(ApiPaths.backendPath("/storage/reconciliation_runs"), body, null, requestHeaders, "application/json")
        return client.convertValue(raw, object : TypeReference<OssReconciliationRunsCreateResult>() {})
    }

    /** List storage usage counters */
    suspend fun ossUsageList(cursor: String? = null, limit: String? = null, scopeType: String? = null, scopeId: String? = null): OssUsageListResult? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("cursor", cursor, "form", true, false, null),
            QueryParameterSpec("limit", limit, "form", true, false, null),
            QueryParameterSpec("scope_type", scopeType, "form", true, false, null),
            QueryParameterSpec("scope_id", scopeId, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/storage/usage"), query))
        return client.convertValue(raw, object : TypeReference<OssUsageListResult>() {})
    }

    /** List storage usage ledger */
    suspend fun ossUsageLedgerList(cursor: String? = null, limit: String? = null, scopeType: String? = null, scopeId: String? = null): OssUsageLedgerListResult? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("cursor", cursor, "form", true, false, null),
            QueryParameterSpec("limit", limit, "form", true, false, null),
            QueryParameterSpec("scope_type", scopeType, "form", true, false, null),
            QueryParameterSpec("scope_id", scopeId, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/storage/usage/ledger"), query))
        return client.convertValue(raw, object : TypeReference<OssUsageLedgerListResult>() {})
    }

    /** List storage usage snapshots */
    suspend fun ossUsageSnapshotsList(cursor: String? = null, limit: String? = null, scopeType: String? = null, scopeId: String? = null): OssUsageSnapshotsListResult? {
        val query = buildQueryString(listOf(
            QueryParameterSpec("cursor", cursor, "form", true, false, null),
            QueryParameterSpec("limit", limit, "form", true, false, null),
            QueryParameterSpec("scope_type", scopeType, "form", true, false, null),
            QueryParameterSpec("scope_id", scopeId, "form", true, false, null)
        ))
        val raw = client.get(ApiPaths.appendQueryString(ApiPaths.backendPath("/storage/usage/snapshots"), query))
        return client.convertValue(raw, object : TypeReference<OssUsageSnapshotsListResult>() {})
    }

    private data class PathParameterSpec(val name: String, val style: String, val explode: Boolean)

    private fun serializePathParameter(value: Any?, spec: PathParameterSpec): String {
        if (value == null) return ""
        val style = spec.style.ifBlank { "simple" }
        return when (value) {
            is Iterable<*> -> serializePathArray(spec.name, value, style, spec.explode)
            is Map<*, *> -> serializePathObject(spec.name, value, style, spec.explode)
            else -> pathPrimitivePrefix(spec.name, style) + pathEncode(value.toString())
        }
    }

    private fun serializePathArray(name: String, values: Iterable<*>, style: String, explode: Boolean): String {
        val serialized = values.mapNotNull { it?.toString()?.let(::pathEncode) }
        if (serialized.isEmpty()) return pathPrefix(name, style)
        if (style == "matrix") {
            if (explode) {
                return serialized.joinToString("") { ";$name=$it" }
            }
            return ";$name=" + serialized.joinToString(",")
        }
        val separator = if (explode) "." else ","
        return pathPrefix(name, style) + serialized.joinToString(separator)
    }

    private fun serializePathObject(name: String, values: Map<*, *>, style: String, explode: Boolean): String {
        val entries = mutableListOf<String>()
        val exploded = mutableListOf<String>()
        values.forEach { (key, value) ->
            if (value == null) return@forEach
            val escapedKey = pathEncode(key.toString())
            val escapedValue = pathEncode(value.toString())
            if (explode) {
                if (style == "matrix") {
                    exploded += ";$escapedKey=$escapedValue"
                } else {
                    exploded += "$escapedKey=$escapedValue"
                }
            } else {
                entries += escapedKey
                entries += escapedValue
            }
        }
        if (style == "matrix") {
            if (explode) return exploded.joinToString("")
            return ";$name=" + entries.joinToString(",")
        }
        if (explode) {
            val separator = if (style == "label") "." else ","
            return pathPrefix(name, style) + exploded.joinToString(separator)
        }
        return pathPrefix(name, style) + entries.joinToString(",")
    }

    private fun pathPrefix(name: String, style: String): String {
        return when (style) {
            "label" -> "."
            "matrix" -> ";$name"
            else -> ""
        }
    }

    private fun pathPrimitivePrefix(name: String, style: String): String {
        return if (style == "matrix") ";$name=" else pathPrefix(name, style)
    }

    private fun pathEncode(value: String): String {
        return java.net.URLEncoder.encode(value, java.nio.charset.StandardCharsets.UTF_8).replace("+", "%20")
    }

    private data class QueryParameterSpec(
        val name: String,
        val value: Any?,
        val style: String,
        val explode: Boolean,
        val allowReserved: Boolean,
        val contentType: String?,
    )

    private val queryObjectMapper = ObjectMapper().registerKotlinModule()

    private fun buildQueryString(parameters: List<QueryParameterSpec>): String {
        val pairs = mutableListOf<String>()
        parameters.forEach { appendSerializedParameter(pairs, it) }
        return pairs.joinToString("&")
    }

    private fun appendSerializedParameter(pairs: MutableList<String>, parameter: QueryParameterSpec) {
        val value = parameter.value ?: return
        if (!parameter.contentType.isNullOrBlank()) {
            val json = queryObjectMapper.writeValueAsString(value)
            pairs += urlEncode(parameter.name) + "=" + encodeQueryValue(json, parameter.allowReserved)
            return
        }

        val style = parameter.style.ifBlank { "form" }
        when (value) {
            is Iterable<*> -> appendArrayParameter(pairs, parameter.name, value, style, parameter.explode, parameter.allowReserved)
            is Map<*, *> -> if (style == "deepObject") {
                appendDeepObjectParameter(pairs, parameter.name, value, parameter.allowReserved)
            } else {
                appendObjectParameter(pairs, parameter.name, value, style, parameter.explode, parameter.allowReserved)
            }
            else -> pairs += urlEncode(parameter.name) + "=" + encodeQueryValue(value.toString(), parameter.allowReserved)
        }
    }

    private fun appendArrayParameter(
        pairs: MutableList<String>,
        name: String,
        values: Iterable<*>,
        style: String,
        explode: Boolean,
        allowReserved: Boolean,
    ) {
        val serialized = values.mapNotNull { it?.toString() }
        if (serialized.isEmpty()) return
        if (style == "form" && explode) {
            serialized.forEach { pairs += urlEncode(name) + "=" + encodeQueryValue(it, allowReserved) }
            return
        }
        pairs += urlEncode(name) + "=" + encodeQueryValue(serialized.joinToString(","), allowReserved)
    }

    private fun appendObjectParameter(
        pairs: MutableList<String>,
        name: String,
        values: Map<*, *>,
        style: String,
        explode: Boolean,
        allowReserved: Boolean,
    ) {
        val serialized = mutableListOf<String>()
        values.forEach { (key, value) ->
            if (value == null) return@forEach
            if (style == "form" && explode) {
                pairs += urlEncode(key.toString()) + "=" + encodeQueryValue(value.toString(), allowReserved)
            } else {
                serialized += key.toString()
                serialized += value.toString()
            }
        }
        if (serialized.isNotEmpty()) {
            pairs += urlEncode(name) + "=" + encodeQueryValue(serialized.joinToString(","), allowReserved)
        }
    }

    private fun appendDeepObjectParameter(pairs: MutableList<String>, name: String, values: Map<*, *>, allowReserved: Boolean) {
        values.forEach { (key, value) ->
            if (value != null) {
                pairs += urlEncode("$name[$key]") + "=" + encodeQueryValue(value.toString(), allowReserved)
            }
        }
    }

    private fun encodeQueryValue(value: String, allowReserved: Boolean): String {
        var encoded = urlEncode(value)
        if (!allowReserved) return encoded
        mapOf(
            "%3A" to ":", "%2F" to "/", "%3F" to "?", "%23" to "#",
            "%5B" to "[", "%5D" to "]", "%40" to "@", "%21" to "!",
            "%24" to "$", "%26" to "&", "%27" to "'", "%28" to "(",
            "%29" to ")", "%2A" to "*", "%2B" to "+", "%2C" to ",",
            "%3B" to ";", "%3D" to "=",
        ).forEach { (escaped, reserved) -> encoded = encoded.replace(escaped, reserved) }
        return encoded
    }

    private fun urlEncode(value: String): String {
        return java.net.URLEncoder.encode(value, java.nio.charset.StandardCharsets.UTF_8)
    }

    private data class HeaderParameterSpec(val value: Any?, val style: String, val explode: Boolean, val contentType: String?)

    private val headerObjectMapper = ObjectMapper().registerKotlinModule()

    private fun buildRequestHeaders(headers: Map<String, HeaderParameterSpec>, cookies: Map<String, HeaderParameterSpec>): Map<String, String>? {
        val requestHeaders = linkedMapOf<String, String>()
        headers.forEach { (name, parameter) ->
            serializeParameterValue(parameter)?.let { requestHeaders[name] = it }
        }

        val cookieHeader = buildCookieHeader(cookies)
        if (cookieHeader.isNotEmpty()) {
            requestHeaders["Cookie"] = requestHeaders["Cookie"]?.let { "$it; $cookieHeader" } ?: cookieHeader
        }

        return requestHeaders.takeIf { it.isNotEmpty() }
    }

    private fun buildCookieHeader(cookies: Map<String, HeaderParameterSpec>): String {
        return cookies.mapNotNull { (name, parameter) ->
            serializeParameterValue(parameter)?.let {
                java.net.URLEncoder.encode(name, java.nio.charset.StandardCharsets.UTF_8) + "=" +
                    java.net.URLEncoder.encode(it, java.nio.charset.StandardCharsets.UTF_8)
            }
        }.joinToString("; ")
    }

    private fun serializeParameterValue(parameter: HeaderParameterSpec?): String? {
        val value = parameter?.value ?: return null
        if (!parameter.contentType.isNullOrBlank()) {
            return headerObjectMapper.writeValueAsString(value)
        }
        return when (value) {
            is Iterable<*> -> value.mapNotNull { it?.toString() }.joinToString(",")
            is Map<*, *> -> value.mapNotNull { (key, item) ->
                if (item == null) {
                    null
                } else if (parameter.explode) {
                    "$key=$item"
                } else {
                    listOf(key.toString(), item.toString()).joinToString(",")
                }
            }.joinToString(",")
            else -> value.toString()
        }
    }
}

"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/bootstrap/runtime.ts
var runtime_exports = {};
__export(runtime_exports, {
  bootstrapMiniProgramApplication: () => bootstrapMiniProgramApplication
});
module.exports = __toCommonJS(runtime_exports);

// ../sdkwork-cloudrouter-common/packages/sdkwork-cloudrouter-contracts/src/permissions.ts
var CLOUDROUTER_CONSOLE_ACCESS_PERMISSION = "cloudrouter.console.access";

// ../sdkwork-cloudrouter-common/packages/sdkwork-cloudrouter-contracts/src/routes.ts
var CLOUDROUTER_CONSOLE_ROUTES = {
  signIn: {
    id: "auth.router.session.signIn",
    path: "/sign-in",
    screen: "ConsoleSignInScreen",
    titleKey: "cloudrouter.auth.signIn.title",
    requiresAuthentication: false
  },
  dashboard: {
    id: "console.router.dashboard.overview",
    path: "/dashboard",
    screen: "ConsoleDashboardScreen",
    titleKey: "cloudrouter.console.dashboard.title",
    requiresAuthentication: true
  },
  usage: {
    id: "console.router.usage.records",
    path: "/usage",
    screen: "ConsoleUsageScreen",
    titleKey: "cloudrouter.console.usage.title",
    requiresAuthentication: true
  },
  apiKeys: {
    id: "console.router.apiKeys.list",
    path: "/api-keys",
    screen: "ConsoleApiKeysScreen",
    titleKey: "cloudrouter.console.apiKeys.title",
    requiresAuthentication: true
  },
  catalog: {
    id: "console.router.catalog.pricing",
    path: "/catalog",
    screen: "ConsoleCatalogScreen",
    titleKey: "cloudrouter.console.catalog.title",
    requiresAuthentication: true
  }
};
var CLOUDROUTER_PC_ROUTE_ALIGNMENT = {
  signIn: ["/auth"],
  dashboard: ["/console/dashboard", "/console/gateway"],
  usage: ["/console/usage"],
  apiKeys: ["/console/api-keys"],
  catalog: ["/models", "/pricing", "/rankings"]
};

// ../sdkwork-cloudrouter-common/packages/sdkwork-cloudrouter-contracts/src/capabilities.ts
var CLOUDROUTER_CONSOLE_CAPABILITIES = [
  {
    id: "console-dashboard",
    routeKey: "dashboard",
    routeId: CLOUDROUTER_CONSOLE_ROUTES.dashboard.id,
    path: CLOUDROUTER_CONSOLE_ROUTES.dashboard.path,
    titleKey: "cloudrouter.console.dashboard.title",
    summaryKey: "cloudrouter.console.dashboard.summary",
    permissionScope: CLOUDROUTER_CONSOLE_ACCESS_PERMISSION,
    pcAlignedPaths: CLOUDROUTER_PC_ROUTE_ALIGNMENT.dashboard,
    order: 10
  },
  {
    id: "console-usage",
    routeKey: "usage",
    routeId: CLOUDROUTER_CONSOLE_ROUTES.usage.id,
    path: CLOUDROUTER_CONSOLE_ROUTES.usage.path,
    titleKey: "cloudrouter.console.usage.title",
    summaryKey: "cloudrouter.console.usage.summary",
    permissionScope: CLOUDROUTER_CONSOLE_ACCESS_PERMISSION,
    pcAlignedPaths: CLOUDROUTER_PC_ROUTE_ALIGNMENT.usage,
    order: 20
  },
  {
    id: "console-api-keys",
    routeKey: "apiKeys",
    routeId: CLOUDROUTER_CONSOLE_ROUTES.apiKeys.id,
    path: CLOUDROUTER_CONSOLE_ROUTES.apiKeys.path,
    titleKey: "cloudrouter.console.apiKeys.title",
    summaryKey: "cloudrouter.console.apiKeys.summary",
    permissionScope: CLOUDROUTER_CONSOLE_ACCESS_PERMISSION,
    pcAlignedPaths: CLOUDROUTER_PC_ROUTE_ALIGNMENT.apiKeys,
    order: 30
  },
  {
    id: "console-catalog",
    routeKey: "catalog",
    routeId: CLOUDROUTER_CONSOLE_ROUTES.catalog.id,
    path: CLOUDROUTER_CONSOLE_ROUTES.catalog.path,
    titleKey: "cloudrouter.console.catalog.title",
    summaryKey: "cloudrouter.console.catalog.summary",
    permissionScope: CLOUDROUTER_CONSOLE_ACCESS_PERMISSION,
    pcAlignedPaths: CLOUDROUTER_PC_ROUTE_ALIGNMENT.catalog,
    order: 40
  }
];
var CLOUDROUTER_CONSOLE_CAPABILITY_IDS = CLOUDROUTER_CONSOLE_CAPABILITIES.map((capability) => capability.id);

// ../../../sdkwork-sdk-commons/sdkwork-sdk-common-typescript/dist/core/types.js
var DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1e3,
  retryBackoff: "exponential",
  maxRetryDelay: 3e4
};
var DEFAULT_CACHE_CONFIG = {
  enabled: false,
  ttl: 3e5,
  maxSize: 100
};
var SUCCESS_CODES = [
  0,
  200,
  2e3,
  "0",
  "200",
  "2000"
];
var HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
};
var MIME_TYPES = {
  JSON: "application/json",
  FORM_DATA: "multipart/form-data",
  URL_ENCODED: "application/x-www-form-urlencoded",
  OCTET_STREAM: "application/octet-stream",
  TEXT_PLAIN: "text/plain",
  TEXT_HTML: "text/html"
};

// ../../../sdkwork-sdk-commons/sdkwork-sdk-common-typescript/dist/auth/token-manager.js
var DefaultAuthTokenManager = class {
  constructor(initialTokens, events) {
    __publicField(this, "tokens", {});
    __publicField(this, "events");
    if (initialTokens) {
      this.tokens = { ...initialTokens };
      if (initialTokens.expiresIn && !initialTokens.expiresAt) this.tokens.expiresAt = Date.now() + initialTokens.expiresIn * 1e3;
    }
    this.events = events;
  }
  getAccessToken() {
    return this.tokens.accessToken;
  }
  getAuthToken() {
    return this.tokens.authToken;
  }
  getRefreshToken() {
    return this.tokens.refreshToken;
  }
  getTokens() {
    return { ...this.tokens };
  }
  setTokens(tokens) {
    var _a, _b;
    this.tokens = { ...tokens };
    if (tokens.expiresIn && !tokens.expiresAt) this.tokens.expiresAt = Date.now() + tokens.expiresIn * 1e3;
    (_b = (_a = this.events) == null ? void 0 : _a.onTokenSet) == null ? void 0 : _b.call(_a, this.tokens);
  }
  setAccessToken(token) {
    var _a, _b;
    this.tokens.accessToken = token;
    (_b = (_a = this.events) == null ? void 0 : _a.onTokenSet) == null ? void 0 : _b.call(_a, this.tokens);
  }
  setAuthToken(token) {
    var _a, _b;
    this.tokens.authToken = token;
    (_b = (_a = this.events) == null ? void 0 : _a.onTokenSet) == null ? void 0 : _b.call(_a, this.tokens);
  }
  setRefreshToken(token) {
    this.tokens.refreshToken = token;
  }
  clearTokens() {
    var _a, _b;
    this.tokens = {};
    (_b = (_a = this.events) == null ? void 0 : _a.onTokenCleared) == null ? void 0 : _b.call(_a);
  }
  clearAuthToken() {
    delete this.tokens.authToken;
  }
  clearAccessToken() {
    delete this.tokens.accessToken;
  }
  isExpired() {
    var _a, _b;
    if (!this.tokens.expiresAt) return false;
    const expired = Date.now() >= this.tokens.expiresAt;
    if (expired) (_b = (_a = this.events) == null ? void 0 : _a.onTokenExpired) == null ? void 0 : _b.call(_a);
    return expired;
  }
  isValid() {
    return this.hasToken() && !this.isExpired();
  }
  hasToken() {
    return !!(this.tokens.accessToken || this.tokens.authToken);
  }
  hasAuthToken() {
    return !!this.tokens.authToken;
  }
  hasAccessToken() {
    return !!this.tokens.accessToken;
  }
  willExpireIn(seconds) {
    if (!this.tokens.expiresAt) return false;
    return Date.now() + seconds * 1e3 >= this.tokens.expiresAt;
  }
};
function createTokenManager(tokens, events) {
  return new DefaultAuthTokenManager(tokens, events);
}
function buildAuthHeaders(authMode, apiKey, tokenManager2) {
  const headers = {};
  if (authMode === "apikey") {
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
  } else if (authMode === "dual-token") {
    if (tokenManager2) {
      const accessToken = tokenManager2.getAccessToken();
      const authToken = tokenManager2.getAuthToken();
      if (accessToken) headers["Access-Token"] = accessToken;
      if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
    }
  }
  return headers;
}

// ../../../sdkwork-sdk-commons/sdkwork-sdk-common-typescript/dist/utils/logger.js
var LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4
};
var ConsoleLogger = class {
  constructor(config = {}) {
    __publicField(this, "level");
    __publicField(this, "prefix");
    __publicField(this, "timestamp");
    __publicField(this, "colors");
    var _a, _b, _c, _d;
    this.level = (_a = config.level) != null ? _a : "info";
    this.prefix = (_b = config.prefix) != null ? _b : "[SDK]";
    this.timestamp = (_c = config.timestamp) != null ? _c : true;
    this.colors = (_d = config.colors) != null ? _d : true;
  }
  formatMessage(level, message) {
    const parts = [];
    if (this.timestamp) parts.push((/* @__PURE__ */ new Date()).toISOString());
    parts.push(this.prefix);
    parts.push(`[${level.toUpperCase()}]`);
    parts.push(message);
    return parts.join(" ");
  }
  getColorCode(level) {
    if (!this.colors) return "";
    return {
      debug: "\x1B[36m",
      info: "\x1B[32m",
      warn: "\x1B[33m",
      error: "\x1B[31m",
      silent: ""
    }[level];
  }
  getResetCode() {
    return this.colors ? "\x1B[0m" : "";
  }
  log(level, message, ...args) {
    if (LOG_LEVELS[level] < LOG_LEVELS[this.level]) return;
    const formattedMessage = this.formatMessage(level, message);
    const output = `${this.getColorCode(level)}${formattedMessage}${this.getResetCode()}`;
    switch (level) {
      case "debug":
        console.debug(output, ...args);
        break;
      case "info":
        console.info(output, ...args);
        break;
      case "warn":
        console.warn(output, ...args);
        break;
      case "error":
        console.error(output, ...args);
    }
  }
  debug(message, ...args) {
    this.log("debug", message, ...args);
  }
  info(message, ...args) {
    this.log("info", message, ...args);
  }
  warn(message, ...args) {
    this.log("warn", message, ...args);
  }
  error(message, ...args) {
    this.log("error", message, ...args);
  }
  setLevel(level) {
    this.level = level;
  }
};
var noopLogger = {
  debug: () => {
  },
  info: () => {
  },
  warn: () => {
  },
  error: () => {
  },
  log: () => {
  },
  setLevel: () => {
  }
};
function createLogger(config) {
  if ((config == null ? void 0 : config.level) === "silent") return noopLogger;
  return new ConsoleLogger(config);
}

// ../../../sdkwork-sdk-commons/sdkwork-sdk-common-typescript/dist/utils/cache.js
var MemoryCacheStore = class {
  constructor(config = {}) {
    __publicField(this, "cache", /* @__PURE__ */ new Map());
    __publicField(this, "maxSize");
    __publicField(this, "defaultTtl");
    var _a, _b;
    this.maxSize = (_a = config.maxSize) != null ? _a : DEFAULT_CACHE_CONFIG.maxSize;
    this.defaultTtl = (_b = config.ttl) != null ? _b : DEFAULT_CACHE_CONFIG.ttl;
  }
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }
  set(key, value, ttl) {
    if (this.cache.size >= this.maxSize) this.evictOldest();
    const expiresAt = Date.now() + (ttl != null ? ttl : this.defaultTtl);
    this.cache.set(key, {
      value,
      expiresAt
    });
  }
  has(key) {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }
  delete(key) {
    return this.cache.delete(key);
  }
  clear() {
    this.cache.clear();
  }
  size() {
    return this.cache.size;
  }
  evictOldest() {
    let oldestKey = null;
    let oldestTime = Infinity;
    for (const [key, entry] of this.cache) if (entry.expiresAt < oldestTime) {
      oldestTime = entry.expiresAt;
      oldestKey = key;
    }
    if (oldestKey) this.cache.delete(oldestKey);
  }
};
function createCacheStore(config) {
  return new MemoryCacheStore(config);
}

// ../../../sdkwork-sdk-commons/sdkwork-sdk-common-typescript/dist/errors.js
var SdkError = class extends Error {
  constructor(message, code = "UNKNOWN", httpStatus, options) {
    var _a, _b;
    super(message, { cause: options == null ? void 0 : options.cause });
    __publicField(this, "code");
    __publicField(this, "httpStatus");
    __publicField(this, "details");
    __publicField(this, "timestamp");
    __publicField(this, "traceId");
    __publicField(this, "problem");
    __publicField(this, "metadata");
    this.name = this.constructor.name;
    this.code = code;
    this.httpStatus = httpStatus;
    this.details = options == null ? void 0 : options.details;
    this.timestamp = Date.now();
    this.traceId = (_b = options == null ? void 0 : options.traceId) != null ? _b : (_a = options == null ? void 0 : options.problem) == null ? void 0 : _a.traceId;
    this.problem = options == null ? void 0 : options.problem;
    this.metadata = options == null ? void 0 : options.metadata;
    Object.setPrototypeOf(this, new.target.prototype);
  }
  static fromApiResult(result, httpStatus) {
    const code = String(result.code);
    const message = result.msg || result.message || "Unknown error";
    switch (code) {
      case "400":
      case "4000":
        return new ValidationError(message);
      case "401":
      case "4010":
        return new AuthenticationError(message);
      case "403":
      case "4030":
        return new ForbiddenError(message);
      case "404":
      case "4040":
        return new NotFoundError(message);
      case "409":
      case "4090":
        return new ConflictError(message);
      case "429":
      case "4290":
        return new RateLimitError(message);
      default:
        if (code.startsWith("5")) return new ServerError(message, httpStatus != null ? httpStatus : HTTP_STATUS.INTERNAL_SERVER_ERROR);
        return new BusinessError(message, result.code, result.data);
    }
  }
  static fromHttpStatus(status, message, options) {
    const defaultMessage = message != null ? message : `HTTP Error ${status}`;
    switch (status) {
      case HTTP_STATUS.BAD_REQUEST:
      case HTTP_STATUS.UNPROCESSABLE_ENTITY:
        return new ValidationError(defaultMessage, void 0, options);
      case HTTP_STATUS.UNAUTHORIZED:
        return new AuthenticationError(defaultMessage, options);
      case HTTP_STATUS.FORBIDDEN:
        return new ForbiddenError(defaultMessage, options);
      case HTTP_STATUS.NOT_FOUND:
        return new NotFoundError(defaultMessage, options);
      case HTTP_STATUS.METHOD_NOT_ALLOWED:
        return new ValidationError(defaultMessage, void 0, options);
      case HTTP_STATUS.CONFLICT:
        return new ConflictError(defaultMessage, options);
      case HTTP_STATUS.TOO_MANY_REQUESTS:
        return new RateLimitError(defaultMessage, void 0, options);
      case HTTP_STATUS.INTERNAL_SERVER_ERROR:
        return new ServerError(defaultMessage, status, options);
      case HTTP_STATUS.BAD_GATEWAY:
        return new BadGatewayError(defaultMessage, options);
      case HTTP_STATUS.SERVICE_UNAVAILABLE:
        return new ServiceUnavailableError(defaultMessage, options);
      case HTTP_STATUS.GATEWAY_TIMEOUT:
        return new GatewayTimeoutError(defaultMessage, options);
      default:
        if (status >= 500) return new ServerError(defaultMessage, status, options);
        return new NetworkError(defaultMessage, options);
    }
  }
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      httpStatus: this.httpStatus,
      details: this.details,
      timestamp: this.timestamp,
      traceId: this.traceId,
      problem: this.problem,
      metadata: this.metadata
    };
  }
  toString() {
    return `${this.name}: ${this.message} (code: ${this.code})`;
  }
  isRetryable() {
    return isRetryableError(this);
  }
  isAuthError() {
    return this.code === "UNAUTHORIZED" || this.code === "TOKEN_EXPIRED" || this.code === "TOKEN_INVALID";
  }
  isNetworkError() {
    return this.code === "NETWORK_ERROR" || this.code === "TIMEOUT";
  }
  isClientError() {
    return this.httpStatus !== void 0 && this.httpStatus >= 400 && this.httpStatus < 500;
  }
  isServerError() {
    return this.httpStatus !== void 0 && this.httpStatus >= 500;
  }
};
var NetworkError = class extends SdkError {
  constructor(message = "Network error", options) {
    super(message, "NETWORK_ERROR", void 0, options);
  }
};
var TimeoutError = class extends SdkError {
  constructor(message = "Request timeout", timeout, options) {
    super(message, "TIMEOUT", void 0, options);
    __publicField(this, "timeout");
    this.timeout = timeout;
  }
  toJSON() {
    return {
      ...super.toJSON(),
      timeout: this.timeout
    };
  }
};
var CancelledError = class extends SdkError {
  constructor(message = "Request cancelled", options) {
    super(message, "CANCELLED", void 0, options);
  }
};
var AuthenticationError = class extends SdkError {
  constructor(message = "Authentication failed", options) {
    super(message, "UNAUTHORIZED", HTTP_STATUS.UNAUTHORIZED, options);
  }
};
var ForbiddenError = class extends SdkError {
  constructor(message = "Access forbidden", options) {
    super(message, "FORBIDDEN", HTTP_STATUS.FORBIDDEN, options);
  }
};
var NotFoundError = class extends SdkError {
  constructor(message = "Resource not found", options) {
    super(message, "NOT_FOUND", HTTP_STATUS.NOT_FOUND, options);
  }
};
var ValidationError = class extends SdkError {
  constructor(message = "Validation error", details, options) {
    super(message, "VALIDATION_ERROR", HTTP_STATUS.BAD_REQUEST, details === void 0 ? options : {
      ...options,
      details
    });
  }
};
var ConflictError = class extends SdkError {
  constructor(message = "Resource conflict", options) {
    super(message, "CONFLICT", HTTP_STATUS.CONFLICT, options);
  }
};
var RateLimitError = class extends SdkError {
  constructor(message = "Rate limit exceeded", retryAfter, options) {
    super(message, "RATE_LIMIT", HTTP_STATUS.TOO_MANY_REQUESTS, options);
    __publicField(this, "retryAfter");
    this.retryAfter = retryAfter;
  }
  toJSON() {
    return {
      ...super.toJSON(),
      retryAfter: this.retryAfter
    };
  }
};
var ServerError = class extends SdkError {
  constructor(message = "Server error", httpStatus = HTTP_STATUS.INTERNAL_SERVER_ERROR, options) {
    super(message, "SERVER_ERROR", httpStatus, options);
  }
};
var BadGatewayError = class extends ServerError {
  constructor(message = "Bad gateway", options) {
    super(message, HTTP_STATUS.BAD_GATEWAY, options);
    this.code = "BAD_GATEWAY";
  }
};
var ServiceUnavailableError = class extends ServerError {
  constructor(message = "Service unavailable", options) {
    super(message, HTTP_STATUS.SERVICE_UNAVAILABLE, options);
    this.code = "SERVICE_UNAVAILABLE";
  }
};
var GatewayTimeoutError = class extends ServerError {
  constructor(message = "Gateway timeout", options) {
    super(message, HTTP_STATUS.GATEWAY_TIMEOUT, options);
    this.code = "GATEWAY_TIMEOUT";
  }
};
var BusinessError = class extends SdkError {
  constructor(message, code, data, options) {
    super(message, "BUSINESS_ERROR", void 0, options);
    __publicField(this, "businessCode");
    __publicField(this, "data");
    this.businessCode = code;
    this.data = data;
  }
  toJSON() {
    return {
      ...super.toJSON(),
      businessCode: this.businessCode,
      data: this.data
    };
  }
};
function isRetryableError(error) {
  if (!(error instanceof SdkError)) return false;
  return error instanceof NetworkError || error instanceof TimeoutError || error instanceof ServerError || error instanceof RateLimitError || error instanceof BadGatewayError || error instanceof ServiceUnavailableError || error instanceof GatewayTimeoutError;
}

// ../../../sdkwork-sdk-commons/sdkwork-sdk-common-typescript/dist/utils/retry.js
function sleep(ms) {
  return new Promise((resolve2) => setTimeout(resolve2, ms));
}
function calculateDelay(attempt, baseDelay, backoff, maxDelay) {
  let delay;
  switch (backoff) {
    case "fixed":
      delay = baseDelay;
      break;
    case "linear":
      delay = baseDelay * attempt;
      break;
    case "exponential":
      delay = baseDelay * Math.pow(2, attempt - 1);
      break;
    default:
      delay = baseDelay;
  }
  return Math.min(delay, maxDelay);
}
function shouldRetry(error, attempt, config) {
  if (attempt >= config.maxRetries) return false;
  if (config.retryCondition) return config.retryCondition(error, attempt);
  return isRetryableError(error);
}
async function withRetry(fn, config = {}) {
  const fullConfig = {
    ...DEFAULT_RETRY_CONFIG,
    ...config
  };
  let lastError;
  let attempt = 0;
  while (attempt <= fullConfig.maxRetries) try {
    return await fn();
  } catch (error) {
    lastError = error;
    attempt++;
    if (!shouldRetry(lastError, attempt, fullConfig)) throw lastError;
    await sleep(calculateDelay(attempt, fullConfig.retryDelay, fullConfig.retryBackoff, fullConfig.maxRetryDelay));
  }
  throw lastError;
}

// ../../../sdkwork-sdk-commons/sdkwork-sdk-common-typescript/dist/utils/url.js
var DEFAULT_BASE_URL_ENV_KEY = "SDKWORK_API_BASE_URL";
var DEPLOYMENT_MODE_ENV_KEYS = [
  "SDKWORK_DEPLOY_MODE",
  "SDKWORK_DEPLOYMENT_PROFILE",
  "VITE_SDKWORK_DEPLOY_MODE",
  "VITE_SDKWORK_DEPLOYMENT_PROFILE"
];
var ENV_SUFFIXES = [
  {
    label: "dev",
    suffix: "-dev"
  },
  {
    label: "test",
    suffix: "-test"
  },
  {
    label: "staging",
    suffix: "-staging"
  }
];
function readRuntimeEnv(key) {
  var _a, _b, _c, _d;
  const viteValue = (_b = (_a = globalThis["import.meta"]) == null ? void 0 : _a.env) == null ? void 0 : _b[key];
  if (typeof viteValue === "string" && viteValue.length > 0) return viteValue;
  const processValue = (_d = (_c = globalThis["process"]) == null ? void 0 : _c.env) == null ? void 0 : _d[key];
  if (typeof processValue === "string" && processValue.length > 0) return processValue;
}
function splitBaseUrls(value) {
  return (typeof value === "string" ? value : value.join(",")).split(/[,;]/).map((item) => item.trim()).filter((item) => item.length > 0);
}
function getEnvironmentLabel(hostname) {
  const host = (hostname || "").toLowerCase();
  if (!host) return "development";
  if (isLocalhost(host) || isIpAddress(host)) return "development";
  for (const { label, suffix } of ENV_SUFFIXES) if (host.includes(suffix + ".")) return label;
  return "production";
}
function getBrand(hostname) {
  const host = (hostname || "").toLowerCase();
  const parts = host.split(".").filter((p) => p.length > 0);
  if (parts.length < 2) return host || "";
  return parts.slice(-2).join(".");
}
function getApiHostForEnvironment(environmentLabel, brand) {
  const env = environmentLabel.toLowerCase();
  return `${env === "production" ? "api." : `api-${env}.`}${brand.toLowerCase().replace(/^\.+|\.+$/g, "")}`;
}
function normalizeDeploymentMode(value) {
  const normalized = (value != null ? value : "").trim().toLowerCase();
  if (normalized === "cloud" || normalized === "standalone") return normalized;
}
function resolveDeploymentMode(options = {}) {
  var _a, _b;
  const explicit = normalizeDeploymentMode(options.mode);
  if (explicit) return explicit;
  const readEnv2 = (_a = options.readEnv) != null ? _a : readRuntimeEnv;
  for (const key of (_b = options.modeEnvKeys) != null ? _b : DEPLOYMENT_MODE_ENV_KEYS) {
    const fromEnv = normalizeDeploymentMode(readEnv2(key));
    if (fromEnv) return fromEnv;
  }
  return "cloud";
}
function resolveApiHost(options) {
  var _a, _b, _c;
  const hostname = ((_a = options.hostname) != null ? _a : "").trim().toLowerCase();
  if (!hostname) return "";
  const environment = ((_b = options.environment) != null ? _b : getEnvironmentLabel(hostname)).toLowerCase();
  if (environment === "development") return hostname;
  if (((_c = options.mode) != null ? _c : "cloud") === "standalone") return hostname;
  return getApiHostForEnvironment(environment, getBrand(hostname));
}
function resolveApiPort(options) {
  var _a, _b, _c, _d, _e;
  const hostname = ((_a = options.hostname) != null ? _a : "").trim().toLowerCase();
  if (!hostname) return "";
  if (((_b = options.environment) != null ? _b : getEnvironmentLabel(hostname)).toLowerCase() !== "development") return "";
  if (((_c = options.mode) != null ? _c : "cloud") === "standalone") return ((_d = options.currentPort) != null ? _d : "").trim();
  return ((_e = options.devPort) != null ? _e : "3910").trim();
}
function resolveBaseUrl(options = {}) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i;
  const readEnv2 = (_a = options.readEnv) != null ? _a : readRuntimeEnv;
  const candidates = options.baseUrls ? splitBaseUrls(options.baseUrls) : splitBaseUrls((_c = readEnv2((_b = options.envKey) != null ? _b : DEFAULT_BASE_URL_ENV_KEY)) != null ? _c : "");
  const currentHost = ((_d = options.hostname) != null ? _d : getCurrentHostname()).trim().toLowerCase();
  const currentProtocol = ((_e = options.protocol) != null ? _e : getCurrentProtocol()).trim().toLowerCase() || "https";
  const currentPort = ((_f = options.port) != null ? _f : getCurrentPort()).trim();
  const mode = resolveDeploymentMode({
    mode: options.mode,
    modeEnvKeys: options.modeEnvKeys,
    readEnv: readEnv2
  });
  const environmentLabel = getEnvironmentLabel(currentHost);
  const devPort = ((_h = (_g = options.devPort) != null ? _g : readEnv2("SDKWORK_API_DEV_PORT")) != null ? _h : "3910").trim();
  const normalizeCandidate = options.preservePath ? removeTrailingSlash : toBaseOrigin;
  const targetHost = resolveApiHost({
    hostname: currentHost,
    mode,
    environment: environmentLabel,
    devPort
  });
  const targetPort = resolveApiPort({
    hostname: currentHost,
    mode,
    environment: environmentLabel,
    currentPort,
    devPort
  });
  const derivedUrl = targetHost ? `${currentProtocol}://${targetHost}${targetPort ? `:${targetPort}` : ""}` : "";
  const result = (url, reason) => ({
    url,
    reason,
    mode,
    environment: environmentLabel,
    host: targetHost
  });
  if (candidates.length === 0) return derivedUrl ? result(derivedUrl, "derived-from-host") : result("", "empty");
  const parts = candidates.map((candidate) => ({
    candidate,
    ...candidateParts(candidate)
  }));
  const exact = parts.find((item) => item.host === targetHost && item.port === targetPort && item.protocol.toLowerCase() === currentProtocol);
  if (exact) return result(normalizeCandidate(exact.candidate), "current-host-match");
  const sameHostPort = parts.find((item) => item.host === targetHost && item.port === targetPort);
  if (sameHostPort) return result(normalizeCandidate(alignCandidateProtocol(sameHostPort.candidate, currentProtocol)), "current-host-match");
  const sameHost = parts.find((item) => item.host === targetHost && (!item.port || !targetPort));
  if (sameHost) return result(normalizeCandidate(alignCandidateProtocol(sameHost.candidate, currentProtocol)), "current-host-match");
  if (environmentLabel === "development") {
    const localCandidate = parts.find((item) => item.host.length > 0 && (isLocalhost(item.host) || isIpAddress(item.host)));
    if (localCandidate) return result(normalizeCandidate(localCandidate.candidate), "development-local-candidate");
  }
  if (derivedUrl) return result(derivedUrl, "derived-from-host");
  return result(normalizeCandidate((_i = candidates[0]) != null ? _i : ""), "fallback-first");
}
function resolveBaseUrlWithAlignProtocol(options = {}) {
  const resolution = resolveBaseUrl(options);
  if (typeof window === "undefined") return resolution;
  const aligned = alignBaseUrlToPageProtocol(resolution.url);
  if (aligned === resolution.url) return resolution;
  return {
    ...resolution,
    url: aligned
  };
}
function alignBaseUrlToPageProtocol(url, options = {}) {
  var _a;
  const aligned = alignCandidateProtocol(url, ((_a = options.protocol) != null ? _a : getCurrentProtocol()).replace(/:$/u, "").toLowerCase() || "https");
  if (aligned === url) return url;
  try {
    const parsed = new URL(aligned);
    if (parsed.pathname === "/" && !parsed.search && !parsed.hash) return parsed.origin;
    return parsed.toString().replace(/\/$/u, "");
  } catch {
    return aligned;
  }
}
function alignCandidateProtocol(candidate, currentProtocol) {
  const parts = candidateParts(candidate);
  if (!parts.host || !parts.protocol || parts.protocol === currentProtocol) return candidate;
  const rewritable = (scheme) => scheme === "http" || scheme === "https";
  if (!rewritable(parts.protocol) || !rewritable(currentProtocol)) return candidate;
  return setProtocol(candidate, currentProtocol);
}
function candidateParts(candidate) {
  if (!isAbsolute(candidate)) return {
    protocol: "",
    host: "",
    port: ""
  };
  try {
    const parsed = new URL(candidate);
    return {
      protocol: parsed.protocol.replace(":", "").toLowerCase(),
      host: parsed.hostname.toLowerCase(),
      port: parsed.port
    };
  } catch {
    return {
      protocol: "",
      host: "",
      port: ""
    };
  }
}
function toBaseOrigin(url) {
  try {
    const parsed = new URL(url);
    parsed.pathname = "";
    parsed.search = "";
    parsed.hash = "";
    return parsed.origin;
  } catch {
    return url.replace(/\/+$/, "");
  }
}
function getCurrentHostname() {
  if (typeof window !== "undefined" && window.location) return window.location.hostname;
  return "";
}
function getCurrentProtocol() {
  if (typeof window !== "undefined" && window.location) return window.location.protocol.replace(":", "");
  return "https";
}
function getCurrentPort() {
  var _a;
  if (typeof window !== "undefined" && window.location) return (_a = window.location.port) != null ? _a : "";
  return "";
}
function isAbsolute(url) {
  return /^[a-z][a-z\d+\-.]*:\/\//i.test(url);
}
function getHostname(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}
function setProtocol(url, protocol) {
  try {
    const parsed = new URL(url);
    parsed.protocol = protocol.endsWith(":") ? protocol : `${protocol}:`;
    return parsed.href;
  } catch {
    return url;
  }
}
function isLocalhost(url) {
  const hostname = hostnameOf(url).toLowerCase();
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname.startsWith("192.168.") || hostname.startsWith("10.") || hostname.startsWith("172.");
}
function isIpAddress(url) {
  const hostname = hostnameOf(url);
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || /^\[?([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\]?$/.test(hostname);
}
function hostnameOf(url) {
  if (isAbsolute(url)) return getHostname(url);
  return url;
}
function removeTrailingSlash(url) {
  try {
    const parsed = new URL(url);
    parsed.pathname = parsed.pathname.replace(/\/+$/, "") || "/";
    return parsed.href;
  } catch {
    return url.replace(/\/+$/, "") || "/";
  }
}

// ../../../sdkwork-sdk-commons/sdkwork-sdk-common-typescript/dist/node_modules/.pnpm/@sdkwork_utils@0.11.0/node_modules/@sdkwork/utils/dist/runtime/random.js
function getCrypto() {
  const crypto = globalThis.crypto;
  if (!(crypto == null ? void 0 : crypto.getRandomValues)) throw new Error("Web Crypto API is not available in this environment.");
  return crypto;
}
function randomBytes(length) {
  const bytes = new Uint8Array(length);
  getCrypto().getRandomValues(bytes);
  return bytes;
}
function randomUuid() {
  const crypto = getCrypto();
  if (crypto.randomUUID) return crypto.randomUUID();
  const bytes = randomBytes(16);
  bytes[6] = bytes[6] & 15 | 64;
  bytes[8] = bytes[8] & 63 | 128;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// ../../../sdkwork-sdk-commons/sdkwork-sdk-common-typescript/dist/node_modules/.pnpm/@sdkwork_utils@0.11.0/node_modules/@sdkwork/utils/dist/id.js
function uuid() {
  return randomUuid();
}

// ../../../sdkwork-sdk-commons/sdkwork-sdk-common-typescript/dist/utils/string.js
var StringUtils;
(function(_StringUtils) {
  function isEmpty(value) {
    return value === null || value === void 0 || value === "";
  }
  _StringUtils.isEmpty = isEmpty;
  function isNotEmpty(value) {
    return !isEmpty(value);
  }
  _StringUtils.isNotEmpty = isNotEmpty;
  function isBlank2(value) {
    if (isEmpty(value)) return true;
    if (typeof value !== "string") return false;
    return value.trim().length === 0;
  }
  _StringUtils.isBlank = isBlank2;
  function isNotBlank(value) {
    return !isBlank2(value);
  }
  _StringUtils.isNotBlank = isNotBlank;
  function trim2(value) {
    var _a;
    return (_a = value == null ? void 0 : value.trim()) != null ? _a : "";
  }
  _StringUtils.trim = trim2;
  function trimStart(value) {
    var _a;
    return (_a = value == null ? void 0 : value.trimStart()) != null ? _a : "";
  }
  _StringUtils.trimStart = trimStart;
  function trimEnd(value) {
    var _a;
    return (_a = value == null ? void 0 : value.trimEnd()) != null ? _a : "";
  }
  _StringUtils.trimEnd = trimEnd;
  function toLowerCase(value) {
    var _a;
    return (_a = value == null ? void 0 : value.toLowerCase()) != null ? _a : "";
  }
  _StringUtils.toLowerCase = toLowerCase;
  function toUpperCase(value) {
    var _a;
    return (_a = value == null ? void 0 : value.toUpperCase()) != null ? _a : "";
  }
  _StringUtils.toUpperCase = toUpperCase;
  function capitalize(value) {
    if (isEmpty(value)) return "";
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  }
  _StringUtils.capitalize = capitalize;
  function capitalizeWords(value) {
    if (isEmpty(value)) return "";
    return value.split(/\s+/).map(capitalize).join(" ");
  }
  _StringUtils.capitalizeWords = capitalizeWords;
  function camelCase(value) {
    if (isEmpty(value)) return "";
    return value.replace(/[-_\s]+(.)?/g, (_, char) => char ? char.toUpperCase() : "").replace(/^(.)/, (char) => char.toLowerCase());
  }
  _StringUtils.camelCase = camelCase;
  function pascalCase(value) {
    if (isEmpty(value)) return "";
    const camel = camelCase(value);
    return camel.charAt(0).toUpperCase() + camel.slice(1);
  }
  _StringUtils.pascalCase = pascalCase;
  function kebabCase(value) {
    if (isEmpty(value)) return "";
    return value.replace(/([a-z])([A-Z])/g, "$1-$2").replace(/[\s_]+/g, "-").toLowerCase();
  }
  _StringUtils.kebabCase = kebabCase;
  function snakeCase(value) {
    if (isEmpty(value)) return "";
    return value.replace(/([a-z])([A-Z])/g, "$1_$2").replace(/[\s-]+/g, "_").toLowerCase();
  }
  _StringUtils.snakeCase = snakeCase;
  function constantCase(value) {
    return snakeCase(value).toUpperCase();
  }
  _StringUtils.constantCase = constantCase;
  function truncate(value, length, suffix = "...") {
    if (isEmpty(value) || value.length <= length) return value != null ? value : "";
    return value.slice(0, length - suffix.length) + suffix;
  }
  _StringUtils.truncate = truncate;
  function truncateWords(value, wordCount2, suffix = "...") {
    if (isEmpty(value)) return "";
    const words2 = value.split(/\s+/);
    if (words2.length <= wordCount2) return value;
    return words2.slice(0, wordCount2).join(" ") + suffix;
  }
  _StringUtils.truncateWords = truncateWords;
  function padStart(value, length, padChar = " ") {
    var _a;
    return (_a = value == null ? void 0 : value.padStart(length, padChar)) != null ? _a : "";
  }
  _StringUtils.padStart = padStart;
  function padEnd(value, length, padChar = " ") {
    var _a;
    return (_a = value == null ? void 0 : value.padEnd(length, padChar)) != null ? _a : "";
  }
  _StringUtils.padEnd = padEnd;
  function repeat(value, count) {
    if (isEmpty(value) || count <= 0) return "";
    return value.repeat(count);
  }
  _StringUtils.repeat = repeat;
  function reverse(value) {
    if (isEmpty(value)) return "";
    return value.split("").reverse().join("");
  }
  _StringUtils.reverse = reverse;
  function startsWith(value, prefix) {
    var _a;
    return (_a = value == null ? void 0 : value.startsWith(prefix)) != null ? _a : false;
  }
  _StringUtils.startsWith = startsWith;
  function endsWith(value, suffix) {
    var _a;
    return (_a = value == null ? void 0 : value.endsWith(suffix)) != null ? _a : false;
  }
  _StringUtils.endsWith = endsWith;
  function contains(value, search) {
    var _a;
    return (_a = value == null ? void 0 : value.includes(search)) != null ? _a : false;
  }
  _StringUtils.contains = contains;
  function containsIgnoreCase(value, search) {
    var _a;
    return (_a = value == null ? void 0 : value.toLowerCase().includes(search.toLowerCase())) != null ? _a : false;
  }
  _StringUtils.containsIgnoreCase = containsIgnoreCase;
  function indexOf(value, search) {
    var _a;
    return (_a = value == null ? void 0 : value.indexOf(search)) != null ? _a : -1;
  }
  _StringUtils.indexOf = indexOf;
  function lastIndexOf(value, search) {
    var _a;
    return (_a = value == null ? void 0 : value.lastIndexOf(search)) != null ? _a : -1;
  }
  _StringUtils.lastIndexOf = lastIndexOf;
  function substring(value, start, end) {
    if (isEmpty(value)) return "";
    return end !== void 0 ? value.slice(start, end) : value.slice(start);
  }
  _StringUtils.substring = substring;
  function slice(value, start, end) {
    return substring(value, start, end);
  }
  _StringUtils.slice = slice;
  function split(value, separator, limit) {
    if (isEmpty(value)) return [];
    return value.split(separator, limit);
  }
  _StringUtils.split = split;
  function join2(values, separator = "") {
    var _a;
    return (_a = values == null ? void 0 : values.join(separator)) != null ? _a : "";
  }
  _StringUtils.join = join2;
  function replace2(value, search, replacement) {
    var _a;
    return (_a = value == null ? void 0 : value.replace(search, replacement)) != null ? _a : "";
  }
  _StringUtils.replace = replace2;
  function replaceAll(value, search, replacement) {
    var _a;
    return (_a = value == null ? void 0 : value.replaceAll(search, replacement)) != null ? _a : "";
  }
  _StringUtils.replaceAll = replaceAll;
  function remove(value, search) {
    var _a;
    return (_a = value == null ? void 0 : value.replace(search, "")) != null ? _a : "";
  }
  _StringUtils.remove = remove;
  function removeAll(value, search) {
    var _a;
    const regex = typeof search === "string" ? new RegExp(search, "g") : new RegExp(search.source, `${search.flags}g`);
    return (_a = value == null ? void 0 : value.replace(regex, "")) != null ? _a : "";
  }
  _StringUtils.removeAll = removeAll;
  function countOccurrences(value, search) {
    if (isEmpty(value) || isEmpty(search)) return 0;
    return (value.match(new RegExp(escapeRegex(search), "g")) || []).length;
  }
  _StringUtils.countOccurrences = countOccurrences;
  function escapeHtml(value) {
    var _a;
    const htmlEntities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };
    return (_a = value == null ? void 0 : value.replace(/[&<>"']/g, (char) => htmlEntities[char] || char)) != null ? _a : "";
  }
  _StringUtils.escapeHtml = escapeHtml;
  function unescapeHtml(value) {
    var _a;
    const htmlEntities = {
      "&amp;": "&",
      "&lt;": "<",
      "&gt;": ">",
      "&quot;": '"',
      "&#39;": "'",
      "&#x27;": "'",
      "&apos;": "'"
    };
    return (_a = value == null ? void 0 : value.replace(/&(?:amp|lt|gt|quot|#39|#x27|apos);/g, (entity) => htmlEntities[entity] || entity)) != null ? _a : "";
  }
  _StringUtils.unescapeHtml = unescapeHtml;
  function escapeRegex(value) {
    var _a;
    return (_a = value == null ? void 0 : value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) != null ? _a : "";
  }
  _StringUtils.escapeRegex = escapeRegex;
  function isNumeric(value) {
    if (isEmpty(value)) return false;
    return !isNaN(Number(value)) && !isNaN(parseFloat(value));
  }
  _StringUtils.isNumeric = isNumeric;
  function isAlpha(value) {
    if (isEmpty(value)) return false;
    return /^[a-zA-Z]+$/.test(value);
  }
  _StringUtils.isAlpha = isAlpha;
  function isAlphanumeric(value) {
    if (isEmpty(value)) return false;
    return /^[a-zA-Z0-9]+$/.test(value);
  }
  _StringUtils.isAlphanumeric = isAlphanumeric;
  function isHex(value) {
    if (isEmpty(value)) return false;
    return /^[0-9a-fA-F]+$/.test(value);
  }
  _StringUtils.isHex = isHex;
  function isUuid(value) {
    if (isEmpty(value)) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }
  _StringUtils.isUuid = isUuid;
  function isEmail(value) {
    if (isEmpty(value)) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }
  _StringUtils.isEmail = isEmail;
  function isUrl(value) {
    if (isEmpty(value)) return false;
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }
  _StringUtils.isUrl = isUrl;
  function isPhoneNumber(value) {
    if (isEmpty(value)) return false;
    return /^\+?[\d\s-()]{10,}$/.test(value);
  }
  _StringUtils.isPhoneNumber = isPhoneNumber;
  function mask(value, start, end, maskChar = "*") {
    if (isEmpty(value)) return "";
    const actualStart = Math.max(0, start);
    const actualEnd = Math.min(value.length, end);
    if (actualStart >= actualEnd) return value;
    const masked = maskChar.repeat(actualEnd - actualStart);
    return value.slice(0, actualStart) + masked + value.slice(actualEnd);
  }
  _StringUtils.mask = mask;
  function maskEmail(value) {
    if (!isEmail(value)) return value;
    const parts = value.split("@");
    const localPart = parts[0];
    const domain = parts[1];
    if (!localPart || !domain) return value;
    return `${mask(localPart, 2, localPart.length - 2)}@${domain}`;
  }
  _StringUtils.maskEmail = maskEmail;
  function maskPhone(value) {
    if (isEmpty(value)) return value;
    const digits = value.replace(/\D/g, "");
    if (digits.length < 7) return value;
    return mask(digits, 3, digits.length - 4);
  }
  _StringUtils.maskPhone = maskPhone;
  function maskCreditCard(value) {
    if (isEmpty(value)) return value;
    const digits = value.replace(/\D/g, "");
    if (digits.length < 8) return value;
    return mask(digits, 4, digits.length - 4);
  }
  _StringUtils.maskCreditCard = maskCreditCard;
  function formatNumber(value, options) {
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num)) return "";
    return num.toLocaleString(void 0, options);
  }
  _StringUtils.formatNumber = formatNumber;
  function formatCurrency(value, currency = "USD", locale) {
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num)) return "";
    return num.toLocaleString(locale, {
      style: "currency",
      currency
    });
  }
  _StringUtils.formatCurrency = formatCurrency;
  function formatPercentage(value, decimals = 0) {
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num)) return "";
    return `${(num * 100).toFixed(decimals)}%`;
  }
  _StringUtils.formatPercentage = formatPercentage;
  function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = [
      "Bytes",
      "KB",
      "MB",
      "GB",
      "TB",
      "PB"
    ];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
  }
  _StringUtils.formatBytes = formatBytes;
  function random(length = 16, charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789") {
    let result = "";
    for (let i = 0; i < length; i++) result += charset.charAt(Math.floor(Math.random() * charset.length));
    return result;
  }
  _StringUtils.random = random;
  function uuid$1() {
    return uuid();
  }
  _StringUtils.uuid = uuid$1;
  function slugify(value) {
    var _a;
    return (_a = value == null ? void 0 : value.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "")) != null ? _a : "";
  }
  _StringUtils.slugify = slugify;
  function unslugify(value) {
    var _a;
    return (_a = value == null ? void 0 : value.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())) != null ? _a : "";
  }
  _StringUtils.unslugify = unslugify;
  function levenshteinDistance(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) if (matrix[0]) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) for (let j = 1; j <= a.length; j++) if (b.charAt(i - 1) === a.charAt(j - 1)) matrix[i][j] = matrix[i - 1][j - 1];
    else matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
    return matrix[b.length][a.length];
  }
  _StringUtils.levenshteinDistance = levenshteinDistance;
  function similarity(a, b) {
    if (isEmpty(a) && isEmpty(b)) return 1;
    if (isEmpty(a) || isEmpty(b)) return 0;
    return 1 - levenshteinDistance(a, b) / Math.max(a.length, b.length);
  }
  _StringUtils.similarity = similarity;
  function fuzzyMatch(text, pattern, threshold = 0.6) {
    return similarity(text, pattern) >= threshold;
  }
  _StringUtils.fuzzyMatch = fuzzyMatch;
  function equals(a, b, ignoreCase = false) {
    if (ignoreCase) return (a == null ? void 0 : a.toLowerCase()) === (b == null ? void 0 : b.toLowerCase());
    return a === b;
  }
  _StringUtils.equals = equals;
  function equalsIgnoreCase(a, b) {
    return equals(a, b, true);
  }
  _StringUtils.equalsIgnoreCase = equalsIgnoreCase;
  function wordCount(value) {
    if (isEmpty(value)) return 0;
    return value.trim().split(/\s+/).filter(Boolean).length;
  }
  _StringUtils.wordCount = wordCount;
  function characterCount(value, includeSpaces = true) {
    if (isEmpty(value)) return 0;
    return includeSpaces ? value.length : value.replace(/\s/g, "").length;
  }
  _StringUtils.characterCount = characterCount;
  function lineCount(value) {
    if (isEmpty(value)) return 0;
    return value.split(/\r?\n/).length;
  }
  _StringUtils.lineCount = lineCount;
  function splitLines(value) {
    if (isEmpty(value)) return [];
    return value.split(/\r?\n/);
  }
  _StringUtils.splitLines = splitLines;
  function words(value) {
    if (isEmpty(value)) return [];
    return value.trim().split(/\s+/).filter(Boolean);
  }
  _StringUtils.words = words;
  function charAt(value, index) {
    var _a;
    return (_a = value == null ? void 0 : value.charAt(index)) != null ? _a : "";
  }
  _StringUtils.charAt = charAt;
  function charCodeAt(value, index) {
    var _a;
    return (_a = value == null ? void 0 : value.charCodeAt(index)) != null ? _a : NaN;
  }
  _StringUtils.charCodeAt = charCodeAt;
  function fromCharCode(...codes) {
    return String.fromCharCode(...codes);
  }
  _StringUtils.fromCharCode = fromCharCode;
  function insert(value, index, insertValue) {
    if (isEmpty(value)) return insertValue;
    return value.slice(0, index) + insertValue + value.slice(index);
  }
  _StringUtils.insert = insert;
  function swapCase(value) {
    var _a;
    return (_a = value == null ? void 0 : value.replace(/[a-zA-Z]/g, (char) => {
      return char === char.toUpperCase() ? char.toLowerCase() : char.toUpperCase();
    })) != null ? _a : "";
  }
  _StringUtils.swapCase = swapCase;
  function surround(value, wrapper) {
    return `${wrapper}${value}${wrapper}`;
  }
  _StringUtils.surround = surround;
  function quote(value, quoteChar = '"') {
    return `${quoteChar}${value}${quoteChar}`;
  }
  _StringUtils.quote = quote;
  function unquote(value) {
    if (isEmpty(value)) return "";
    if (value.startsWith('"') && value.endsWith('"') || value.startsWith("'") && value.endsWith("'") || value.startsWith("`") && value.endsWith("`")) return value.slice(1, -1);
    return value;
  }
  _StringUtils.unquote = unquote;
  function wrap(value, prefix, suffix = prefix) {
    return `${prefix}${value}${suffix}`;
  }
  _StringUtils.wrap = wrap;
  function unwrap(value, prefix, suffix = prefix) {
    if (isEmpty(value)) return "";
    if (value.startsWith(prefix) && value.endsWith(suffix)) return value.slice(prefix.length, -suffix.length);
    return value;
  }
  _StringUtils.unwrap = unwrap;
  function template(templateStr, values) {
    var _a;
    return (_a = templateStr == null ? void 0 : templateStr.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      var _a2;
      return String((_a2 = values[key]) != null ? _a2 : "");
    })) != null ? _a : "";
  }
  _StringUtils.template = template;
  function interpolate(templateStr, values) {
    return template(templateStr, values);
  }
  _StringUtils.interpolate = interpolate;
  function dedent(value) {
    const lines = value.split("\n");
    const minIndent = Math.min(...lines.filter((line) => line.trim().length > 0).map((line) => {
      var _a, _b;
      return (_b = (_a = line.match(/^\s*/)) == null ? void 0 : _a[0].length) != null ? _b : 0;
    }));
    return lines.map((line) => line.slice(minIndent)).join("\n");
  }
  _StringUtils.dedent = dedent;
  function indent(value, spaces = 2) {
    const indentation = " ".repeat(spaces);
    return value.split("\n").map((line) => indentation + line).join("\n");
  }
  _StringUtils.indent = indent;
  function center(value, width, padChar = " ") {
    if (isEmpty(value) || value.length >= width) return value != null ? value : "";
    const padding = width - value.length;
    const leftPad = Math.floor(padding / 2);
    const rightPad = padding - leftPad;
    return padChar.repeat(leftPad) + value + padChar.repeat(rightPad);
  }
  _StringUtils.center = center;
  function alignLeft(value, width, padChar = " ") {
    return padEnd(value, width, padChar);
  }
  _StringUtils.alignLeft = alignLeft;
  function alignRight(value, width, padChar = " ") {
    return padStart(value, width, padChar);
  }
  _StringUtils.alignRight = alignRight;
  function alignCenter(value, width, padChar = " ") {
    return center(value, width, padChar);
  }
  _StringUtils.alignCenter = alignCenter;
  function toBoolean(value) {
    return [
      "true",
      "1",
      "yes",
      "on",
      "y"
    ].includes(value == null ? void 0 : value.toLowerCase().trim());
  }
  _StringUtils.toBoolean = toBoolean;
  function toNumber(value, defaultValue = 0) {
    const num = parseFloat(value);
    return isNaN(num) ? defaultValue : num;
  }
  _StringUtils.toNumber = toNumber;
  function toArray(value, separator = ",") {
    return split(value, separator);
  }
  _StringUtils.toArray = toArray;
  function hashCode(value) {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      const char = value.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash;
  }
  _StringUtils.hashCode = hashCode;
  function isPalindrome(value) {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9]/g, "");
    return cleaned === cleaned.split("").reverse().join("");
  }
  _StringUtils.isPalindrome = isPalindrome;
  function isAnagram(a, b) {
    const normalize2 = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "").split("").sort().join("");
    return normalize2(a) === normalize2(b);
  }
  _StringUtils.isAnagram = isAnagram;
  function reverseWords(value) {
    var _a;
    return (_a = value == null ? void 0 : value.split(/\s+/).reverse().join(" ")) != null ? _a : "";
  }
  _StringUtils.reverseWords = reverseWords;
  function sortCharacters(value) {
    var _a;
    return (_a = value == null ? void 0 : value.split("").sort().join("")) != null ? _a : "";
  }
  _StringUtils.sortCharacters = sortCharacters;
  function uniqueCharacters(value) {
    return [...new Set(value)].join("");
  }
  _StringUtils.uniqueCharacters = uniqueCharacters;
  function removeDuplicates(value) {
    var _a;
    return (_a = value == null ? void 0 : value.split("").filter((char, index, arr) => arr.indexOf(char) === index).join("")) != null ? _a : "";
  }
  _StringUtils.removeDuplicates = removeDuplicates;
  function longestCommonSubstring(a, b) {
    if (isEmpty(a) || isEmpty(b)) return "";
    const matrix = Array(a.length + 1).fill(null).map(() => Array(b.length + 1).fill(0));
    let maxLength = 0;
    let endIndex = 0;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) if (a[i - 1] === b[j - 1]) {
      matrix[i][j] = matrix[i - 1][j - 1] + 1;
      if (matrix[i][j] > maxLength) {
        maxLength = matrix[i][j];
        endIndex = i;
      }
    }
    return a.slice(endIndex - maxLength, endIndex);
  }
  _StringUtils.longestCommonSubstring = longestCommonSubstring;
  function longestCommonPrefix(strings) {
    var _a, _b, _c;
    if (strings.length === 0) return "";
    if (strings.length === 1) return (_a = strings[0]) != null ? _a : "";
    const sorted = [...strings].sort();
    const first = (_b = sorted[0]) != null ? _b : "";
    const last = (_c = sorted[sorted.length - 1]) != null ? _c : "";
    let i = 0;
    while (i < first.length && first[i] === last[i]) i++;
    return first.slice(0, i);
  }
  _StringUtils.longestCommonPrefix = longestCommonPrefix;
  function longestCommonSuffix(strings) {
    return longestCommonPrefix(strings.map((s) => {
      var _a;
      return (_a = s == null ? void 0 : s.split("").reverse().join("")) != null ? _a : "";
    })).split("").reverse().join("");
  }
  _StringUtils.longestCommonSuffix = longestCommonSuffix;
  function truncateMiddle(value, maxLength, separator = "...") {
    if (isEmpty(value) || value.length <= maxLength) return value != null ? value : "";
    const charsToShow = maxLength - separator.length;
    const frontChars = Math.ceil(charsToShow / 2);
    const backChars = Math.floor(charsToShow / 2);
    return value.slice(0, frontChars) + separator + value.slice(-backChars);
  }
  _StringUtils.truncateMiddle = truncateMiddle;
  function ellipsis(value, maxLength) {
    return truncate(value, maxLength, "...");
  }
  _StringUtils.ellipsis = ellipsis;
  function ellipsisMiddle(value, maxLength) {
    return truncateMiddle(value, maxLength, "...");
  }
  _StringUtils.ellipsisMiddle = ellipsisMiddle;
  function pad(value, length, padChar = " ") {
    return center(value, length, padChar);
  }
  _StringUtils.pad = pad;
  function padCenter(value, length, padChar = " ") {
    return center(value, length, padChar);
  }
  _StringUtils.padCenter = padCenter;
  function isAscii(value) {
    return /^[\x00-\x7F]*$/.test(value);
  }
  _StringUtils.isAscii = isAscii;
  function isLowerCase(value) {
    return value === value.toLowerCase();
  }
  _StringUtils.isLowerCase = isLowerCase;
  function isUpperCase(value) {
    return value === value.toUpperCase();
  }
  _StringUtils.isUpperCase = isUpperCase;
  function isCapitalized(value) {
    return value.charAt(0) === value.charAt(0).toUpperCase();
  }
  _StringUtils.isCapitalized = isCapitalized;
  function swapPrefix(value, oldPrefix, newPrefix) {
    if (value.startsWith(oldPrefix)) return newPrefix + value.slice(oldPrefix.length);
    return value;
  }
  _StringUtils.swapPrefix = swapPrefix;
  function swapSuffix(value, oldSuffix, newSuffix) {
    if (value.endsWith(oldSuffix)) return value.slice(0, -oldSuffix.length) + newSuffix;
    return value;
  }
  _StringUtils.swapSuffix = swapSuffix;
  function ensurePrefix(value, prefix) {
    return value.startsWith(prefix) ? value : prefix + value;
  }
  _StringUtils.ensurePrefix = ensurePrefix;
  function ensureSuffix(value, suffix) {
    return value.endsWith(suffix) ? value : value + suffix;
  }
  _StringUtils.ensureSuffix = ensureSuffix;
  function removePrefix(value, prefix) {
    return value.startsWith(prefix) ? value.slice(prefix.length) : value;
  }
  _StringUtils.removePrefix = removePrefix;
  function removeSuffix(value, suffix) {
    return value.endsWith(suffix) ? value.slice(0, -suffix.length) : value;
  }
  _StringUtils.removeSuffix = removeSuffix;
  function take(value, n) {
    var _a;
    return (_a = value == null ? void 0 : value.slice(0, n)) != null ? _a : "";
  }
  _StringUtils.take = take;
  function takeRight(value, n) {
    var _a;
    return (_a = value == null ? void 0 : value.slice(-n)) != null ? _a : "";
  }
  _StringUtils.takeRight = takeRight;
  function takeWhile(value, predicate) {
    let result = "";
    for (const char of value != null ? value : "") {
      if (!predicate(char)) break;
      result += char;
    }
    return result;
  }
  _StringUtils.takeWhile = takeWhile;
  function takeRightWhile(value, predicate) {
    var _a, _b;
    let result = "";
    for (let i = ((_a = value == null ? void 0 : value.length) != null ? _a : 0) - 1; i >= 0; i--) {
      const char = (_b = value == null ? void 0 : value.charAt(i)) != null ? _b : "";
      if (!predicate(char)) break;
      result = char + result;
    }
    return result;
  }
  _StringUtils.takeRightWhile = takeRightWhile;
  function drop(value, n) {
    var _a;
    return (_a = value == null ? void 0 : value.slice(n)) != null ? _a : "";
  }
  _StringUtils.drop = drop;
  function dropRight(value, n) {
    var _a;
    return (_a = value == null ? void 0 : value.slice(0, -n)) != null ? _a : "";
  }
  _StringUtils.dropRight = dropRight;
  function dropWhile(value, predicate) {
    var _a;
    let i = 0;
    for (const char of value != null ? value : "") {
      if (!predicate(char)) break;
      i++;
    }
    return (_a = value == null ? void 0 : value.slice(i)) != null ? _a : "";
  }
  _StringUtils.dropWhile = dropWhile;
  function dropRightWhile(value, predicate) {
    var _a, _b, _c;
    let i = ((_a = value == null ? void 0 : value.length) != null ? _a : 0) - 1;
    while (i >= 0 && predicate((_b = value == null ? void 0 : value.charAt(i)) != null ? _b : "")) i--;
    return (_c = value == null ? void 0 : value.slice(0, i + 1)) != null ? _c : "";
  }
  _StringUtils.dropRightWhile = dropRightWhile;
  function countLines(value) {
    return lineCount(value);
  }
  _StringUtils.countLines = countLines;
  function getLine(value, lineNumber) {
    var _a;
    return (_a = splitLines(value)[lineNumber]) != null ? _a : "";
  }
  _StringUtils.getLine = getLine;
  function getLines(value) {
    return splitLines(value);
  }
  _StringUtils.getLines = getLines;
  function isSingleLine(value) {
    return !(value == null ? void 0 : value.includes("\n"));
  }
  _StringUtils.isSingleLine = isSingleLine;
  function isMultiLine(value) {
    var _a;
    return (_a = value == null ? void 0 : value.includes("\n")) != null ? _a : false;
  }
  _StringUtils.isMultiLine = isMultiLine;
  function normalizeLineEndings(value, lineEnding = "\n") {
    var _a;
    return (_a = value == null ? void 0 : value.replace(/\r\n|\r|\n/g, lineEnding)) != null ? _a : "";
  }
  _StringUtils.normalizeLineEndings = normalizeLineEndings;
  function toCamelCase(value) {
    return camelCase(value);
  }
  _StringUtils.toCamelCase = toCamelCase;
  function toKebabCase(value) {
    return kebabCase(value);
  }
  _StringUtils.toKebabCase = toKebabCase;
  function toSnakeCase(value) {
    return snakeCase(value);
  }
  _StringUtils.toSnakeCase = toSnakeCase;
  function toPascalCase(value) {
    return pascalCase(value);
  }
  _StringUtils.toPascalCase = toPascalCase;
  function toConstantCase(value) {
    return constantCase(value);
  }
  _StringUtils.toConstantCase = toConstantCase;
  function toSentenceCase(value) {
    if (isEmpty(value)) return "";
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  }
  _StringUtils.toSentenceCase = toSentenceCase;
  function toTitleCase(value) {
    return capitalizeWords(value);
  }
  _StringUtils.toTitleCase = toTitleCase;
  function toCapitalCase(value) {
    return capitalizeWords(value);
  }
  _StringUtils.toCapitalCase = toCapitalCase;
  function toDotCase(value) {
    var _a;
    return (_a = value == null ? void 0 : value.replace(/([a-z])([A-Z])/g, "$1.$2").replace(/[-_\s]+/g, ".").toLowerCase()) != null ? _a : "";
  }
  _StringUtils.toDotCase = toDotCase;
  function toPathCase(value) {
    var _a;
    return (_a = value == null ? void 0 : value.replace(/([a-z])([A-Z])/g, "$1/$2").replace(/[-_\s]+/g, "/").toLowerCase()) != null ? _a : "";
  }
  _StringUtils.toPathCase = toPathCase;
  function stripTags(value) {
    var _a;
    return (_a = value == null ? void 0 : value.replace(/<[^>]*>/g, "")) != null ? _a : "";
  }
  _StringUtils.stripTags = stripTags;
  function stripNumbers(value) {
    var _a;
    return (_a = value == null ? void 0 : value.replace(/\d+/g, "")) != null ? _a : "";
  }
  _StringUtils.stripNumbers = stripNumbers;
  function stripWhitespace(value) {
    var _a;
    return (_a = value == null ? void 0 : value.replace(/\s+/g, "")) != null ? _a : "";
  }
  _StringUtils.stripWhitespace = stripWhitespace;
  function stripPunctuation(value) {
    var _a;
    return (_a = value == null ? void 0 : value.replace(/[^\w\s]/g, "")) != null ? _a : "";
  }
  _StringUtils.stripPunctuation = stripPunctuation;
  function normalizeWhitespace(value) {
    var _a;
    return (_a = value == null ? void 0 : value.replace(/\s+/g, " ").trim()) != null ? _a : "";
  }
  _StringUtils.normalizeWhitespace = normalizeWhitespace;
  function includesAll(value, searches) {
    return searches.every((search) => {
      var _a;
      return (_a = value == null ? void 0 : value.includes(search)) != null ? _a : false;
    });
  }
  _StringUtils.includesAll = includesAll;
  function includesAny(value, searches) {
    return searches.some((search) => {
      var _a;
      return (_a = value == null ? void 0 : value.includes(search)) != null ? _a : false;
    });
  }
  _StringUtils.includesAny = includesAny;
})(StringUtils || (StringUtils = {}));

// ../../../sdkwork-sdk-commons/sdkwork-sdk-common-typescript/dist/utils/encoding.js
var Encoding;
(function(_Encoding) {
  function base64Encode2(input) {
    var _a, _b, _c;
    let bytes;
    if (typeof input === "string") bytes = new TextEncoder().encode(input);
    else bytes = input;
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let result = "";
    let i = 0;
    while (i < bytes.length) {
      const a = (_a = bytes[i++]) != null ? _a : 0;
      const b = i < bytes.length ? (_b = bytes[i++]) != null ? _b : 0 : 0;
      const c = i < bytes.length ? (_c = bytes[i++]) != null ? _c : 0 : 0;
      const bitmap = a << 16 | b << 8 | c;
      result += chars[bitmap >> 18 & 63];
      result += chars[bitmap >> 12 & 63];
      result += i > bytes.length + 1 ? "=" : chars[bitmap >> 6 & 63];
      result += i > bytes.length ? "=" : chars[bitmap & 63];
    }
    return result;
  }
  _Encoding.base64Encode = base64Encode2;
  function base64Decode2(input) {
    var _a, _b, _c, _d;
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    input = input.replace(/[^A-Za-z0-9+/]/g, "");
    const len = input.length;
    let result = "";
    let i = 0;
    while (i < len) {
      const a = chars.indexOf((_a = input[i++]) != null ? _a : "");
      const b = chars.indexOf((_b = input[i++]) != null ? _b : "");
      const c = chars.indexOf((_c = input[i++]) != null ? _c : "");
      const d = chars.indexOf((_d = input[i++]) != null ? _d : "");
      const bitmap = a << 18 | b << 12 | c << 6 | d;
      result += String.fromCharCode(bitmap >> 16 & 255);
      if (c !== 64 && input[i - 2] !== "=") result += String.fromCharCode(bitmap >> 8 & 255);
      if (d !== 64 && input[i - 1] !== "=") result += String.fromCharCode(bitmap & 255);
    }
    return result;
  }
  _Encoding.base64Decode = base64Decode2;
  function base64UrlEncode2(input) {
    return base64Encode2(input).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  }
  _Encoding.base64UrlEncode = base64UrlEncode2;
  function base64UrlDecode2(input) {
    input = input.replace(/-/g, "+").replace(/_/g, "/");
    const pad = input.length % 4;
    if (pad) input += "=".repeat(4 - pad);
    return base64Decode2(input);
  }
  _Encoding.base64UrlDecode = base64UrlDecode2;
  function base64ToBytes(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  _Encoding.base64ToBytes = base64ToBytes;
  function bytesToBase64(bytes) {
    var _a;
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode((_a = bytes[i]) != null ? _a : 0);
    return btoa(binary);
  }
  _Encoding.bytesToBase64 = bytesToBase64;
  function utf8Encode(input) {
    return new TextEncoder().encode(input);
  }
  _Encoding.utf8Encode = utf8Encode;
  function utf8Decode(input) {
    return new TextDecoder().decode(input);
  }
  _Encoding.utf8Decode = utf8Decode;
  function hexEncode2(input) {
    const bytes = typeof input === "string" ? utf8Encode(input) : input;
    return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  _Encoding.hexEncode = hexEncode2;
  function hexDecode2(input) {
    const bytes = new Uint8Array(input.length / 2);
    for (let i = 0; i < input.length; i += 2) bytes[i / 2] = parseInt(input.substr(i, 2), 16);
    return utf8Decode(bytes);
  }
  _Encoding.hexDecode = hexDecode2;
  function hexToBytes(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    return bytes;
  }
  _Encoding.hexToBytes = hexToBytes;
  function bytesToHex(bytes) {
    return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  _Encoding.bytesToHex = bytesToHex;
  function urlEncode(input) {
    return encodeURIComponent(input);
  }
  _Encoding.urlEncode = urlEncode;
  function urlDecode(input) {
    return decodeURIComponent(input);
  }
  _Encoding.urlDecode = urlDecode;
  function urlEncodeComponent(input) {
    return encodeURIComponent(input);
  }
  _Encoding.urlEncodeComponent = urlEncodeComponent;
  function urlDecodeComponent(input) {
    return decodeURIComponent(input);
  }
  _Encoding.urlDecodeComponent = urlDecodeComponent;
  function htmlEncode(input) {
    const htmlEntities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
      "/": "&#x2F;",
      "`": "&#x60;",
      "=": "&#x3D;"
    };
    return input.replace(/[&<>"'`=/]/g, (char) => htmlEntities[char] || char);
  }
  _Encoding.htmlEncode = htmlEncode;
  function htmlDecode(input) {
    const htmlEntities = {
      "&amp;": "&",
      "&lt;": "<",
      "&gt;": ">",
      "&quot;": '"',
      "&#39;": "'",
      "&#x27;": "'",
      "&#x2F;": "/",
      "&#x60;": "`",
      "&#x3D;": "=",
      "&nbsp;": " "
    };
    return input.replace(/&[^;]+;/g, (entity) => htmlEntities[entity] || entity);
  }
  _Encoding.htmlDecode = htmlDecode;
  function jsonEncode(value, replacer, space) {
    return JSON.stringify(value, replacer, space);
  }
  _Encoding.jsonEncode = jsonEncode;
  function jsonDecode(input) {
    return JSON.parse(input);
  }
  _Encoding.jsonDecode = jsonDecode;
  function jsonEncodePretty(value, indent = 2) {
    return JSON.stringify(value, null, indent);
  }
  _Encoding.jsonEncodePretty = jsonEncodePretty;
  function tryJsonDecode(input, defaultValue) {
    try {
      return JSON.parse(input);
    } catch {
      return defaultValue;
    }
  }
  _Encoding.tryJsonDecode = tryJsonDecode;
  function isJson(input) {
    try {
      JSON.parse(input);
      return true;
    } catch {
      return false;
    }
  }
  _Encoding.isJson = isJson;
  function xmlEncode(input) {
    const xmlEntities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&apos;"
    };
    return input.replace(/[&<>"']/g, (char) => xmlEntities[char] || char);
  }
  _Encoding.xmlEncode = xmlEncode;
  function xmlDecode(input) {
    const xmlEntities = {
      "&amp;": "&",
      "&lt;": "<",
      "&gt;": ">",
      "&quot;": '"',
      "&apos;": "'"
    };
    return input.replace(/&[^;]+;/g, (entity) => xmlEntities[entity] || entity);
  }
  _Encoding.xmlDecode = xmlDecode;
  function escapeRegex(input) {
    return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  _Encoding.escapeRegex = escapeRegex;
  function escapeSql(input) {
    return input.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, (char) => {
      return {
        "\0": "\\0",
        "\b": "\\b",
        "	": "\\t",
        "": "\\z",
        "\n": "\\n",
        "\r": "\\r",
        '"': '\\"',
        "'": "\\'",
        "\\": "\\\\",
        "%": "\\%"
      }[char] || char;
    });
  }
  _Encoding.escapeSql = escapeSql;
  function escapeShell(input) {
    return input.replace(/[^A-Za-z0-9_\-.,:\/@\n]/g, (char) => {
      if (char === "\n") return "'\\n'";
      return `\\${char}`;
    });
  }
  _Encoding.escapeShell = escapeShell;
  function escapeCString(input) {
    return input.replace(/[\\"'\n\r\t\b\f\v\0]/g, (char) => {
      return {
        "\\": "\\\\",
        '"': '\\"',
        "'": "\\'",
        "\n": "\\n",
        "\r": "\\r",
        "	": "\\t",
        "\b": "\\b",
        "\f": "\\f",
        "\v": "\\v",
        "\0": "\\0"
      }[char] || char;
    });
  }
  _Encoding.escapeCString = escapeCString;
  function unescapeCString(input) {
    return input.replace(/\\([\\\"'nrtbfv0])/g, (_, char) => {
      return {
        "\\": "\\",
        '"': '"',
        "'": "'",
        "n": "\n",
        "r": "\r",
        "t": "	",
        "b": "\b",
        "f": "\f",
        "v": "\v",
        "0": "\0"
      }[char] || char;
    });
  }
  _Encoding.unescapeCString = unescapeCString;
  function camelToSnake(input) {
    return input.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }
  _Encoding.camelToSnake = camelToSnake;
  function snakeToCamel(input) {
    return input.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }
  _Encoding.snakeToCamel = snakeToCamel;
  function camelToKebab(input) {
    return input.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
  }
  _Encoding.camelToKebab = camelToKebab;
  function kebabToCamel(input) {
    return input.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  }
  _Encoding.kebabToCamel = kebabToCamel;
  function camelToPascal(input) {
    return input.charAt(0).toUpperCase() + input.slice(1);
  }
  _Encoding.camelToPascal = camelToPascal;
  function pascalToCamel(input) {
    return input.charAt(0).toLowerCase() + input.slice(1);
  }
  _Encoding.pascalToCamel = pascalToCamel;
  function pascalToSnake(input) {
    return camelToSnake(input);
  }
  _Encoding.pascalToSnake = pascalToSnake;
  function snakeToPascal(input) {
    return camelToPascal(snakeToCamel(input));
  }
  _Encoding.snakeToPascal = snakeToPascal;
  function pascalToKebab(input) {
    return camelToKebab(input);
  }
  _Encoding.pascalToKebab = pascalToKebab;
  function kebabToPascal(input) {
    return camelToPascal(kebabToCamel(input));
  }
  _Encoding.kebabToPascal = kebabToPascal;
  function toSnakeCase(input) {
    return input.replace(/([a-z])([A-Z])/g, "$1_$2").replace(/[-\s]+/g, "_").toLowerCase();
  }
  _Encoding.toSnakeCase = toSnakeCase;
  function toKebabCase(input) {
    return input.replace(/([a-z])([A-Z])/g, "$1-$2").replace(/[_\s]+/g, "-").toLowerCase();
  }
  _Encoding.toKebabCase = toKebabCase;
  function toCamelCase(input) {
    return input.replace(/[-_\s]+(.)?/g, (_, char) => char ? char.toUpperCase() : "").replace(/^(.)/, (char) => char.toLowerCase());
  }
  _Encoding.toCamelCase = toCamelCase;
  function toPascalCase(input) {
    const camel = toCamelCase(input);
    return camel.charAt(0).toUpperCase() + camel.slice(1);
  }
  _Encoding.toPascalCase = toPascalCase;
  function toConstantCase(input) {
    return toSnakeCase(input).toUpperCase();
  }
  _Encoding.toConstantCase = toConstantCase;
  function toSentenceCase(input) {
    return input.charAt(0).toUpperCase() + input.slice(1).toLowerCase();
  }
  _Encoding.toSentenceCase = toSentenceCase;
  function toTitleCase(input) {
    return input.replace(/\b\w/g, (char) => char.toUpperCase());
  }
  _Encoding.toTitleCase = toTitleCase;
  function toCapitalCase(input) {
    return input.replace(/[-_\s]+(.)?/g, (_, char) => char ? ` ${char.toUpperCase()}` : "").trim();
  }
  _Encoding.toCapitalCase = toCapitalCase;
  function toDotCase(input) {
    return input.replace(/([a-z])([A-Z])/g, "$1.$2").replace(/[-_\s]+/g, ".").toLowerCase();
  }
  _Encoding.toDotCase = toDotCase;
  function toPathCase(input) {
    return input.replace(/([a-z])([A-Z])/g, "$1/$2").replace(/[-_\s]+/g, "/").toLowerCase();
  }
  _Encoding.toPathCase = toPathCase;
  function rot13(input) {
    return input.replace(/[a-zA-Z]/g, (char) => {
      const start = char <= "Z" ? 65 : 97;
      return String.fromCharCode((char.charCodeAt(0) - start + 13) % 26 + start);
    });
  }
  _Encoding.rot13 = rot13;
  function caesarCipher(input, shift) {
    return input.replace(/[a-zA-Z]/g, (char) => {
      const start = char <= "Z" ? 65 : 97;
      const shifted = ((char.charCodeAt(0) - start + shift) % 26 + 26) % 26;
      return String.fromCharCode(shifted + start);
    });
  }
  _Encoding.caesarCipher = caesarCipher;
  function caesarDecipher(input, shift) {
    return caesarCipher(input, -shift);
  }
  _Encoding.caesarDecipher = caesarDecipher;
  function xorEncode(input, key) {
    var _a, _b;
    const inputBytes = utf8Encode(input);
    const keyBytes = utf8Encode(key);
    const result = new Uint8Array(inputBytes.length);
    for (let i = 0; i < inputBytes.length; i++) result[i] = ((_a = inputBytes[i]) != null ? _a : 0) ^ ((_b = keyBytes[i % keyBytes.length]) != null ? _b : 0);
    return bytesToHex(result);
  }
  _Encoding.xorEncode = xorEncode;
  function xorDecode(input, key) {
    var _a, _b;
    const inputBytes = hexToBytes(input);
    const keyBytes = utf8Encode(key);
    const result = new Uint8Array(inputBytes.length);
    for (let i = 0; i < inputBytes.length; i++) result[i] = ((_a = inputBytes[i]) != null ? _a : 0) ^ ((_b = keyBytes[i % keyBytes.length]) != null ? _b : 0);
    return utf8Decode(result);
  }
  _Encoding.xorDecode = xorDecode;
  function charCodeEncode(input) {
    return Array.from(input).map((char) => char.charCodeAt(0));
  }
  _Encoding.charCodeEncode = charCodeEncode;
  function charCodeDecode(codes) {
    return String.fromCharCode(...codes);
  }
  _Encoding.charCodeDecode = charCodeDecode;
  function binaryEncode(input) {
    return Array.from(input).map((char) => char.charCodeAt(0).toString(2).padStart(8, "0")).join(" ");
  }
  _Encoding.binaryEncode = binaryEncode;
  function binaryDecode(input) {
    return input.split(/\s+/).map((byte) => String.fromCharCode(parseInt(byte, 2))).join("");
  }
  _Encoding.binaryDecode = binaryDecode;
  function octalEncode(input) {
    return Array.from(input).map((char) => char.charCodeAt(0).toString(8).padStart(3, "0")).join(" ");
  }
  _Encoding.octalEncode = octalEncode;
  function octalDecode(input) {
    return input.split(/\s+/).map((byte) => String.fromCharCode(parseInt(byte, 8))).join("");
  }
  _Encoding.octalDecode = octalDecode;
  function decimalEncode(input) {
    return Array.from(input).map((char) => char.charCodeAt(0).toString(10)).join(" ");
  }
  _Encoding.decimalEncode = decimalEncode;
  function decimalDecode(input) {
    return input.split(/\s+/).map((code) => String.fromCharCode(parseInt(code, 10))).join("");
  }
  _Encoding.decimalDecode = decimalDecode;
  function punycodeEncode(input) {
    const prefix = "xn--";
    if (input.startsWith(prefix)) return input;
    const asciiPart = input.replace(/[^\x00-\x7F]/g, "");
    const nonAsciiPart = input.replace(/[\x00-\x7F]/g, "");
    if (!nonAsciiPart) return input;
    return prefix + asciiPart + "-" + nonAsciiPart.split("").map((c) => c.charCodeAt(0).toString(36)).join("");
  }
  _Encoding.punycodeEncode = punycodeEncode;
  function slugify(input) {
    return input.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
  }
  _Encoding.slugify = slugify;
  function unslugify(input) {
    return input.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
  }
  _Encoding.unslugify = unslugify;
  function queryStringEncode(params) {
    return Object.entries(params).filter(([, value]) => value !== void 0 && value !== null).map(([key, value]) => {
      if (Array.isArray(value)) return value.map((v) => `${urlEncode(key)}=${urlEncode(String(v))}`).join("&");
      return `${urlEncode(key)}=${urlEncode(String(value))}`;
    }).join("&");
  }
  _Encoding.queryStringEncode = queryStringEncode;
  function queryStringDecode(query) {
    const result = {};
    if (!query) return result;
    query = query.replace(/^[?#]/, "");
    for (const pair of query.split("&")) {
      const parts = pair.split("=");
      const key = parts[0];
      const value = parts[1];
      if (!key) continue;
      const decodedKey = urlDecode(key);
      const decodedValue = value ? urlDecode(value) : "";
      if (result[decodedKey]) {
        if (Array.isArray(result[decodedKey])) result[decodedKey].push(decodedValue);
        else result[decodedKey] = [result[decodedKey], decodedValue];
      } else result[decodedKey] = decodedValue;
    }
    return result;
  }
  _Encoding.queryStringDecode = queryStringDecode;
  function formDataEncode(data) {
    return Object.entries(data).filter(([, value]) => value !== void 0 && value !== null).map(([key, value]) => `${urlEncode(key)}=${urlEncode(String(value))}`).join("&");
  }
  _Encoding.formDataEncode = formDataEncode;
  function mimeTypeToExtension(mimeType) {
    return {
      "application/json": "json",
      "application/xml": "xml",
      "application/pdf": "pdf",
      "application/zip": "zip",
      "application/gzip": "gz",
      "application/x-tar": "tar",
      "application/x-rar-compressed": "rar",
      "application/x-7z-compressed": "7z",
      "application/vnd.ms-excel": "xls",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
      "application/vnd.ms-powerpoint": "ppt",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
      "application/msword": "doc",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
      "text/plain": "txt",
      "text/html": "html",
      "text/css": "css",
      "text/javascript": "js",
      "text/csv": "csv",
      "text/xml": "xml",
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/gif": "gif",
      "image/svg+xml": "svg",
      "image/webp": "webp",
      "image/bmp": "bmp",
      "image/tiff": "tiff",
      "image/x-icon": "ico",
      "audio/mpeg": "mp3",
      "audio/wav": "wav",
      "audio/ogg": "ogg",
      "audio/aac": "aac",
      "video/mp4": "mp4",
      "video/mpeg": "mpeg",
      "video/webm": "webm",
      "video/ogg": "ogv",
      "video/x-msvideo": "avi",
      "video/quicktime": "mov"
    }[mimeType.toLowerCase()] || "";
  }
  _Encoding.mimeTypeToExtension = mimeTypeToExtension;
  function extensionToMimeType(extension) {
    return {
      "json": "application/json",
      "xml": "application/xml",
      "pdf": "application/pdf",
      "zip": "application/zip",
      "gz": "application/gzip",
      "tar": "application/x-tar",
      "rar": "application/x-rar-compressed",
      "7z": "application/x-7z-compressed",
      "xls": "application/vnd.ms-excel",
      "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "ppt": "application/vnd.ms-powerpoint",
      "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "doc": "application/msword",
      "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "txt": "text/plain",
      "html": "text/html",
      "htm": "text/html",
      "css": "text/css",
      "js": "text/javascript",
      "csv": "text/csv",
      "jpg": "image/jpeg",
      "jpeg": "image/jpeg",
      "png": "image/png",
      "gif": "image/gif",
      "svg": "image/svg+xml",
      "webp": "image/webp",
      "bmp": "image/bmp",
      "tiff": "image/tiff",
      "tif": "image/tiff",
      "ico": "image/x-icon",
      "mp3": "audio/mpeg",
      "wav": "audio/wav",
      "ogg": "audio/ogg",
      "aac": "audio/aac",
      "mp4": "video/mp4",
      "mpeg": "video/mpeg",
      "mpg": "video/mpeg",
      "webm": "video/webm",
      "ogv": "video/ogg",
      "avi": "video/x-msvideo",
      "mov": "video/quicktime"
    }[extension.toLowerCase().replace(/^\./, "")] || "application/octet-stream";
  }
  _Encoding.extensionToMimeType = extensionToMimeType;
  function charsetEncode(input, _charset) {
    return new TextEncoder().encode(input);
  }
  _Encoding.charsetEncode = charsetEncode;
  function charsetDecode(input, charset) {
    return new TextDecoder(charset).decode(input);
  }
  _Encoding.charsetDecode = charsetDecode;
  function stripBom(input) {
    if (input.charCodeAt(0) === 65279) return input.slice(1);
    return input;
  }
  _Encoding.stripBom = stripBom;
  function addBom(input, bom = "utf-8") {
    return {
      "utf-8": "\uFEFF",
      "utf-16le": "\uFFFE",
      "utf-16be": "\uFEFF"
    }[bom] + input;
  }
  _Encoding.addBom = addBom;
  function normalizeEncoding(input, fromEncoding, toEncoding) {
    return charsetDecode(charsetEncode(input, fromEncoding), toEncoding);
  }
  _Encoding.normalizeEncoding = normalizeEncoding;
  function isValidBase64(input) {
    if (!input || input.length % 4 !== 0) return false;
    return /^[A-Za-z0-9+/]*={0,2}$/.test(input);
  }
  _Encoding.isValidBase64 = isValidBase64;
  function isValidHex(input) {
    return /^[0-9a-fA-F]*$/.test(input) && input.length % 2 === 0;
  }
  _Encoding.isValidHex = isValidHex;
  function isValidUrl(input) {
    try {
      new URL(input);
      return true;
    } catch {
      return false;
    }
  }
  _Encoding.isValidUrl = isValidUrl;
  function isValidEmail(input) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
  }
  _Encoding.isValidEmail = isValidEmail;
  function detectEncoding(input) {
    if (input.charCodeAt(0) === 65279) return "utf-8-bom";
    if (input.charCodeAt(0) === 65534) return "utf-16le";
    if (input.charCodeAt(0) === 65279 && input.charCodeAt(1) === 0) return "utf-16be";
    if (/[\u4e00-\u9fa5]/.test(input)) return "utf-8";
    return "ascii";
  }
  _Encoding.detectEncoding = detectEncoding;
})(Encoding || (Encoding = {}));
Encoding.base64Encode;
Encoding.base64Decode;
Encoding.base64UrlEncode;
Encoding.base64UrlDecode;
Encoding.utf8Encode;
Encoding.utf8Decode;
Encoding.hexEncode;
Encoding.hexDecode;
Encoding.urlEncode;
Encoding.urlDecode;
Encoding.htmlEncode;
Encoding.htmlDecode;
Encoding.jsonEncode;
Encoding.jsonDecode;
Encoding.xmlEncode;
Encoding.xmlDecode;
Encoding.escapeRegex;
Encoding.escapeSql;
Encoding.escapeShell;
Encoding.queryStringEncode;
Encoding.queryStringDecode;
Encoding.slugify;
Encoding.unslugify;

// ../../../sdkwork-sdk-commons/sdkwork-sdk-common-typescript/dist/utils/date.js
var MILLISECONDS_IN_SECOND = 1e3;
var MILLISECONDS_IN_MINUTE = 60 * MILLISECONDS_IN_SECOND;
var MILLISECONDS_IN_HOUR = 60 * MILLISECONDS_IN_MINUTE;
var MILLISECONDS_IN_DAY = 24 * MILLISECONDS_IN_HOUR;
var MILLISECONDS_IN_WEEK = 7 * MILLISECONDS_IN_DAY;
var TIME_UNITS_IN_MS = {
  millisecond: 1,
  second: MILLISECONDS_IN_SECOND,
  minute: MILLISECONDS_IN_MINUTE,
  hour: MILLISECONDS_IN_HOUR,
  day: MILLISECONDS_IN_DAY,
  week: MILLISECONDS_IN_WEEK,
  month: 30 * MILLISECONDS_IN_DAY,
  quarter: 90 * MILLISECONDS_IN_DAY,
  year: 365 * MILLISECONDS_IN_DAY
};

// ../../../sdkwork-sdk-commons/sdkwork-sdk-common-typescript/dist/http/stream-parser.js
function extractStreamLines(buffer, flush = false) {
  const lines = [];
  let lineStart = 0;
  let index = 0;
  while (index < buffer.length) {
    const character = buffer[index];
    if (character === "\n") {
      lines.push(buffer.slice(lineStart, index));
      index += 1;
      lineStart = index;
      continue;
    }
    if (character === "\r") {
      if (!flush && index === buffer.length - 1) break;
      lines.push(buffer.slice(lineStart, index));
      index += buffer[index + 1] === "\n" ? 2 : 1;
      lineStart = index;
      continue;
    }
    index += 1;
  }
  if (flush && lineStart < buffer.length) {
    lines.push(buffer.slice(lineStart));
    lineStart = buffer.length;
  }
  return {
    lines,
    remainder: buffer.slice(lineStart)
  };
}
var ServerSentEventDataParser = class {
  constructor() {
    __publicField(this, "dataLines", []);
    __publicField(this, "firstLine", true);
  }
  pushLine(rawLine) {
    const line = this.firstLine && rawLine.charCodeAt(0) === 65279 ? rawLine.slice(1) : rawLine;
    this.firstLine = false;
    if (line === "") return this.dispatch();
    if (line.startsWith(":")) return;
    const separatorIndex = line.indexOf(":");
    const field = separatorIndex === -1 ? line : line.slice(0, separatorIndex);
    let value = separatorIndex === -1 ? "" : line.slice(separatorIndex + 1);
    if (value.startsWith(" ")) value = value.slice(1);
    if (field === "data") this.dataLines.push(value);
  }
  flush() {
    return this.dispatch();
  }
  dispatch() {
    if (this.dataLines.length === 0) return;
    const data = this.dataLines.join("\n");
    this.dataLines = [];
    return data === "" || data === "[DONE]" ? void 0 : data;
  }
};
function normalizeLegacyStreamLine(line) {
  const trimmedLine = line.trim();
  if (trimmedLine === "" || trimmedLine === "data: [DONE]") return;
  if (trimmedLine.startsWith("data: ")) return trimmedLine.slice(6);
  return trimmedLine;
}

// ../../../sdkwork-sdk-commons/sdkwork-sdk-common-typescript/dist/http/base-client.js
var SDKWORK_API_PREFIXES = [
  "/app/v3/api",
  "/backend/v3/api",
  "/gateway/v3/api"
];
function dedupeSdkWorkApiPath(baseUrl, path) {
  for (const prefix of SDKWORK_API_PREFIXES) if (baseUrl.endsWith(prefix) && path.startsWith(prefix)) {
    const remainder = path.slice(prefix.length);
    return remainder.startsWith("/") ? remainder : `/${remainder}`;
  }
  return path;
}
function isApiResultEnvelope(value) {
  return value !== null && value !== void 0 && typeof value === "object" && !Array.isArray(value) && "code" in value && ("data" in value || "msg" in value || "message" in value);
}
var IDENTITY_PROJECTION_HEADER_NAMES = /* @__PURE__ */ new Set([
  "x-sdkwork-tenant-id",
  "x-sdkwork-app-id",
  "x-sdkwork-user-id",
  "x-sdkwork-organization-id",
  "x-sdkwork-actor-id",
  "x-sdkwork-actor-kind",
  "x-sdkwork-session-id",
  "x-sdkwork-environment",
  "x-sdkwork-deployment-profile",
  "x-sdkwork-deployment-mode",
  "x-sdkwork-runtime-target",
  "x-sdkwork-auth-level",
  "x-sdkwork-data-scope",
  "x-sdkwork-permission-scope",
  "x-sdkwork-device-id",
  "x-sdkwork-context-signature",
  "x-sdkwork-operation-id",
  "x-sdkwork-subject-tenant-id",
  "x-sdkwork-subject-organization-id",
  "x-sdkwork-subject-user-id",
  "x-sdkwork-subject-timestamp",
  "x-sdkwork-subject-signature",
  "x-tenant-id",
  "x-app-id",
  "x-organization-id",
  "x-platform",
  "x-user-id"
]);
function stripIdentityProjectionHeaders(headers) {
  for (const name of Object.keys(headers)) if (IDENTITY_PROJECTION_HEADER_NAMES.has(name.toLowerCase())) delete headers[name];
}
var BaseHttpClient = class {
  constructor(config) {
    __publicField(this, "config");
    __publicField(this, "authConfig");
    __publicField(this, "logger");
    __publicField(this, "cache");
    __publicField(this, "interceptors");
    var _a, _b, _c, _d;
    this.config = {
      baseUrl: config.baseUrl,
      timeout: (_a = config.timeout) != null ? _a : 3e4,
      headers: (_b = config.headers) != null ? _b : {},
      retry: {
        maxRetries: 3,
        retryDelay: 1e3,
        retryBackoff: "exponential",
        maxRetryDelay: 3e4,
        ...config.retry
      },
      cache: {
        enabled: false,
        ttl: 3e5,
        maxSize: 100,
        ...config.cache
      },
      logger: {
        level: "info",
        prefix: "[SDK]",
        timestamp: true,
        colors: true,
        ...config.logger
      }
    };
    this.logger = createLogger(this.config.logger);
    this.cache = createCacheStore(this.config.cache);
    this.interceptors = (_c = config.interceptors) != null ? _c : {
      request: [],
      response: [],
      error: []
    };
    const authMode = this.determineAuthMode(config);
    const tokenManager2 = (_d = config.tokenManager) != null ? _d : new DefaultAuthTokenManager({
      ...config.accessToken !== void 0 ? { accessToken: config.accessToken } : {},
      ...config.authToken !== void 0 ? { authToken: config.authToken } : {}
    });
    this.authConfig = {
      authMode,
      ...config.apiKey !== void 0 ? { apiKey: config.apiKey } : {},
      tokenManager: tokenManager2
    };
  }
  determineAuthMode(config) {
    if (config.apiKey) return "apikey";
    return "dual-token";
  }
  getAuthMode() {
    return this.authConfig.authMode;
  }
  setAuthMode(mode) {
    this.authConfig.authMode = mode;
  }
  getTokenManager() {
    return this.authConfig.tokenManager;
  }
  setTokenManager(manager) {
    this.authConfig.tokenManager = manager;
  }
  setApiKey(apiKey) {
    var _a;
    this.authConfig.apiKey = apiKey;
    this.authConfig.authMode = "apikey";
    (_a = this.authConfig.tokenManager) == null ? void 0 : _a.clearTokens();
  }
  setAuthToken(token) {
    var _a;
    (_a = this.authConfig.tokenManager) == null ? void 0 : _a.setAuthToken(token);
    if (this.authConfig.authMode === "apikey") {
      this.authConfig.authMode = "dual-token";
      delete this.authConfig.apiKey;
    }
  }
  setAccessToken(token) {
    var _a;
    (_a = this.authConfig.tokenManager) == null ? void 0 : _a.setAccessToken(token);
    if (this.authConfig.authMode === "apikey") {
      this.authConfig.authMode = "dual-token";
      delete this.authConfig.apiKey;
    }
  }
  clearAuthToken() {
    var _a;
    (_a = this.authConfig.tokenManager) == null ? void 0 : _a.clearTokens();
  }
  addRequestInterceptor(interceptor) {
    this.interceptors.request.push(interceptor);
    return () => {
      const index = this.interceptors.request.indexOf(interceptor);
      if (index > -1) this.interceptors.request.splice(index, 1);
    };
  }
  addResponseInterceptor(interceptor) {
    this.interceptors.response.push(interceptor);
    return () => {
      const index = this.interceptors.response.indexOf(interceptor);
      if (index > -1) this.interceptors.response.splice(index, 1);
    };
  }
  addErrorInterceptor(interceptor) {
    this.interceptors.error.push(interceptor);
    return () => {
      const index = this.interceptors.error.indexOf(interceptor);
      if (index > -1) this.interceptors.error.splice(index, 1);
    };
  }
  clearCache() {
    this.cache.clear();
  }
  getConfig() {
    var _a, _b;
    return {
      baseUrl: this.config.baseUrl,
      timeout: this.config.timeout,
      authMode: this.authConfig.authMode,
      apiKey: this.authConfig.apiKey,
      accessToken: (_a = this.authConfig.tokenManager) == null ? void 0 : _a.getAccessToken(),
      authToken: (_b = this.authConfig.tokenManager) == null ? void 0 : _b.getAuthToken()
    };
  }
  isAuthenticated() {
    var _a, _b;
    return (_b = (_a = this.authConfig.tokenManager) == null ? void 0 : _a.isValid()) != null ? _b : false;
  }
  buildBaseUrl(path, params) {
    const baseUrl = this.config.baseUrl.replace(/\/$/, "");
    let url = `${baseUrl}${dedupeSdkWorkApiPath(baseUrl, path.startsWith("/") ? path : `/${path}`)}`;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach((item) => {
            if (item !== void 0 && item !== null) searchParams.append(key, String(item));
          });
          return;
        }
        if (value !== void 0 && value !== null) searchParams.append(key, String(value));
      });
      const queryString = searchParams.toString();
      if (queryString) url += `?${queryString}`;
    }
    return url;
  }
  buildHeaders(config, skipAuth = false) {
    const headers = {
      "Content-Type": MIME_TYPES.JSON,
      ...this.config.headers,
      ...config.headers
    };
    if (!skipAuth && !config.skipAuth) {
      const authHeaders = buildAuthHeaders(this.authConfig.authMode, this.authConfig.apiKey, this.authConfig.tokenManager);
      Object.assign(headers, authHeaders);
    }
    stripIdentityProjectionHeaders(headers);
    return headers;
  }
  serializeRequestBody(body, headers) {
    if (body === void 0 || body === null) return;
    if (typeof FormData !== "undefined" && body instanceof FormData) {
      delete headers["Content-Type"];
      return body;
    }
    if (typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams) {
      headers["Content-Type"] = "application/x-www-form-urlencoded;charset=UTF-8";
      return body.toString();
    }
    if (typeof Blob !== "undefined" && body instanceof Blob) {
      delete headers["Content-Type"];
      return body;
    }
    if (typeof ArrayBuffer !== "undefined") {
      if (body instanceof ArrayBuffer) {
        delete headers["Content-Type"];
        return body;
      }
      if (ArrayBuffer.isView(body)) {
        delete headers["Content-Type"];
        return body;
      }
    }
    if (typeof body === "string") {
      headers["Content-Type"] = headers["Content-Type"] || "text/plain;charset=UTF-8";
      return body;
    }
    return JSON.stringify(body);
  }
  async applyRequestInterceptors(config) {
    let processedConfig = config;
    for (const interceptor of this.interceptors.request) processedConfig = await interceptor(processedConfig);
    return processedConfig;
  }
  async applyResponseInterceptors(response, config) {
    let processedResponse = response;
    for (const interceptor of this.interceptors.response) processedResponse = await interceptor(processedResponse, config);
    return processedResponse;
  }
  async applyErrorInterceptors(error, config) {
    for (const interceptor of this.interceptors.error) await interceptor(error, config);
  }
  async handleErrorResponse(response, config) {
    var _a;
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    let problem;
    try {
      const result = await response.json();
      errorMessage = String(result.detail || result.msg || result.message || result.title || errorMessage);
      if (((_a = response.headers.get("content-type")) == null ? void 0 : _a.includes("application/problem+json")) || "status" in result && "code" in result && "traceId" in result) problem = result;
    } catch {
    }
    const error = SdkError.fromHttpStatus(response.status, errorMessage, problem === void 0 ? void 0 : { problem });
    await this.applyErrorInterceptors(error, config);
    throw error;
  }
  async processResponse(response, config) {
    if (!response.ok) await this.handleErrorResponse(response, config);
    if (response.status === HTTP_STATUS.NO_CONTENT) return;
    const contentType = response.headers.get("content-type");
    if (contentType == null ? void 0 : contentType.includes(MIME_TYPES.JSON)) {
      const body = await response.text();
      if (!body.trim()) return;
      const result = JSON.parse(body);
      if (!isApiResultEnvelope(result)) return result;
      if (!SUCCESS_CODES.includes(result.code) && !SUCCESS_CODES.includes(String(result.code))) throw SdkError.fromApiResult(result, response.status);
      return result.data;
    }
    if (contentType == null ? void 0 : contentType.includes("text/")) return await response.text();
    return await response.json();
  }
  async executeFetch(url, options) {
    const controller = new AbortController();
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, options.timeout);
    const abortHandler = () => controller.abort();
    if (options.signal) {
      if (options.signal.aborted) controller.abort();
      else options.signal.addEventListener("abort", abortHandler, { once: true });
    }
    try {
      this.logger.debug(`${options.method} ${url}`);
      return await fetch(url, {
        method: options.method,
        headers: options.headers,
        ...options.body !== void 0 ? { body: options.body } : {},
        signal: controller.signal
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          if (timedOut) throw new TimeoutError(`Request timeout after ${options.timeout}ms`, options.timeout);
          throw new CancelledError("Request was cancelled");
        }
        throw new NetworkError(error.message);
      }
      throw new NetworkError("Unknown network error");
    } finally {
      clearTimeout(timeoutId);
      if (options.signal) options.signal.removeEventListener("abort", abortHandler);
    }
  }
  async execute(config) {
    var _a;
    const processedConfig = await this.applyRequestInterceptors(config);
    const url = this.buildBaseUrl(processedConfig.url, processedConfig.params);
    const headers = this.buildHeaders(processedConfig);
    const serializedBody = this.serializeRequestBody(processedConfig.body, headers);
    const response = await this.executeFetch(url, {
      method: processedConfig.method,
      headers,
      ...serializedBody !== void 0 ? { body: serializedBody } : {},
      timeout: (_a = processedConfig.timeout) != null ? _a : this.config.timeout,
      ...processedConfig.signal !== void 0 ? { signal: processedConfig.signal } : {}
    });
    return this.processResponse(response, processedConfig);
  }
  async upload(path, options) {
    var _a, _b;
    const formData = new FormData();
    formData.append((_a = options.fieldName) != null ? _a : "file", options.file);
    if (options.additionalData) Object.entries(options.additionalData).forEach(([key, value]) => {
      formData.append(key, value);
    });
    const config = {
      url: path,
      method: "POST",
      body: formData,
      skipAuth: false
    };
    const processedConfig = await this.applyRequestInterceptors(config);
    const url = this.buildBaseUrl(processedConfig.url, processedConfig.params);
    const headers = this.buildHeaders(processedConfig);
    delete headers["Content-Type"];
    const response = await this.executeFetch(url, {
      method: "POST",
      headers,
      body: formData,
      timeout: (_b = processedConfig.timeout) != null ? _b : this.config.timeout,
      ...processedConfig.signal !== void 0 ? { signal: processedConfig.signal } : {}
    });
    return this.processResponse(response, processedConfig);
  }
  async download(path, _options) {
    var _a;
    const config = {
      url: path,
      method: "GET",
      skipAuth: false
    };
    const processedConfig = await this.applyRequestInterceptors(config);
    const url = this.buildBaseUrl(processedConfig.url, processedConfig.params);
    const headers = this.buildHeaders(processedConfig);
    const response = await this.executeFetch(url, {
      method: "GET",
      headers,
      timeout: (_a = processedConfig.timeout) != null ? _a : this.config.timeout,
      ...processedConfig.signal !== void 0 ? { signal: processedConfig.signal } : {}
    });
    if (!response.ok) await this.handleErrorResponse(response, processedConfig);
    return response.blob();
  }
  async *stream(path, options) {
    var _a, _b, _c, _d;
    const config = {
      url: path,
      method: (_a = options == null ? void 0 : options.method) != null ? _a : "POST",
      ...(options == null ? void 0 : options.body) !== void 0 ? { body: options.body } : {},
      ...(options == null ? void 0 : options.headers) !== void 0 ? { headers: options.headers } : {},
      ...(options == null ? void 0 : options.params) !== void 0 ? { params: options.params } : {},
      ...(options == null ? void 0 : options.timeout) !== void 0 ? { timeout: options.timeout } : {},
      ...(options == null ? void 0 : options.signal) !== void 0 ? { signal: options.signal } : {},
      ...(options == null ? void 0 : options.skipAuth) !== void 0 ? { skipAuth: options.skipAuth } : {},
      ...(options == null ? void 0 : options.metadata) !== void 0 ? { metadata: options.metadata } : {}
    };
    const processedConfig = await this.applyRequestInterceptors(config);
    const url = this.buildBaseUrl(processedConfig.url, processedConfig.params);
    const headers = this.buildHeaders(processedConfig);
    const serializedBody = this.serializeRequestBody(processedConfig.body, headers);
    const response = await this.executeFetch(url, {
      method: processedConfig.method,
      headers,
      ...serializedBody !== void 0 ? { body: serializedBody } : {},
      timeout: (_b = processedConfig.timeout) != null ? _b : this.config.timeout,
      ...processedConfig.signal !== void 0 ? { signal: processedConfig.signal } : {}
    });
    if (!response.ok) await this.handleErrorResponse(response, processedConfig);
    const reader = (_c = response.body) == null ? void 0 : _c.getReader();
    if (!reader) throw new NetworkError("No response body");
    const decoder = new TextDecoder();
    let buffer = "";
    const eventParser = ((_d = response.headers.get("content-type")) == null ? void 0 : _d.toLowerCase().includes("text/event-stream")) === true ? new ServerSentEventDataParser() : void 0;
    const parseLine = eventParser ? (line) => eventParser.pushLine(line) : normalizeLegacyStreamLine;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const extracted2 = extractStreamLines(buffer);
        buffer = extracted2.remainder;
        for (const line of extracted2.lines) {
          const data = parseLine(line);
          if (data !== void 0) yield data;
        }
      }
      buffer += decoder.decode();
      const extracted = extractStreamLines(buffer, true);
      for (const line of extracted.lines) {
        const data = parseLine(line);
        if (data !== void 0) yield data;
      }
      const finalData = eventParser == null ? void 0 : eventParser.flush();
      if (finalData !== void 0) yield finalData;
    } finally {
      reader.releaseLock();
    }
  }
};

// packages/sdkwork-cloudrouter-mp-core/src/environment.ts
var APP_API_SUFFIX = "/app/v3/api";
var LIFECYCLE_ENVIRONMENTS = /* @__PURE__ */ new Set([
  "development",
  "test",
  "staging",
  "production"
]);
function readEnv(source, key) {
  const value = source[key];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : void 0;
}
function defaultRuntimeEnvSource() {
  return globalThis;
}
function resolveRuntimeEnv(source = defaultRuntimeEnvSource()) {
  var _a, _b;
  const lifecycle = (_a = readEnv(source, "SDKWORK_ENVIRONMENT")) != null ? _a : "production";
  const appApiBaseUrl = readEnv(source, "SDKWORK_CLOUDROUTER_ROUTER_APP_API_BASE_URL");
  if (!appApiBaseUrl) {
    throw new Error(
      "Cloud Router mini program requires SDKWORK_CLOUDROUTER_ROUTER_APP_API_BASE_URL in the runtime environment."
    );
  }
  return {
    appApiBaseUrl: resolveCloudRouterAppApiBaseUrl(appApiBaseUrl),
    lifecycleEnvironment: LIFECYCLE_ENVIRONMENTS.has(lifecycle) ? lifecycle : "production",
    profileId: (_b = readEnv(source, "SDKWORK_PROFILE_ID")) != null ? _b : "standalone.production"
  };
}
function resolveCloudRouterAppApiBaseUrl(candidate) {
  const stripped = candidate.replace(/\/+$/u, "");
  const withoutSuffix = stripped.endsWith(APP_API_SUFFIX) ? stripped.slice(0, -APP_API_SUFFIX.length) : stripped;
  return resolveBaseUrlWithAlignProtocol({
    baseUrls: [withoutSuffix],
    preservePath: true,
    protocol: "https"
  }).url;
}

// packages/sdkwork-cloudrouter-mp-core/src/session/sessionStore.ts
var ACCESS_TOKEN_KEY = "sdkwork.cloudrouter.mp.accessToken";
var AUTH_TOKEN_KEY = "sdkwork.cloudrouter.mp.authToken";
var SUBJECT_KEY = "sdkwork.cloudrouter.mp.subject";
function adapter() {
  const host = globalThis;
  const wx = host.wx;
  if (!wx || typeof wx.getStorageSync !== "function" || typeof wx.setStorageSync !== "function" || typeof wx.removeStorageSync !== "function") {
    return null;
  }
  return wx;
}
function readString(key) {
  const store = adapter();
  if (!store) return null;
  const value = store.getStorageSync(key);
  return typeof value === "string" && value.length > 0 ? value : null;
}
function readCloudRouterSession() {
  const accessToken = readString(ACCESS_TOKEN_KEY);
  const authToken = readString(AUTH_TOKEN_KEY);
  return {
    authenticated: Boolean(accessToken || authToken),
    accessToken,
    authToken,
    tenantId: "100001",
    organizationId: "0",
    subject: readString(SUBJECT_KEY)
  };
}
function writeCloudRouterSession(session) {
  const store = adapter();
  if (!store) return;
  if (session.accessToken) store.setStorageSync(ACCESS_TOKEN_KEY, session.accessToken);
  else store.removeStorageSync(ACCESS_TOKEN_KEY);
  if (session.authToken) store.setStorageSync(AUTH_TOKEN_KEY, session.authToken);
  else store.removeStorageSync(AUTH_TOKEN_KEY);
  if (session.subject) store.setStorageSync(SUBJECT_KEY, session.subject);
  else store.removeStorageSync(SUBJECT_KEY);
}
function clearCloudRouterSession() {
  const store = adapter();
  if (!store) return;
  store.removeStorageSync(ACCESS_TOKEN_KEY);
  store.removeStorageSync(AUTH_TOKEN_KEY);
  store.removeStorageSync(SUBJECT_KEY);
}

// packages/sdkwork-cloudrouter-mp-core/src/session/tokenManager.ts
var tokenManager = null;
function mirrorTokensToSession(tokens) {
  var _a, _b;
  writeCloudRouterSession({
    ...readCloudRouterSession(),
    accessToken: (_a = tokens.accessToken) != null ? _a : null,
    authToken: (_b = tokens.authToken) != null ? _b : null
  });
}
function getCloudRouterTokenManager() {
  var _a, _b;
  if (tokenManager) return tokenManager;
  const session = readCloudRouterSession();
  tokenManager = createTokenManager(
    {
      accessToken: (_a = session.accessToken) != null ? _a : void 0,
      authToken: (_b = session.authToken) != null ? _b : void 0
    },
    {
      onTokenSet: mirrorTokensToSession,
      onTokenRefresh: mirrorTokensToSession
    }
  );
  return tokenManager;
}

// ../../node_modules/.pnpm/@sdkwork+utils@0.11.0/node_modules/@sdkwork/utils/dist/runtime/binary.js
var textEncoder = new TextEncoder();
function toUtf8(value) {
  return textEncoder.encode(value);
}
var HEX = "0123456789abcdef";
function hexEncode(bytes) {
  let result = "";
  for (let index = 0; index < bytes.length; index += 1) {
    const byte = bytes[index];
    result += HEX[byte >> 4];
    result += HEX[byte & 15];
  }
  return result;
}

// ../../node_modules/.pnpm/@sdkwork+utils@0.11.0/node_modules/@sdkwork/utils/dist/runtime/sha256.js
var K = new Uint32Array([
  1116352408,
  1899447441,
  3049323471,
  3921009573,
  961987163,
  1508970993,
  2453635748,
  2870763221,
  3624381080,
  310598401,
  607225278,
  1426881987,
  1925078388,
  2162078206,
  2614888103,
  3248222580,
  3835390401,
  4022224774,
  264347078,
  604807628,
  770255983,
  1249150122,
  1555081692,
  1996064986,
  2554220882,
  2821834349,
  2952996808,
  3210313671,
  3336571891,
  3584528711,
  113926993,
  338241895,
  666307205,
  773529912,
  1294757372,
  1396182291,
  1695183700,
  1986661051,
  2177026350,
  2456956037,
  2730485921,
  2820302411,
  3259730800,
  3345764771,
  3516065817,
  3600352804,
  4094571909,
  275423344,
  430227734,
  506948616,
  659060556,
  883997877,
  958139571,
  1322822218,
  1537002063,
  1747873779,
  1955562222,
  2024104815,
  2227730452,
  2361852424,
  2428436474,
  2756734187,
  3204031479,
  3329325298
]);
var BLOCK_SIZE = 64;
function rotr(value, shift) {
  return value >>> shift | value << 32 - shift;
}
function sha256Block(state, block, offset) {
  const words = new Uint32Array(64);
  for (let index = 0; index < 16; index += 1) {
    const start = offset + index * 4;
    words[index] = block[start] << 24 | block[start + 1] << 16 | block[start + 2] << 8 | block[start + 3];
  }
  for (let index = 16; index < 64; index += 1) {
    const s0 = rotr(words[index - 15], 7) ^ rotr(words[index - 15], 18) ^ words[index - 15] >>> 3;
    const s1 = rotr(words[index - 2], 17) ^ rotr(words[index - 2], 19) ^ words[index - 2] >>> 10;
    words[index] = words[index - 16] + s0 + words[index - 7] + s1 >>> 0;
  }
  let a = state[0];
  let b = state[1];
  let c = state[2];
  let d = state[3];
  let e = state[4];
  let f = state[5];
  let g = state[6];
  let h = state[7];
  for (let index = 0; index < 64; index += 1) {
    const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
    const ch = e & f ^ ~e & g;
    const temp1 = h + s1 + ch + K[index] + words[index] >>> 0;
    const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
    const maj = a & b ^ a & c ^ b & c;
    const temp2 = s0 + maj >>> 0;
    h = g;
    g = f;
    f = e;
    e = d + temp1 >>> 0;
    d = c;
    c = b;
    b = a;
    a = temp1 + temp2 >>> 0;
  }
  state[0] = state[0] + a >>> 0;
  state[1] = state[1] + b >>> 0;
  state[2] = state[2] + c >>> 0;
  state[3] = state[3] + d >>> 0;
  state[4] = state[4] + e >>> 0;
  state[5] = state[5] + f >>> 0;
  state[6] = state[6] + g >>> 0;
  state[7] = state[7] + h >>> 0;
}
function sha256Digest(value) {
  const bitLength = value.length * 8;
  const paddingLength = (BLOCK_SIZE - (value.length + 9) % BLOCK_SIZE) % BLOCK_SIZE + 9;
  const padded = new Uint8Array(value.length + paddingLength);
  padded.set(value);
  padded[value.length] = 128;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 4, bitLength >>> 0, false);
  view.setUint32(padded.length - 8, Math.floor(bitLength / 4294967296), false);
  const state = new Uint32Array([
    1779033703,
    3144134277,
    1013904242,
    2773480762,
    1359893119,
    2600822924,
    528734635,
    1541459225
  ]);
  for (let offset = 0; offset < padded.length; offset += BLOCK_SIZE) {
    sha256Block(state, padded, offset);
  }
  const digest = new Uint8Array(32);
  const digestView = new DataView(digest.buffer);
  for (let index = 0; index < state.length; index += 1) {
    digestView.setUint32(index * 4, state[index], false);
  }
  return digest;
}
var SHA256_INITIAL_STATE = new Uint32Array([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]);
function sha256Hex(value) {
  const bytes = typeof value === "string" ? toUtf8(value) : value;
  return hexEncode(sha256Digest(bytes));
}

// ../../node_modules/.pnpm/@sdkwork+utils@0.11.0/node_modules/@sdkwork/utils/dist/crypto.js
function sha256Hash(value) {
  return sha256Hex(value);
}

// ../../sdks/cloudrouter-app-sdk/cloudrouter-app-sdk-typescript/dist/index.js
var _HttpClient = class _HttpClient extends BaseHttpClient {
  constructor(config) {
    super(config);
  }
  static normalizeCredential(value) {
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : void 0;
  }
  getInternalAuthConfig() {
    const self = this;
    self.authConfig = self.authConfig || {};
    return self.authConfig;
  }
  getInternalHeaders() {
    const self = this;
    self.config = self.config || {};
    self.config.headers = self.config.headers || {};
    return self.config.headers;
  }
  buildRequestHeaders(headers, contentType) {
    const mergedHeaders = {
      ...headers != null ? headers : {}
    };
    if (contentType && contentType.toLowerCase() !== "multipart/form-data") {
      mergedHeaders["Content-Type"] = contentType;
    }
    return Object.keys(mergedHeaders).length > 0 ? mergedHeaders : void 0;
  }
  async applySdkworkRequestBodyFingerprint(headers, body) {
    if (!_HttpClient.SDKWORK_V3_REQUEST_FINGERPRINTS || body == null || !this.hasNonEmptyHeader(headers, "Idempotency-Key") || this.hasNonEmptyHeader(headers, "X-Content-SHA256") || this.hasNonEmptyHeader(headers, "X-Idempotency-Fingerprint")) {
      return headers;
    }
    const fingerprint = await this.createSdkworkRequestBodyFingerprint(body);
    if (!fingerprint) {
      return headers;
    }
    const normalizedFingerprintHeader = fingerprint.header.toLowerCase();
    const preparedHeaders = Object.fromEntries(Object.entries(headers != null ? headers : {}).filter(([headerName]) => headerName.toLowerCase() !== normalizedFingerprintHeader));
    return {
      ...preparedHeaders,
      [fingerprint.header]: fingerprint.value
    };
  }
  hasNonEmptyHeader(headers, name) {
    const normalizedName = name.toLowerCase();
    return Object.entries(headers != null ? headers : {}).some(([headerName, value]) => headerName.toLowerCase() === normalizedName && value.trim().length > 0);
  }
  async createSdkworkRequestBodyFingerprint(body) {
    if (typeof FormData !== "undefined" && body instanceof FormData) {
      const canonicalForm = await this.serializeSdkworkFormData(body);
      return {
        header: "X-Idempotency-Fingerprint",
        value: await this.sha256Hex(new TextEncoder().encode(canonicalForm))
      };
    }
    const bytes = await this.serializeSdkworkRequestBodyBytes(body);
    if (!bytes) {
      return void 0;
    }
    return {
      header: "X-Content-SHA256",
      value: await this.sha256Hex(bytes)
    };
  }
  async serializeSdkworkRequestBodyBytes(body) {
    if (typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams) {
      return new TextEncoder().encode(body.toString());
    }
    if (typeof Blob !== "undefined" && body instanceof Blob) {
      return new Uint8Array(await body.arrayBuffer());
    }
    if (typeof ArrayBuffer !== "undefined" && body instanceof ArrayBuffer) {
      return new Uint8Array(body.slice(0));
    }
    if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView(body)) {
      return new Uint8Array(new Uint8Array(body.buffer, body.byteOffset, body.byteLength));
    }
    if (typeof body === "string") {
      return new TextEncoder().encode(body);
    }
    const serialized = JSON.stringify(body);
    return serialized === void 0 ? void 0 : new TextEncoder().encode(serialized);
  }
  async serializeSdkworkFormData(body) {
    const parts = [];
    for (const [name, value] of body.entries()) {
      if (typeof value === "string") {
        parts.push({ kind: "field", name, value });
        continue;
      }
      const bytes = new Uint8Array(await value.arrayBuffer());
      parts.push({
        kind: "file",
        name,
        fileName: "name" in value ? String(value.name) : "",
        contentType: value.type,
        size: value.size,
        contentSha256: await this.sha256Hex(bytes)
      });
    }
    return JSON.stringify(parts);
  }
  async sha256Hex(bytes) {
    return sha256Hash(bytes);
  }
  buildHeaders(config, skipAuth = false) {
    const headers = super.buildHeaders(config, skipAuth);
    if (config == null ? void 0 : config.accessTokenOnly) {
      this.stripCredentialHeaders(headers, true);
      return headers;
    }
    if (!skipAuth && !(config == null ? void 0 : config.skipAuth)) {
      return headers;
    }
    this.stripCredentialHeaders(headers, false);
    return headers;
  }
  stripCredentialHeaders(headers, preserveAccessToken) {
    [
      ...preserveAccessToken ? [] : [_HttpClient.ACCESS_TOKEN_HEADER, "Access-Token"],
      "Authorization",
      ["X", "API", "Key"].join("-"),
      "X-Tenant-Id",
      "X-App-Id",
      "X-Organization-Id",
      "X-Platform",
      "X-User-Id",
      "X-Sdkwork-Tenant-Id",
      "X-Sdkwork-App-Id",
      "X-Sdkwork-User-Id",
      "X-Sdkwork-Organization-Id",
      "X-Sdkwork-Actor-Id",
      "X-Sdkwork-Actor-Kind",
      "X-Sdkwork-Session-Id",
      "X-Sdkwork-Environment",
      "X-Sdkwork-Deployment-Profile",
      "X-Sdkwork-Deployment-Mode",
      "X-Sdkwork-Runtime-Target",
      "X-Sdkwork-Auth-Level",
      "X-Sdkwork-Data-Scope",
      "X-Sdkwork-Permission-Scope",
      "X-Sdkwork-Device-Id",
      "X-Sdkwork-Context-Signature",
      "X-Sdkwork-Operation-Id",
      "X-Sdkwork-Subject-Tenant-Id",
      "X-Sdkwork-Subject-Organization-Id",
      "X-Sdkwork-Subject-User-Id",
      "X-Sdkwork-Subject-Timestamp",
      "X-Sdkwork-Subject-Signature"
    ].forEach((key) => {
      delete headers[key];
    });
  }
  buildRequestBody(body, contentType) {
    if (body == null) {
      return body;
    }
    const normalizedContentType = (contentType != null ? contentType : "").toLowerCase();
    if (normalizedContentType === "application/x-www-form-urlencoded") {
      return this.encodeFormBody(body);
    }
    if (normalizedContentType === "multipart/form-data") {
      return this.encodeMultipartBody(body);
    }
    return body;
  }
  encodeMultipartBody(body) {
    if (body instanceof FormData) {
      return body;
    }
    const formData = new FormData();
    if (body instanceof Map) {
      for (const [key, value] of body.entries()) {
        this.appendMultipartValue(formData, String(key), value);
      }
      return formData;
    }
    if (typeof body === "object") {
      const record = body;
      for (const [key, value] of Object.entries(record)) {
        if (this.isMultipartMetadataField(key)) {
          continue;
        }
        this.appendMultipartValue(formData, key, value, this.resolveMultipartFileName(record, key));
      }
      return formData;
    }
    this.appendMultipartValue(formData, "value", body);
    return formData;
  }
  appendMultipartValue(formData, key, value, fileName) {
    if (value == null) {
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item) => this.appendMultipartValue(formData, key, item, fileName));
      return;
    }
    if (value instanceof Blob) {
      if (fileName) {
        formData.append(key, value, fileName);
        return;
      }
      formData.append(key, value);
      return;
    }
    if (value instanceof Date) {
      formData.append(key, value.toISOString());
      return;
    }
    if (typeof value === "object") {
      formData.append(key, JSON.stringify(value));
      return;
    }
    formData.append(key, String(value));
  }
  resolveMultipartFileName(record, key) {
    const fieldSpecificName = record[`${key}FileName`];
    if (typeof fieldSpecificName === "string" && fieldSpecificName.trim()) {
      return fieldSpecificName.trim();
    }
    const genericName = record.fileName;
    if (key === "file" && typeof genericName === "string" && genericName.trim()) {
      return genericName.trim();
    }
    return void 0;
  }
  isMultipartMetadataField(key) {
    return key === "fileName" || key.endsWith("FileName");
  }
  encodeFormBody(body) {
    if (body instanceof URLSearchParams) {
      return body.toString();
    }
    if (typeof body === "string") {
      return body;
    }
    const params = new URLSearchParams();
    if (body instanceof Map) {
      for (const [key, value] of body.entries()) {
        this.appendFormValue(params, String(key), value);
      }
      return params.toString();
    }
    if (typeof body === "object") {
      for (const [key, value] of Object.entries(body)) {
        this.appendFormValue(params, key, value);
      }
      return params.toString();
    }
    params.append("value", String(body));
    return params.toString();
  }
  appendFormValue(params, key, value) {
    if (value == null) {
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item) => this.appendFormValue(params, key, item));
      return;
    }
    if (value instanceof Date) {
      params.append(key, value.toISOString());
      return;
    }
    if (typeof value === "object") {
      params.append(key, JSON.stringify(value));
      return;
    }
    params.append(key, String(value));
  }
  setAuthToken(token) {
    super.setAuthToken(token);
  }
  setAccessToken(token) {
    const headers = this.getInternalHeaders();
    headers[_HttpClient.ACCESS_TOKEN_HEADER] = token;
    super.setAccessToken(token);
  }
  setTokenManager(manager) {
    const baseProto = Object.getPrototypeOf(_HttpClient.prototype);
    if (typeof baseProto.setTokenManager === "function") {
      baseProto.setTokenManager.call(this, manager);
      return;
    }
    this.getInternalAuthConfig().tokenManager = manager;
  }
  applyAccessTokenOnlyHeaders(headers) {
    var _a;
    const authConfig = this.getInternalAuthConfig();
    const tokenManager2 = authConfig.tokenManager;
    const accessToken = (_a = tokenManager2 == null ? void 0 : tokenManager2.getAccessToken) == null ? void 0 : _a.call(tokenManager2);
    if (typeof accessToken !== "string" || accessToken.trim().length === 0) {
      throw new Error("access-token-only request requires Access-Token before request dispatch");
    }
    const result = { ...headers != null ? headers : {} };
    this.stripCredentialHeaders(result, false);
    result[_HttpClient.ACCESS_TOKEN_HEADER] = accessToken.trim();
    return result;
  }
  applySdkworkAuthHeaders(headers) {
    var _a, _b;
    const authConfig = this.getInternalAuthConfig();
    const tokenManager2 = authConfig.tokenManager;
    const accessToken = _HttpClient.normalizeCredential((_a = tokenManager2 == null ? void 0 : tokenManager2.getAccessToken) == null ? void 0 : _a.call(tokenManager2));
    const authToken = _HttpClient.normalizeCredential((_b = tokenManager2 == null ? void 0 : tokenManager2.getAuthToken) == null ? void 0 : _b.call(tokenManager2));
    if (_HttpClient.REQUIRES_SDKWORK_ACCESS_TOKEN && (typeof accessToken !== "string" || accessToken.trim().length === 0)) {
      throw new Error("non-open-api request requires Access-Token before request dispatch");
    }
    if (!accessToken && !authToken) {
      return headers;
    }
    const authHeaders = buildAuthHeaders("dual-token", void 0, tokenManager2);
    return Object.keys(authHeaders).length > 0 ? { ...headers != null ? headers : {}, ...authHeaders } : headers;
  }
  unwrapSdkworkV3Payload(payload, unwrapKind = "data") {
    if (!_HttpClient.SDKWORK_V3_UNWRAP || payload == null || typeof payload !== "object") {
      return payload;
    }
    const record = payload;
    if (record.code !== 0 || !("data" in record)) {
      return this.unwrapSdkworkV3Data(record, unwrapKind);
    }
    const data = record.data;
    if (!data || typeof data !== "object") {
      return data;
    }
    return this.unwrapSdkworkV3Data(data, unwrapKind);
  }
  unwrapSdkworkV3Data(data, unwrapKind) {
    if (unwrapKind === "void") {
      return void 0;
    }
    if (unwrapKind === "item" && "item" in data) {
      return data.item;
    }
    return data;
  }
  async request(path, options = {}) {
    const execute = this.execute;
    if (typeof execute !== "function") {
      throw new Error("BaseHttpClient execute method is not available");
    }
    const { body, headers, contentType, method = "GET", skipAuth, accessTokenOnly, sdkworkUnwrapKind = "data", ...rest } = options;
    const requestHeaders = accessTokenOnly ? this.applyAccessTokenOnlyHeaders(headers) : skipAuth ? headers : this.applySdkworkAuthHeaders(headers);
    const requestBody = this.buildRequestBody(body, contentType);
    const preparedHeaders = await this.applySdkworkRequestBodyFingerprint(this.buildRequestHeaders(requestHeaders, body == null ? void 0 : contentType), requestBody);
    const payload = await withRetry(
      () => execute.call(this, {
        url: path,
        method,
        ...rest,
        ...skipAuth !== void 0 ? { skipAuth } : {},
        ...accessTokenOnly !== void 0 ? { accessTokenOnly } : {},
        ...requestBody !== void 0 ? { body: requestBody } : {},
        ...preparedHeaders !== void 0 ? { headers: preparedHeaders } : {}
      }),
      // Per-request retry overrides (e.g. disabling 5xx retries for
      // idempotent-terminal operations like turn execution) flow through
      // options.retry; the default keeps maxRetries: 3.
      { maxRetries: 3, ...options.retry }
    );
    return this.unwrapSdkworkV3Payload(payload, sdkworkUnwrapKind);
  }
  async *streamJson(path, options = {}) {
    const stream = BaseHttpClient.prototype.stream;
    if (typeof stream !== "function") {
      throw new Error("BaseHttpClient stream method is not available");
    }
    const { body, headers, contentType, method = "GET", skipAuth, accessTokenOnly, ...rest } = options;
    const authHeaders = accessTokenOnly ? this.applyAccessTokenOnlyHeaders(headers) : skipAuth ? headers : this.applySdkworkAuthHeaders(headers);
    const requestBody = this.buildRequestBody(body, contentType);
    const requestHeaders = await this.applySdkworkRequestBodyFingerprint(this.buildRequestHeaders({ Accept: "text/event-stream", ...authHeaders != null ? authHeaders : {} }, body == null ? void 0 : contentType), requestBody);
    for await (const data of stream.call(this, path, {
      method,
      ...rest,
      ...skipAuth !== void 0 ? { skipAuth } : {},
      ...accessTokenOnly !== void 0 ? { accessTokenOnly } : {},
      ...requestBody !== void 0 ? { body: requestBody } : {},
      ...requestHeaders !== void 0 ? { headers: requestHeaders } : {}
    })) {
      if (data === "[DONE]") {
        return;
      }
      if (typeof data !== "string" || data.trim().length === 0) {
        continue;
      }
      yield JSON.parse(data);
    }
  }
  async get(path, params, headers) {
    return this.request(path, {
      method: "GET",
      ...params !== void 0 ? { params } : {},
      ...headers !== void 0 ? { headers } : {}
    });
  }
  async post(path, body, params, headers, contentType) {
    return this.request(path, {
      method: "POST",
      ...body !== void 0 ? { body } : {},
      ...params !== void 0 ? { params } : {},
      ...headers !== void 0 ? { headers } : {},
      ...contentType !== void 0 ? { contentType } : {}
    });
  }
  async put(path, body, params, headers, contentType) {
    return this.request(path, {
      method: "PUT",
      ...body !== void 0 ? { body } : {},
      ...params !== void 0 ? { params } : {},
      ...headers !== void 0 ? { headers } : {},
      ...contentType !== void 0 ? { contentType } : {}
    });
  }
  async delete(path, params, headers) {
    return this.request(path, {
      method: "DELETE",
      ...params !== void 0 ? { params } : {},
      ...headers !== void 0 ? { headers } : {}
    });
  }
  async patch(path, body, params, headers, contentType) {
    return this.request(path, {
      method: "PATCH",
      ...body !== void 0 ? { body } : {},
      ...params !== void 0 ? { params } : {},
      ...headers !== void 0 ? { headers } : {},
      ...contentType !== void 0 ? { contentType } : {}
    });
  }
};
__publicField(_HttpClient, "ACCESS_TOKEN_HEADER", "Access-Token");
__publicField(_HttpClient, "SDKWORK_V3_UNWRAP", true);
__publicField(_HttpClient, "SDKWORK_V3_REQUEST_FINGERPRINTS", true);
__publicField(_HttpClient, "REQUIRES_SDKWORK_ACCESS_TOKEN", true);
var HttpClient = _HttpClient;
function createHttpClient(config) {
  return new HttpClient(config);
}
var APP_API_PREFIX = "/app/v3/api";
function appApiPath(path) {
  if (!path) {
    return APP_API_PREFIX;
  }
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const normalizedPrefixRaw = APP_API_PREFIX.trim();
  const normalizedPrefix = normalizedPrefixRaw ? `/${normalizedPrefixRaw.replace(/^\/+|\/+$/g, "")}` : "";
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (!normalizedPrefix || normalizedPrefix === "/") {
    return normalizedPath;
  }
  if (normalizedPath === normalizedPrefix || normalizedPath.startsWith(`${normalizedPrefix}/`)) {
    return normalizedPath;
  }
  return `${normalizedPrefix}${normalizedPath}`;
}
var AiUsageLogsApi = class {
  constructor(client) {
    __publicField(this, "client");
    this.client = client;
  }
  /** List logs */
  async list(params, requestOptions) {
    const query = buildQueryString$4([
      { name: "cursor", value: params == null ? void 0 : params.cursor, style: "form", explode: true, allowReserved: false },
      { name: "page_size", value: params == null ? void 0 : params.pageSize, style: "form", explode: true, allowReserved: false },
      { name: "q", value: params == null ? void 0 : params.q, style: "form", explode: true, allowReserved: false },
      { name: "status", value: params == null ? void 0 : params.status, style: "form", explode: true, allowReserved: false },
      { name: "start_time", value: params == null ? void 0 : params.startTime, style: "form", explode: true, allowReserved: false },
      { name: "end_time", value: params == null ? void 0 : params.endTime, style: "form", explode: true, allowReserved: false }
    ]);
    return this.client.request(appendQueryString$4(appApiPath(`/ai/usage/logs`), query), { ...(requestOptions == null ? void 0 : requestOptions.signal) !== void 0 ? { signal: requestOptions.signal } : {}, ...(requestOptions == null ? void 0 : requestOptions.timeout) !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "GET", sdkworkUnwrapKind: "page" });
  }
};
var AiUsageApi = class {
  constructor(client) {
    __publicField(this, "logs");
    this.logs = new AiUsageLogsApi(client);
  }
};
var AiSettlementsDashboardApi = class {
  constructor(client) {
    __publicField(this, "client");
    this.client = client;
  }
  /** List settlements dashboard */
  async retrieve(params, requestOptions) {
    const query = buildQueryString$4([
      { name: "year", value: params == null ? void 0 : params.year, style: "form", explode: true, allowReserved: false }
    ]);
    return this.client.request(appendQueryString$4(appApiPath(`/ai/settlements/dashboard`), query), { ...(requestOptions == null ? void 0 : requestOptions.signal) !== void 0 ? { signal: requestOptions.signal } : {}, ...(requestOptions == null ? void 0 : requestOptions.timeout) !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "GET", sdkworkUnwrapKind: "data" });
  }
};
var AiSettlementsApi = class {
  constructor(client) {
    __publicField(this, "dashboard");
    this.dashboard = new AiSettlementsDashboardApi(client);
  }
};
var AiRoutingUsageApi = class {
  constructor(client) {
    __publicField(this, "client");
    this.client = client;
  }
  /** List routing usage */
  async retrieve(requestOptions) {
    return this.client.request(appApiPath(`/ai/routing/usage`), { ...(requestOptions == null ? void 0 : requestOptions.signal) !== void 0 ? { signal: requestOptions.signal } : {}, ...(requestOptions == null ? void 0 : requestOptions.timeout) !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "GET", sdkworkUnwrapKind: "data" });
  }
};
var AiRoutingRequestTracesApi = class {
  constructor(client) {
    __publicField(this, "client");
    this.client = client;
  }
  /** List routing request traces */
  async list(params, requestOptions) {
    const query = buildQueryString$4([
      { name: "cursor", value: params == null ? void 0 : params.cursor, style: "form", explode: true, allowReserved: false },
      { name: "page_size", value: params == null ? void 0 : params.pageSize, style: "form", explode: true, allowReserved: false },
      { name: "q", value: params == null ? void 0 : params.q, style: "form", explode: true, allowReserved: false }
    ]);
    return this.client.request(appendQueryString$4(appApiPath(`/ai/routing/request_traces`), query), { ...(requestOptions == null ? void 0 : requestOptions.signal) !== void 0 ? { signal: requestOptions.signal } : {}, ...(requestOptions == null ? void 0 : requestOptions.timeout) !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "GET", sdkworkUnwrapKind: "page" });
  }
};
var AiRoutingApiKeysApi = class {
  constructor(client) {
    __publicField(this, "client");
    this.client = client;
  }
  /** List routing API keys */
  async list(params, requestOptions) {
    const query = buildQueryString$4([
      { name: "page", value: params == null ? void 0 : params.page, style: "form", explode: true, allowReserved: false },
      { name: "page_size", value: params == null ? void 0 : params.pageSize, style: "form", explode: true, allowReserved: false },
      { name: "q", value: params == null ? void 0 : params.q, style: "form", explode: true, allowReserved: false }
    ]);
    return this.client.request(appendQueryString$4(appApiPath(`/ai/routing/api_keys`), query), { ...(requestOptions == null ? void 0 : requestOptions.signal) !== void 0 ? { signal: requestOptions.signal } : {}, ...(requestOptions == null ? void 0 : requestOptions.timeout) !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "GET", sdkworkUnwrapKind: "page" });
  }
};
var AiRoutingAccountGroupsApi = class {
  constructor(client) {
    __publicField(this, "client");
    this.client = client;
  }
  /** List routing account groups */
  async list(params, requestOptions) {
    const query = buildQueryString$4([
      { name: "page", value: params == null ? void 0 : params.page, style: "form", explode: true, allowReserved: false },
      { name: "page_size", value: params == null ? void 0 : params.pageSize, style: "form", explode: true, allowReserved: false },
      { name: "q", value: params == null ? void 0 : params.q, style: "form", explode: true, allowReserved: false }
    ]);
    return this.client.request(appendQueryString$4(appApiPath(`/ai/routing/account_groups`), query), { ...(requestOptions == null ? void 0 : requestOptions.signal) !== void 0 ? { signal: requestOptions.signal } : {}, ...(requestOptions == null ? void 0 : requestOptions.timeout) !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "GET", sdkworkUnwrapKind: "page" });
  }
};
var AiRoutingApi = class {
  constructor(client) {
    __publicField(this, "accountGroups");
    __publicField(this, "apiKeys");
    __publicField(this, "requestTraces");
    __publicField(this, "usage");
    this.accountGroups = new AiRoutingAccountGroupsApi(client);
    this.apiKeys = new AiRoutingApiKeysApi(client);
    this.requestTraces = new AiRoutingRequestTracesApi(client);
    this.usage = new AiRoutingUsageApi(client);
  }
};
var AiPricingRatesApi = class {
  constructor(client) {
    __publicField(this, "client");
    this.client = client;
  }
  /** List official pricing rates */
  async list(params, requestOptions) {
    const query = buildQueryString$4([
      { name: "category", value: params == null ? void 0 : params.category, style: "form", explode: true, allowReserved: false },
      { name: "q", value: params == null ? void 0 : params.q, style: "form", explode: true, allowReserved: false },
      { name: "vendor_code", value: params == null ? void 0 : params.vendorCode, style: "form", explode: true, allowReserved: false },
      { name: "region_code", value: params == null ? void 0 : params.regionCode, style: "form", explode: true, allowReserved: false },
      { name: "meter_code", value: params == null ? void 0 : params.meterCode, style: "form", explode: true, allowReserved: false },
      { name: "currency_code", value: params == null ? void 0 : params.currencyCode, style: "form", explode: true, allowReserved: false },
      { name: "page", value: params == null ? void 0 : params.page, style: "form", explode: true, allowReserved: false },
      { name: "page_size", value: params == null ? void 0 : params.pageSize, style: "form", explode: true, allowReserved: false }
    ]);
    return this.client.request(appendQueryString$4(appApiPath(`/ai/pricing/rates`), query), { ...(requestOptions == null ? void 0 : requestOptions.signal) !== void 0 ? { signal: requestOptions.signal } : {}, ...(requestOptions == null ? void 0 : requestOptions.timeout) !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "GET", sdkworkUnwrapKind: "page" });
  }
};
var AiPricingApi = class {
  constructor(client) {
    __publicField(this, "rates");
    this.rates = new AiPricingRatesApi(client);
  }
};
var AiGatewayTracesApi = class {
  constructor(client) {
    __publicField(this, "client");
    this.client = client;
  }
  /** List traces */
  async list(params, requestOptions) {
    const query = buildQueryString$4([
      { name: "cursor", value: params == null ? void 0 : params.cursor, style: "form", explode: true, allowReserved: false },
      { name: "page_size", value: params == null ? void 0 : params.pageSize, style: "form", explode: true, allowReserved: false },
      { name: "q", value: params == null ? void 0 : params.q, style: "form", explode: true, allowReserved: false }
    ]);
    return this.client.request(appendQueryString$4(appApiPath(`/ai/gateway/traces`), query), { ...(requestOptions == null ? void 0 : requestOptions.signal) !== void 0 ? { signal: requestOptions.signal } : {}, ...(requestOptions == null ? void 0 : requestOptions.timeout) !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "GET", sdkworkUnwrapKind: "page" });
  }
};
var AiGatewayApi = class {
  constructor(client) {
    __publicField(this, "traces");
    this.traces = new AiGatewayTracesApi(client);
  }
};
var AiDashboardOverviewApi = class {
  constructor(client) {
    __publicField(this, "client");
    this.client = client;
  }
  /** List dashboard overview */
  async retrieve(params, requestOptions) {
    const query = buildQueryString$4([
      { name: "time_range", value: params == null ? void 0 : params.timeRange, style: "form", explode: true, allowReserved: false },
      { name: "start_time", value: params == null ? void 0 : params.startTime, style: "form", explode: true, allowReserved: false },
      { name: "end_time", value: params == null ? void 0 : params.endTime, style: "form", explode: true, allowReserved: false }
    ]);
    return this.client.request(appendQueryString$4(appApiPath(`/ai/dashboard/overview`), query), { ...(requestOptions == null ? void 0 : requestOptions.signal) !== void 0 ? { signal: requestOptions.signal } : {}, ...(requestOptions == null ? void 0 : requestOptions.timeout) !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "GET", sdkworkUnwrapKind: "data" });
  }
};
var AiDashboardApi = class {
  constructor(client) {
    __publicField(this, "overview");
    this.overview = new AiDashboardOverviewApi(client);
  }
};
var AiApi = class {
  constructor(client) {
    __publicField(this, "dashboard");
    __publicField(this, "gateway");
    __publicField(this, "pricing");
    __publicField(this, "routing");
    __publicField(this, "settlements");
    __publicField(this, "usage");
    this.dashboard = new AiDashboardApi(client);
    this.gateway = new AiGatewayApi(client);
    this.pricing = new AiPricingApi(client);
    this.routing = new AiRoutingApi(client);
    this.settlements = new AiSettlementsApi(client);
    this.usage = new AiUsageApi(client);
  }
};
function createAiApi(client) {
  return new AiApi(client);
}
function appendQueryString$4(path, rawQueryString) {
  const query = rawQueryString.replace(/^\?+/, "");
  if (!query) {
    return path;
  }
  return path.includes("?") ? `${path}&${query}` : `${path}?${query}`;
}
function buildQueryString$4(parameters) {
  const pairs = [];
  for (const parameter of parameters) {
    appendSerializedParameter$4(pairs, parameter);
  }
  return pairs.join("&");
}
function appendSerializedParameter$4(pairs, parameter) {
  if (parameter.value === void 0 || parameter.value === null) {
    return;
  }
  if (parameter.contentType) {
    pairs.push(`${encodeQueryComponent$4(parameter.name)}=${encodeQueryValue$4(JSON.stringify(parameter.value), parameter.allowReserved)}`);
    return;
  }
  const style = parameter.style || "form";
  if (style === "deepObject") {
    appendDeepObjectParameter$4(pairs, parameter.name, parameter.value, parameter.allowReserved);
    return;
  }
  if (Array.isArray(parameter.value)) {
    appendArrayParameter$4(pairs, parameter.name, parameter.value, style, parameter.explode, parameter.allowReserved);
    return;
  }
  if (typeof parameter.value === "object") {
    appendObjectParameter$4(pairs, parameter.name, parameter.value, style, parameter.explode, parameter.allowReserved);
    return;
  }
  pairs.push(`${encodeQueryComponent$4(parameter.name)}=${encodeQueryValue$4(serializePrimitive$4(parameter.value), parameter.allowReserved)}`);
}
function appendArrayParameter$4(pairs, name, value, style, explode, allowReserved) {
  const values = value.filter((item) => item !== void 0 && item !== null).map((item) => serializePrimitive$4(item));
  if (values.length === 0) {
    return;
  }
  if (style === "form" && explode) {
    for (const item of values) {
      pairs.push(`${encodeQueryComponent$4(name)}=${encodeQueryValue$4(item, allowReserved)}`);
    }
    return;
  }
  pairs.push(`${encodeQueryComponent$4(name)}=${encodeQueryValue$4(values.join(","), allowReserved)}`);
}
function appendObjectParameter$4(pairs, name, value, style, explode, allowReserved) {
  const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== void 0 && entryValue !== null);
  if (entries.length === 0) {
    return;
  }
  if (style === "form" && explode) {
    for (const [key, entryValue] of entries) {
      pairs.push(`${encodeQueryComponent$4(key)}=${encodeQueryValue$4(serializePrimitive$4(entryValue), allowReserved)}`);
    }
    return;
  }
  const serialized = entries.flatMap(([key, entryValue]) => [key, serializePrimitive$4(entryValue)]).join(",");
  pairs.push(`${encodeQueryComponent$4(name)}=${encodeQueryValue$4(serialized, allowReserved)}`);
}
function appendDeepObjectParameter$4(pairs, name, value, allowReserved) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    pairs.push(`${encodeQueryComponent$4(name)}=${encodeQueryValue$4(serializePrimitive$4(value), allowReserved)}`);
    return;
  }
  for (const [key, entryValue] of Object.entries(value)) {
    if (entryValue === void 0 || entryValue === null) {
      continue;
    }
    pairs.push(`${encodeQueryComponent$4(`${name}[${key}]`)}=${encodeQueryValue$4(serializePrimitive$4(entryValue), allowReserved)}`);
  }
}
function serializePrimitive$4(value) {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}
function encodeQueryComponent$4(value) {
  return encodeURIComponent(value);
}
function encodeQueryValue$4(value, allowReserved) {
  const encoded = encodeURIComponent(value);
  if (!allowReserved) {
    return encoded;
  }
  return encoded.replace(/%3A/gi, ":").replace(/%2F/gi, "/").replace(/%3F/gi, "?").replace(/%23/gi, "#").replace(/%5B/gi, "[").replace(/%5D/gi, "]").replace(/%40/gi, "@").replace(/%21/gi, "!").replace(/%24/gi, "$").replace(/%26/gi, "&").replace(/%27/gi, "'").replace(/%28/gi, "(").replace(/%29/gi, ")").replace(/%2A/gi, "*").replace(/%2B/gi, "+").replace(/%2C/gi, ",").replace(/%3B/gi, ";").replace(/%3D/gi, "=");
}
var IamUsersSettingsApi = class {
  constructor(client) {
    __publicField(this, "client");
    this.client = client;
  }
  /** List settings */
  async retrieve(requestOptions) {
    return this.client.request(appApiPath(`/iam/users/settings`), { ...(requestOptions == null ? void 0 : requestOptions.signal) !== void 0 ? { signal: requestOptions.signal } : {}, ...(requestOptions == null ? void 0 : requestOptions.timeout) !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "GET", sdkworkUnwrapKind: "data" });
  }
  /** Update settings */
  async update(body, requestOptions) {
    return this.client.request(appApiPath(`/iam/users/settings`), { ...(requestOptions == null ? void 0 : requestOptions.signal) !== void 0 ? { signal: requestOptions.signal } : {}, ...(requestOptions == null ? void 0 : requestOptions.timeout) !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "PUT", body, contentType: "application/json", sdkworkUnwrapKind: "data" });
  }
};
var IamUsersApi = class {
  constructor(client) {
    __publicField(this, "settings");
    this.settings = new IamUsersSettingsApi(client);
  }
};
var IamInvitesValidateApi = class {
  constructor(client) {
    __publicField(this, "client");
    this.client = client;
  }
  /** Validate invite code */
  async create(body, requestOptions) {
    return this.client.request(appApiPath(`/iam/invites/validate`), { ...(requestOptions == null ? void 0 : requestOptions.signal) !== void 0 ? { signal: requestOptions.signal } : {}, ...(requestOptions == null ? void 0 : requestOptions.timeout) !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "POST", body, contentType: "application/json", skipAuth: true, sdkworkUnwrapKind: "data" });
  }
};
var IamInvitesClaimApi = class {
  constructor(client) {
    __publicField(this, "client");
    this.client = client;
  }
  /** Claim invite relation */
  async create(body, requestOptions) {
    return this.client.request(appApiPath(`/iam/invites/claim`), { ...(requestOptions == null ? void 0 : requestOptions.signal) !== void 0 ? { signal: requestOptions.signal } : {}, ...(requestOptions == null ? void 0 : requestOptions.timeout) !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "POST", body, contentType: "application/json", sdkworkUnwrapKind: "data" });
  }
};
var IamInvitePolicyApi = class {
  constructor(client) {
    __publicField(this, "client");
    this.client = client;
  }
  /** List invite policy */
  async retrieve(params, requestOptions) {
    const query = buildQueryString$3([
      { name: "tenant_code", value: params == null ? void 0 : params.tenantCode, style: "form", explode: true, allowReserved: false },
      { name: "organization_code", value: params == null ? void 0 : params.organizationCode, style: "form", explode: true, allowReserved: false }
    ]);
    return this.client.request(appendQueryString$3(appApiPath(`/iam/invite/policy`), query), { ...(requestOptions == null ? void 0 : requestOptions.signal) !== void 0 ? { signal: requestOptions.signal } : {}, ...(requestOptions == null ? void 0 : requestOptions.timeout) !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "GET", skipAuth: true, sdkworkUnwrapKind: "data" });
  }
};
var IamInviteApi = class {
  constructor(client) {
    __publicField(this, "policy");
    __publicField(this, "claim");
    __publicField(this, "validate");
    this.policy = new IamInvitePolicyApi(client);
    this.claim = new IamInvitesClaimApi(client);
    this.validate = new IamInvitesValidateApi(client);
  }
};
var IamApiKeysApi = class {
  constructor(client) {
    __publicField(this, "client");
    this.client = client;
  }
  /** List keys */
  async list(params, requestOptions) {
    const query = buildQueryString$3([
      { name: "page", value: params == null ? void 0 : params.page, style: "form", explode: true, allowReserved: false },
      { name: "page_size", value: params == null ? void 0 : params.pageSize, style: "form", explode: true, allowReserved: false },
      { name: "q", value: params == null ? void 0 : params.q, style: "form", explode: true, allowReserved: false }
    ]);
    return this.client.request(appendQueryString$3(appApiPath(`/iam/api_keys`), query), { ...(requestOptions == null ? void 0 : requestOptions.signal) !== void 0 ? { signal: requestOptions.signal } : {}, ...(requestOptions == null ? void 0 : requestOptions.timeout) !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "GET", sdkworkUnwrapKind: "page" });
  }
  /** Create key */
  async create(body, params, requestOptions) {
    const requestHeaders = buildRequestHeaders({
      "Idempotency-Key": { value: params.idempotencyKey, style: "simple", explode: false }
    }, {});
    return this.client.request(appApiPath(`/iam/api_keys`), { ...(requestOptions == null ? void 0 : requestOptions.signal) !== void 0 ? { signal: requestOptions.signal } : {}, ...(requestOptions == null ? void 0 : requestOptions.timeout) !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "POST", body, contentType: "application/json", ...requestHeaders !== void 0 ? { headers: requestHeaders } : {}, sdkworkUnwrapKind: "data" });
  }
  /** Delete key */
  async delete(apiKeyId, requestOptions) {
    return this.client.request(appApiPath(`/iam/api_keys/${serializePathParameter$2(apiKeyId, { name: "apiKeyId", style: "simple", explode: false })}`), { ...(requestOptions == null ? void 0 : requestOptions.signal) !== void 0 ? { signal: requestOptions.signal } : {}, ...(requestOptions == null ? void 0 : requestOptions.timeout) !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "DELETE" });
  }
  /** Update key */
  async update(apiKeyId, body, requestOptions) {
    return this.client.request(appApiPath(`/iam/api_keys/${serializePathParameter$2(apiKeyId, { name: "apiKeyId", style: "simple", explode: false })}`), { ...(requestOptions == null ? void 0 : requestOptions.signal) !== void 0 ? { signal: requestOptions.signal } : {}, ...(requestOptions == null ? void 0 : requestOptions.timeout) !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "PATCH", body, contentType: "application/json", sdkworkUnwrapKind: "item" });
  }
};
var IamApi = class {
  constructor(client) {
    __publicField(this, "apiKeys");
    __publicField(this, "invite");
    __publicField(this, "users");
    this.apiKeys = new IamApiKeysApi(client);
    this.invite = new IamInviteApi(client);
    this.users = new IamUsersApi(client);
  }
};
function createIamApi(client) {
  return new IamApi(client);
}
function appendQueryString$3(path, rawQueryString) {
  const query = rawQueryString.replace(/^\?+/, "");
  if (!query) {
    return path;
  }
  return path.includes("?") ? `${path}&${query}` : `${path}?${query}`;
}
function serializePathParameter$2(value, spec) {
  if (value === void 0 || value === null) {
    return "";
  }
  const style = spec.style || "simple";
  if (Array.isArray(value)) {
    return serializePathArray$2(spec.name, value, style, spec.explode);
  }
  if (typeof value === "object") {
    return serializePathObject$2(spec.name, value, style, spec.explode);
  }
  return pathPrefix$2(spec.name, style) + encodePathValue$2(serializePathPrimitive$2(value));
}
function serializePathArray$2(name, values, style, explode) {
  const serialized = values.filter((item) => item !== void 0 && item !== null).map((item) => encodePathValue$2(serializePathPrimitive$2(item)));
  if (serialized.length === 0) {
    return pathPrefix$2(name, style);
  }
  if (style === "matrix") {
    return explode ? serialized.map((item) => `;${name}=${item}`).join("") : `;${name}=${serialized.join(",")}`;
  }
  return pathPrefix$2(name, style) + serialized.join(explode ? "." : ",");
}
function serializePathObject$2(name, value, style, explode) {
  const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== void 0 && entryValue !== null);
  if (entries.length === 0) {
    return pathPrefix$2(name, style);
  }
  if (style === "matrix") {
    return explode ? entries.map(([key, entryValue]) => `;${encodePathValue$2(key)}=${encodePathValue$2(serializePathPrimitive$2(entryValue))}`).join("") : `;${name}=${entries.flatMap(([key, entryValue]) => [encodePathValue$2(key), encodePathValue$2(serializePathPrimitive$2(entryValue))]).join(",")}`;
  }
  const serialized = explode ? entries.map(([key, entryValue]) => `${encodePathValue$2(key)}=${encodePathValue$2(serializePathPrimitive$2(entryValue))}`).join(style === "label" ? "." : ",") : entries.flatMap(([key, entryValue]) => [encodePathValue$2(key), encodePathValue$2(serializePathPrimitive$2(entryValue))]).join(",");
  return pathPrefix$2(name, style) + serialized;
}
function pathPrefix$2(name, style, _objectValue) {
  if (style === "label")
    return ".";
  if (style === "matrix")
    return `;${name}`;
  return "";
}
function encodePathValue$2(value) {
  return encodeURIComponent(value);
}
function serializePathPrimitive$2(value) {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}
function buildQueryString$3(parameters) {
  const pairs = [];
  for (const parameter of parameters) {
    appendSerializedParameter$3(pairs, parameter);
  }
  return pairs.join("&");
}
function appendSerializedParameter$3(pairs, parameter) {
  if (parameter.value === void 0 || parameter.value === null) {
    return;
  }
  if (parameter.contentType) {
    pairs.push(`${encodeQueryComponent$3(parameter.name)}=${encodeQueryValue$3(JSON.stringify(parameter.value), parameter.allowReserved)}`);
    return;
  }
  const style = parameter.style || "form";
  if (style === "deepObject") {
    appendDeepObjectParameter$3(pairs, parameter.name, parameter.value, parameter.allowReserved);
    return;
  }
  if (Array.isArray(parameter.value)) {
    appendArrayParameter$3(pairs, parameter.name, parameter.value, style, parameter.explode, parameter.allowReserved);
    return;
  }
  if (typeof parameter.value === "object") {
    appendObjectParameter$3(pairs, parameter.name, parameter.value, style, parameter.explode, parameter.allowReserved);
    return;
  }
  pairs.push(`${encodeQueryComponent$3(parameter.name)}=${encodeQueryValue$3(serializePrimitive$3(parameter.value), parameter.allowReserved)}`);
}
function appendArrayParameter$3(pairs, name, value, style, explode, allowReserved) {
  const values = value.filter((item) => item !== void 0 && item !== null).map((item) => serializePrimitive$3(item));
  if (values.length === 0) {
    return;
  }
  if (style === "form" && explode) {
    for (const item of values) {
      pairs.push(`${encodeQueryComponent$3(name)}=${encodeQueryValue$3(item, allowReserved)}`);
    }
    return;
  }
  pairs.push(`${encodeQueryComponent$3(name)}=${encodeQueryValue$3(values.join(","), allowReserved)}`);
}
function appendObjectParameter$3(pairs, name, value, style, explode, allowReserved) {
  const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== void 0 && entryValue !== null);
  if (entries.length === 0) {
    return;
  }
  if (style === "form" && explode) {
    for (const [key, entryValue] of entries) {
      pairs.push(`${encodeQueryComponent$3(key)}=${encodeQueryValue$3(serializePrimitive$3(entryValue), allowReserved)}`);
    }
    return;
  }
  const serialized = entries.flatMap(([key, entryValue]) => [key, serializePrimitive$3(entryValue)]).join(",");
  pairs.push(`${encodeQueryComponent$3(name)}=${encodeQueryValue$3(serialized, allowReserved)}`);
}
function appendDeepObjectParameter$3(pairs, name, value, allowReserved) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    pairs.push(`${encodeQueryComponent$3(name)}=${encodeQueryValue$3(serializePrimitive$3(value), allowReserved)}`);
    return;
  }
  for (const [key, entryValue] of Object.entries(value)) {
    if (entryValue === void 0 || entryValue === null) {
      continue;
    }
    pairs.push(`${encodeQueryComponent$3(`${name}[${key}]`)}=${encodeQueryValue$3(serializePrimitive$3(entryValue), allowReserved)}`);
  }
}
function serializePrimitive$3(value) {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}
function encodeQueryComponent$3(value) {
  return encodeURIComponent(value);
}
function encodeQueryValue$3(value, allowReserved) {
  const encoded = encodeURIComponent(value);
  if (!allowReserved) {
    return encoded;
  }
  return encoded.replace(/%3A/gi, ":").replace(/%2F/gi, "/").replace(/%3F/gi, "?").replace(/%23/gi, "#").replace(/%5B/gi, "[").replace(/%5D/gi, "]").replace(/%40/gi, "@").replace(/%21/gi, "!").replace(/%24/gi, "$").replace(/%26/gi, "&").replace(/%27/gi, "'").replace(/%28/gi, "(").replace(/%29/gi, ")").replace(/%2A/gi, "*").replace(/%2B/gi, "+").replace(/%2C/gi, ",").replace(/%3B/gi, ";").replace(/%3D/gi, "=");
}
function buildRequestHeaders(headers, cookies = {}) {
  const requestHeaders = {};
  for (const [name, parameter] of Object.entries(headers)) {
    const serialized = serializeParameterValue(parameter);
    if (serialized !== void 0) {
      requestHeaders[name] = serialized;
    }
  }
  const cookieHeader = buildCookieHeader(cookies);
  if (cookieHeader) {
    requestHeaders.Cookie = requestHeaders.Cookie ? `${requestHeaders.Cookie}; ${cookieHeader}` : cookieHeader;
  }
  return Object.keys(requestHeaders).length > 0 ? requestHeaders : void 0;
}
function buildCookieHeader(cookies) {
  const pairs = [];
  for (const [name, parameter] of Object.entries(cookies)) {
    const serialized = serializeParameterValue(parameter);
    if (serialized !== void 0) {
      pairs.push(`${encodeURIComponent(name)}=${encodeURIComponent(serialized)}`);
    }
  }
  return pairs.length > 0 ? pairs.join("; ") : void 0;
}
function serializeParameterValue(parameter) {
  const value = parameter == null ? void 0 : parameter.value;
  if (value === void 0 || value === null) {
    return void 0;
  }
  if (parameter == null ? void 0 : parameter.contentType) {
    return JSON.stringify(value);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return value.map((item) => serializeHeaderPrimitive(item)).join(",");
  }
  if (typeof value === "object" && value !== null) {
    return serializeHeaderObject(value, (parameter == null ? void 0 : parameter.explode) === true);
  }
  return serializeHeaderPrimitive(value);
}
function serializeHeaderObject(value, explode) {
  const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== void 0 && entryValue !== null);
  if (explode) {
    return entries.map(([key, entryValue]) => `${key}=${serializeHeaderPrimitive(entryValue)}`).join(",");
  }
  return entries.flatMap(([key, entryValue]) => [key, serializeHeaderPrimitive(entryValue)]).join(",");
}
function serializeHeaderPrimitive(value) {
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value);
}
var NotificationPopupSeenApi = class {
  constructor(client) {
    __publicField(this, "client");
    this.client = client;
  }
  /** Mark popup seen */
  async create(notificationId, params, requestOptions) {
    const query = buildQueryString$2([
      { name: "app_id", value: params == null ? void 0 : params.appId, style: "form", explode: true, allowReserved: false }
    ]);
    return this.client.request(appendQueryString$2(appApiPath(`/notification/notifications/${serializePathParameter$1(notificationId, { name: "notificationId", style: "simple", explode: false })}/popup_seen`), query), { ...(requestOptions == null ? void 0 : requestOptions.signal) !== void 0 ? { signal: requestOptions.signal } : {}, ...(requestOptions == null ? void 0 : requestOptions.timeout) !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "POST", sdkworkUnwrapKind: "data" });
  }
};
var NotificationAcknowledgeApi = class {
  constructor(client) {
    __publicField(this, "client");
    this.client = client;
  }
  /** Acknowledge */
  async create(notificationId, params, requestOptions) {
    const query = buildQueryString$2([
      { name: "app_id", value: params == null ? void 0 : params.appId, style: "form", explode: true, allowReserved: false }
    ]);
    return this.client.request(appendQueryString$2(appApiPath(`/notification/notifications/${serializePathParameter$1(notificationId, { name: "notificationId", style: "simple", explode: false })}/acknowledge`), query), { ...(requestOptions == null ? void 0 : requestOptions.signal) !== void 0 ? { signal: requestOptions.signal } : {}, ...(requestOptions == null ? void 0 : requestOptions.timeout) !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "POST", sdkworkUnwrapKind: "data" });
  }
};
var NotificationApi = class {
  constructor(client) {
    __publicField(this, "client");
    __publicField(this, "acknowledge");
    __publicField(this, "popupSeen");
    this.client = client;
    this.acknowledge = new NotificationAcknowledgeApi(client);
    this.popupSeen = new NotificationPopupSeenApi(client);
  }
  /** List notifications */
  async list(params, requestOptions) {
    const query = buildQueryString$2([
      { name: "app_id", value: params == null ? void 0 : params.appId, style: "form", explode: true, allowReserved: false },
      { name: "include_archived", value: params == null ? void 0 : params.includeArchived, style: "form", explode: true, allowReserved: false },
      { name: "page", value: params == null ? void 0 : params.page, style: "form", explode: true, allowReserved: false },
      { name: "page_size", value: params == null ? void 0 : params.pageSize, style: "form", explode: true, allowReserved: false }
    ]);
    return this.client.request(appendQueryString$2(appApiPath(`/notification/notifications`), query), { ...(requestOptions == null ? void 0 : requestOptions.signal) !== void 0 ? { signal: requestOptions.signal } : {}, ...(requestOptions == null ? void 0 : requestOptions.timeout) !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "GET", sdkworkUnwrapKind: "page" });
  }
};
function createNotificationApi(client) {
  return new NotificationApi(client);
}
function appendQueryString$2(path, rawQueryString) {
  const query = rawQueryString.replace(/^\?+/, "");
  if (!query) {
    return path;
  }
  return path.includes("?") ? `${path}&${query}` : `${path}?${query}`;
}
function serializePathParameter$1(value, spec) {
  if (value === void 0 || value === null) {
    return "";
  }
  const style = spec.style || "simple";
  if (Array.isArray(value)) {
    return serializePathArray$1(spec.name, value, style, spec.explode);
  }
  if (typeof value === "object") {
    return serializePathObject$1(spec.name, value, style, spec.explode);
  }
  return pathPrefix$1(spec.name, style) + encodePathValue$1(serializePathPrimitive$1(value));
}
function serializePathArray$1(name, values, style, explode) {
  const serialized = values.filter((item) => item !== void 0 && item !== null).map((item) => encodePathValue$1(serializePathPrimitive$1(item)));
  if (serialized.length === 0) {
    return pathPrefix$1(name, style);
  }
  if (style === "matrix") {
    return explode ? serialized.map((item) => `;${name}=${item}`).join("") : `;${name}=${serialized.join(",")}`;
  }
  return pathPrefix$1(name, style) + serialized.join(explode ? "." : ",");
}
function serializePathObject$1(name, value, style, explode) {
  const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== void 0 && entryValue !== null);
  if (entries.length === 0) {
    return pathPrefix$1(name, style);
  }
  if (style === "matrix") {
    return explode ? entries.map(([key, entryValue]) => `;${encodePathValue$1(key)}=${encodePathValue$1(serializePathPrimitive$1(entryValue))}`).join("") : `;${name}=${entries.flatMap(([key, entryValue]) => [encodePathValue$1(key), encodePathValue$1(serializePathPrimitive$1(entryValue))]).join(",")}`;
  }
  const serialized = explode ? entries.map(([key, entryValue]) => `${encodePathValue$1(key)}=${encodePathValue$1(serializePathPrimitive$1(entryValue))}`).join(style === "label" ? "." : ",") : entries.flatMap(([key, entryValue]) => [encodePathValue$1(key), encodePathValue$1(serializePathPrimitive$1(entryValue))]).join(",");
  return pathPrefix$1(name, style) + serialized;
}
function pathPrefix$1(name, style, _objectValue) {
  if (style === "label")
    return ".";
  if (style === "matrix")
    return `;${name}`;
  return "";
}
function encodePathValue$1(value) {
  return encodeURIComponent(value);
}
function serializePathPrimitive$1(value) {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}
function buildQueryString$2(parameters) {
  const pairs = [];
  for (const parameter of parameters) {
    appendSerializedParameter$2(pairs, parameter);
  }
  return pairs.join("&");
}
function appendSerializedParameter$2(pairs, parameter) {
  if (parameter.value === void 0 || parameter.value === null) {
    return;
  }
  if (parameter.contentType) {
    pairs.push(`${encodeQueryComponent$2(parameter.name)}=${encodeQueryValue$2(JSON.stringify(parameter.value), parameter.allowReserved)}`);
    return;
  }
  const style = parameter.style || "form";
  if (style === "deepObject") {
    appendDeepObjectParameter$2(pairs, parameter.name, parameter.value, parameter.allowReserved);
    return;
  }
  if (Array.isArray(parameter.value)) {
    appendArrayParameter$2(pairs, parameter.name, parameter.value, style, parameter.explode, parameter.allowReserved);
    return;
  }
  if (typeof parameter.value === "object") {
    appendObjectParameter$2(pairs, parameter.name, parameter.value, style, parameter.explode, parameter.allowReserved);
    return;
  }
  pairs.push(`${encodeQueryComponent$2(parameter.name)}=${encodeQueryValue$2(serializePrimitive$2(parameter.value), parameter.allowReserved)}`);
}
function appendArrayParameter$2(pairs, name, value, style, explode, allowReserved) {
  const values = value.filter((item) => item !== void 0 && item !== null).map((item) => serializePrimitive$2(item));
  if (values.length === 0) {
    return;
  }
  if (style === "form" && explode) {
    for (const item of values) {
      pairs.push(`${encodeQueryComponent$2(name)}=${encodeQueryValue$2(item, allowReserved)}`);
    }
    return;
  }
  pairs.push(`${encodeQueryComponent$2(name)}=${encodeQueryValue$2(values.join(","), allowReserved)}`);
}
function appendObjectParameter$2(pairs, name, value, style, explode, allowReserved) {
  const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== void 0 && entryValue !== null);
  if (entries.length === 0) {
    return;
  }
  if (style === "form" && explode) {
    for (const [key, entryValue] of entries) {
      pairs.push(`${encodeQueryComponent$2(key)}=${encodeQueryValue$2(serializePrimitive$2(entryValue), allowReserved)}`);
    }
    return;
  }
  const serialized = entries.flatMap(([key, entryValue]) => [key, serializePrimitive$2(entryValue)]).join(",");
  pairs.push(`${encodeQueryComponent$2(name)}=${encodeQueryValue$2(serialized, allowReserved)}`);
}
function appendDeepObjectParameter$2(pairs, name, value, allowReserved) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    pairs.push(`${encodeQueryComponent$2(name)}=${encodeQueryValue$2(serializePrimitive$2(value), allowReserved)}`);
    return;
  }
  for (const [key, entryValue] of Object.entries(value)) {
    if (entryValue === void 0 || entryValue === null) {
      continue;
    }
    pairs.push(`${encodeQueryComponent$2(`${name}[${key}]`)}=${encodeQueryValue$2(serializePrimitive$2(entryValue), allowReserved)}`);
  }
}
function serializePrimitive$2(value) {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}
function encodeQueryComponent$2(value) {
  return encodeURIComponent(value);
}
function encodeQueryValue$2(value, allowReserved) {
  const encoded = encodeURIComponent(value);
  if (!allowReserved) {
    return encoded;
  }
  return encoded.replace(/%3A/gi, ":").replace(/%2F/gi, "/").replace(/%3F/gi, "?").replace(/%23/gi, "#").replace(/%5B/gi, "[").replace(/%5D/gi, "]").replace(/%40/gi, "@").replace(/%21/gi, "!").replace(/%24/gi, "$").replace(/%26/gi, "&").replace(/%27/gi, "'").replace(/%28/gi, "(").replace(/%29/gi, ")").replace(/%2A/gi, "*").replace(/%2B/gi, "+").replace(/%2C/gi, ",").replace(/%3B/gi, ";").replace(/%3D/gi, "=");
}
var RuntimeInvocationsEventsStreamApi = class {
  constructor(client) {
    __publicField(this, "client");
    this.client = client;
  }
  /** Stream runtime events */
  async retrieve(invocationId, params, requestOptions) {
    const query = buildQueryString$1([
      { name: "after_event_no", value: params == null ? void 0 : params.afterEventNo, style: "form", explode: true, allowReserved: false }
    ]);
    return this.client.request(appendQueryString$1(appApiPath(`/runtime/invocations/${serializePathParameter(invocationId, { name: "invocationId", style: "simple", explode: false })}/events/stream`), query), { ...(requestOptions == null ? void 0 : requestOptions.signal) !== void 0 ? { signal: requestOptions.signal } : {}, ...(requestOptions == null ? void 0 : requestOptions.timeout) !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "GET", sdkworkUnwrapKind: "data" });
  }
};
var RuntimeInvocationsEventsApi = class {
  constructor(client) {
    __publicField(this, "client");
    __publicField(this, "stream");
    this.client = client;
    this.stream = new RuntimeInvocationsEventsStreamApi(client);
  }
  /** List runtime events */
  async list(invocationId, params, requestOptions) {
    const query = buildQueryString$1([
      { name: "page", value: params == null ? void 0 : params.page, style: "form", explode: true, allowReserved: false },
      { name: "page_size", value: params == null ? void 0 : params.pageSize, style: "form", explode: true, allowReserved: false }
    ]);
    return this.client.request(appendQueryString$1(appApiPath(`/runtime/invocations/${serializePathParameter(invocationId, { name: "invocationId", style: "simple", explode: false })}/events`), query), { ...(requestOptions == null ? void 0 : requestOptions.signal) !== void 0 ? { signal: requestOptions.signal } : {}, ...(requestOptions == null ? void 0 : requestOptions.timeout) !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "GET", sdkworkUnwrapKind: "page" });
  }
  /** Create runtime event */
  async create(invocationId, body, requestOptions) {
    return this.client.request(appApiPath(`/runtime/invocations/${serializePathParameter(invocationId, { name: "invocationId", style: "simple", explode: false })}/events`), { ...(requestOptions == null ? void 0 : requestOptions.signal) !== void 0 ? { signal: requestOptions.signal } : {}, ...(requestOptions == null ? void 0 : requestOptions.timeout) !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "POST", body, contentType: "application/json", sdkworkUnwrapKind: "item" });
  }
};
var RuntimeInvocationsCompletionsApi = class {
  constructor(client) {
    __publicField(this, "client");
    this.client = client;
  }
  /** Complete runtime invocation */
  async create(invocationId, body, requestOptions) {
    return this.client.request(appApiPath(`/runtime/invocations/${serializePathParameter(invocationId, { name: "invocationId", style: "simple", explode: false })}/completions`), { ...(requestOptions == null ? void 0 : requestOptions.signal) !== void 0 ? { signal: requestOptions.signal } : {}, ...(requestOptions == null ? void 0 : requestOptions.timeout) !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "POST", body, contentType: "application/json", sdkworkUnwrapKind: "item" });
  }
};
var RuntimeInvocationsArtifactsApi = class {
  constructor(client) {
    __publicField(this, "client");
    this.client = client;
  }
  /** List runtime artifacts */
  async list(invocationId, params, requestOptions) {
    const query = buildQueryString$1([
      { name: "page", value: params == null ? void 0 : params.page, style: "form", explode: true, allowReserved: false },
      { name: "page_size", value: params == null ? void 0 : params.pageSize, style: "form", explode: true, allowReserved: false }
    ]);
    return this.client.request(appendQueryString$1(appApiPath(`/runtime/invocations/${serializePathParameter(invocationId, { name: "invocationId", style: "simple", explode: false })}/artifacts`), query), { ...(requestOptions == null ? void 0 : requestOptions.signal) !== void 0 ? { signal: requestOptions.signal } : {}, ...(requestOptions == null ? void 0 : requestOptions.timeout) !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "GET", sdkworkUnwrapKind: "page" });
  }
  /** Create runtime artifact */
  async create(invocationId, body, requestOptions) {
    return this.client.request(appApiPath(`/runtime/invocations/${serializePathParameter(invocationId, { name: "invocationId", style: "simple", explode: false })}/artifacts`), { ...(requestOptions == null ? void 0 : requestOptions.signal) !== void 0 ? { signal: requestOptions.signal } : {}, ...(requestOptions == null ? void 0 : requestOptions.timeout) !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "POST", body, contentType: "application/json", sdkworkUnwrapKind: "item" });
  }
};
var RuntimeInvocationsApi = class {
  constructor(client) {
    __publicField(this, "client");
    __publicField(this, "artifacts");
    __publicField(this, "completions");
    __publicField(this, "events");
    this.client = client;
    this.artifacts = new RuntimeInvocationsArtifactsApi(client);
    this.completions = new RuntimeInvocationsCompletionsApi(client);
    this.events = new RuntimeInvocationsEventsApi(client);
  }
  /** List runtime invocations */
  async list(params, requestOptions) {
    const query = buildQueryString$1([
      { name: "page", value: params == null ? void 0 : params.page, style: "form", explode: true, allowReserved: false },
      { name: "page_size", value: params == null ? void 0 : params.pageSize, style: "form", explode: true, allowReserved: false },
      { name: "conversation_id", value: params == null ? void 0 : params.conversationId, style: "form", explode: true, allowReserved: false },
      { name: "chat_turn_id", value: params == null ? void 0 : params.chatTurnId, style: "form", explode: true, allowReserved: false },
      { name: "agent_session_id", value: params == null ? void 0 : params.agentSessionId, style: "form", explode: true, allowReserved: false },
      { name: "runtime", value: params == null ? void 0 : params.runtime, style: "form", explode: true, allowReserved: false },
      { name: "status", value: params == null ? void 0 : params.status, style: "form", explode: true, allowReserved: false }
    ]);
    return this.client.request(appendQueryString$1(appApiPath(`/runtime/invocations`), query), { ...(requestOptions == null ? void 0 : requestOptions.signal) !== void 0 ? { signal: requestOptions.signal } : {}, ...(requestOptions == null ? void 0 : requestOptions.timeout) !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "GET", sdkworkUnwrapKind: "page" });
  }
  /** Create runtime invocation */
  async create(body, requestOptions) {
    return this.client.request(appApiPath(`/runtime/invocations`), { ...(requestOptions == null ? void 0 : requestOptions.signal) !== void 0 ? { signal: requestOptions.signal } : {}, ...(requestOptions == null ? void 0 : requestOptions.timeout) !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "POST", body, contentType: "application/json", sdkworkUnwrapKind: "item" });
  }
  /** Retrieve runtime invocation */
  async retrieve(invocationId, requestOptions) {
    return this.client.request(appApiPath(`/runtime/invocations/${serializePathParameter(invocationId, { name: "invocationId", style: "simple", explode: false })}`), { ...(requestOptions == null ? void 0 : requestOptions.signal) !== void 0 ? { signal: requestOptions.signal } : {}, ...(requestOptions == null ? void 0 : requestOptions.timeout) !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "GET", sdkworkUnwrapKind: "data" });
  }
};
var RuntimeApi = class {
  constructor(client) {
    __publicField(this, "invocations");
    this.invocations = new RuntimeInvocationsApi(client);
  }
};
function createRuntimeApi(client) {
  return new RuntimeApi(client);
}
function appendQueryString$1(path, rawQueryString) {
  const query = rawQueryString.replace(/^\?+/, "");
  if (!query) {
    return path;
  }
  return path.includes("?") ? `${path}&${query}` : `${path}?${query}`;
}
function serializePathParameter(value, spec) {
  if (value === void 0 || value === null) {
    return "";
  }
  const style = spec.style || "simple";
  if (Array.isArray(value)) {
    return serializePathArray(spec.name, value, style, spec.explode);
  }
  if (typeof value === "object") {
    return serializePathObject(spec.name, value, style, spec.explode);
  }
  return pathPrefix(spec.name, style) + encodePathValue(serializePathPrimitive(value));
}
function serializePathArray(name, values, style, explode) {
  const serialized = values.filter((item) => item !== void 0 && item !== null).map((item) => encodePathValue(serializePathPrimitive(item)));
  if (serialized.length === 0) {
    return pathPrefix(name, style);
  }
  if (style === "matrix") {
    return explode ? serialized.map((item) => `;${name}=${item}`).join("") : `;${name}=${serialized.join(",")}`;
  }
  return pathPrefix(name, style) + serialized.join(explode ? "." : ",");
}
function serializePathObject(name, value, style, explode) {
  const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== void 0 && entryValue !== null);
  if (entries.length === 0) {
    return pathPrefix(name, style);
  }
  if (style === "matrix") {
    return explode ? entries.map(([key, entryValue]) => `;${encodePathValue(key)}=${encodePathValue(serializePathPrimitive(entryValue))}`).join("") : `;${name}=${entries.flatMap(([key, entryValue]) => [encodePathValue(key), encodePathValue(serializePathPrimitive(entryValue))]).join(",")}`;
  }
  const serialized = explode ? entries.map(([key, entryValue]) => `${encodePathValue(key)}=${encodePathValue(serializePathPrimitive(entryValue))}`).join(style === "label" ? "." : ",") : entries.flatMap(([key, entryValue]) => [encodePathValue(key), encodePathValue(serializePathPrimitive(entryValue))]).join(",");
  return pathPrefix(name, style) + serialized;
}
function pathPrefix(name, style, _objectValue) {
  if (style === "label")
    return ".";
  if (style === "matrix")
    return `;${name}`;
  return "";
}
function encodePathValue(value) {
  return encodeURIComponent(value);
}
function serializePathPrimitive(value) {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}
function buildQueryString$1(parameters) {
  const pairs = [];
  for (const parameter of parameters) {
    appendSerializedParameter$1(pairs, parameter);
  }
  return pairs.join("&");
}
function appendSerializedParameter$1(pairs, parameter) {
  if (parameter.value === void 0 || parameter.value === null) {
    return;
  }
  if (parameter.contentType) {
    pairs.push(`${encodeQueryComponent$1(parameter.name)}=${encodeQueryValue$1(JSON.stringify(parameter.value), parameter.allowReserved)}`);
    return;
  }
  const style = parameter.style || "form";
  if (style === "deepObject") {
    appendDeepObjectParameter$1(pairs, parameter.name, parameter.value, parameter.allowReserved);
    return;
  }
  if (Array.isArray(parameter.value)) {
    appendArrayParameter$1(pairs, parameter.name, parameter.value, style, parameter.explode, parameter.allowReserved);
    return;
  }
  if (typeof parameter.value === "object") {
    appendObjectParameter$1(pairs, parameter.name, parameter.value, style, parameter.explode, parameter.allowReserved);
    return;
  }
  pairs.push(`${encodeQueryComponent$1(parameter.name)}=${encodeQueryValue$1(serializePrimitive$1(parameter.value), parameter.allowReserved)}`);
}
function appendArrayParameter$1(pairs, name, value, style, explode, allowReserved) {
  const values = value.filter((item) => item !== void 0 && item !== null).map((item) => serializePrimitive$1(item));
  if (values.length === 0) {
    return;
  }
  if (style === "form" && explode) {
    for (const item of values) {
      pairs.push(`${encodeQueryComponent$1(name)}=${encodeQueryValue$1(item, allowReserved)}`);
    }
    return;
  }
  pairs.push(`${encodeQueryComponent$1(name)}=${encodeQueryValue$1(values.join(","), allowReserved)}`);
}
function appendObjectParameter$1(pairs, name, value, style, explode, allowReserved) {
  const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== void 0 && entryValue !== null);
  if (entries.length === 0) {
    return;
  }
  if (style === "form" && explode) {
    for (const [key, entryValue] of entries) {
      pairs.push(`${encodeQueryComponent$1(key)}=${encodeQueryValue$1(serializePrimitive$1(entryValue), allowReserved)}`);
    }
    return;
  }
  const serialized = entries.flatMap(([key, entryValue]) => [key, serializePrimitive$1(entryValue)]).join(",");
  pairs.push(`${encodeQueryComponent$1(name)}=${encodeQueryValue$1(serialized, allowReserved)}`);
}
function appendDeepObjectParameter$1(pairs, name, value, allowReserved) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    pairs.push(`${encodeQueryComponent$1(name)}=${encodeQueryValue$1(serializePrimitive$1(value), allowReserved)}`);
    return;
  }
  for (const [key, entryValue] of Object.entries(value)) {
    if (entryValue === void 0 || entryValue === null) {
      continue;
    }
    pairs.push(`${encodeQueryComponent$1(`${name}[${key}]`)}=${encodeQueryValue$1(serializePrimitive$1(entryValue), allowReserved)}`);
  }
}
function serializePrimitive$1(value) {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}
function encodeQueryComponent$1(value) {
  return encodeURIComponent(value);
}
function encodeQueryValue$1(value, allowReserved) {
  const encoded = encodeURIComponent(value);
  if (!allowReserved) {
    return encoded;
  }
  return encoded.replace(/%3A/gi, ":").replace(/%2F/gi, "/").replace(/%3F/gi, "?").replace(/%23/gi, "#").replace(/%5B/gi, "[").replace(/%5D/gi, "]").replace(/%40/gi, "@").replace(/%21/gi, "!").replace(/%24/gi, "$").replace(/%26/gi, "&").replace(/%27/gi, "'").replace(/%28/gi, "(").replace(/%29/gi, ")").replace(/%2A/gi, "*").replace(/%2B/gi, "+").replace(/%2C/gi, ",").replace(/%3B/gi, ";").replace(/%3D/gi, "=");
}
var SystemSiteRuntimeApi = class {
  constructor(client) {
    __publicField(this, "client");
    this.client = client;
  }
  /** List site branding */
  async retrieve(params, requestOptions) {
    const query = buildQueryString([
      { name: "tenant_code", value: params == null ? void 0 : params.tenantCode, style: "form", explode: true, allowReserved: false },
      { name: "organization_code", value: params == null ? void 0 : params.organizationCode, style: "form", explode: true, allowReserved: false }
    ]);
    return this.client.request(appendQueryString(appApiPath(`/system/site/runtime`), query), { ...(requestOptions == null ? void 0 : requestOptions.signal) !== void 0 ? { signal: requestOptions.signal } : {}, ...(requestOptions == null ? void 0 : requestOptions.timeout) !== void 0 ? { timeout: requestOptions.timeout } : {}, method: "GET", skipAuth: true, sdkworkUnwrapKind: "data" });
  }
};
var SystemSiteApi = class {
  constructor(client) {
    __publicField(this, "runtime");
    this.runtime = new SystemSiteRuntimeApi(client);
  }
};
var SystemApi = class {
  constructor(client) {
    __publicField(this, "site");
    this.site = new SystemSiteApi(client);
  }
};
function createSystemApi(client) {
  return new SystemApi(client);
}
function appendQueryString(path, rawQueryString) {
  const query = rawQueryString.replace(/^\?+/, "");
  if (!query) {
    return path;
  }
  return path.includes("?") ? `${path}&${query}` : `${path}?${query}`;
}
function buildQueryString(parameters) {
  const pairs = [];
  for (const parameter of parameters) {
    appendSerializedParameter(pairs, parameter);
  }
  return pairs.join("&");
}
function appendSerializedParameter(pairs, parameter) {
  if (parameter.value === void 0 || parameter.value === null) {
    return;
  }
  if (parameter.contentType) {
    pairs.push(`${encodeQueryComponent(parameter.name)}=${encodeQueryValue(JSON.stringify(parameter.value), parameter.allowReserved)}`);
    return;
  }
  const style = parameter.style || "form";
  if (style === "deepObject") {
    appendDeepObjectParameter(pairs, parameter.name, parameter.value, parameter.allowReserved);
    return;
  }
  if (Array.isArray(parameter.value)) {
    appendArrayParameter(pairs, parameter.name, parameter.value, style, parameter.explode, parameter.allowReserved);
    return;
  }
  if (typeof parameter.value === "object") {
    appendObjectParameter(pairs, parameter.name, parameter.value, style, parameter.explode, parameter.allowReserved);
    return;
  }
  pairs.push(`${encodeQueryComponent(parameter.name)}=${encodeQueryValue(serializePrimitive(parameter.value), parameter.allowReserved)}`);
}
function appendArrayParameter(pairs, name, value, style, explode, allowReserved) {
  const values = value.filter((item) => item !== void 0 && item !== null).map((item) => serializePrimitive(item));
  if (values.length === 0) {
    return;
  }
  if (style === "form" && explode) {
    for (const item of values) {
      pairs.push(`${encodeQueryComponent(name)}=${encodeQueryValue(item, allowReserved)}`);
    }
    return;
  }
  pairs.push(`${encodeQueryComponent(name)}=${encodeQueryValue(values.join(","), allowReserved)}`);
}
function appendObjectParameter(pairs, name, value, style, explode, allowReserved) {
  const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== void 0 && entryValue !== null);
  if (entries.length === 0) {
    return;
  }
  if (style === "form" && explode) {
    for (const [key, entryValue] of entries) {
      pairs.push(`${encodeQueryComponent(key)}=${encodeQueryValue(serializePrimitive(entryValue), allowReserved)}`);
    }
    return;
  }
  const serialized = entries.flatMap(([key, entryValue]) => [key, serializePrimitive(entryValue)]).join(",");
  pairs.push(`${encodeQueryComponent(name)}=${encodeQueryValue(serialized, allowReserved)}`);
}
function appendDeepObjectParameter(pairs, name, value, allowReserved) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    pairs.push(`${encodeQueryComponent(name)}=${encodeQueryValue(serializePrimitive(value), allowReserved)}`);
    return;
  }
  for (const [key, entryValue] of Object.entries(value)) {
    if (entryValue === void 0 || entryValue === null) {
      continue;
    }
    pairs.push(`${encodeQueryComponent(`${name}[${key}]`)}=${encodeQueryValue(serializePrimitive(entryValue), allowReserved)}`);
  }
}
function serializePrimitive(value) {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}
function encodeQueryComponent(value) {
  return encodeURIComponent(value);
}
function encodeQueryValue(value, allowReserved) {
  const encoded = encodeURIComponent(value);
  if (!allowReserved) {
    return encoded;
  }
  return encoded.replace(/%3A/gi, ":").replace(/%2F/gi, "/").replace(/%3F/gi, "?").replace(/%23/gi, "#").replace(/%5B/gi, "[").replace(/%5D/gi, "]").replace(/%40/gi, "@").replace(/%21/gi, "!").replace(/%24/gi, "$").replace(/%26/gi, "&").replace(/%27/gi, "'").replace(/%28/gi, "(").replace(/%29/gi, ")").replace(/%2A/gi, "*").replace(/%2B/gi, "+").replace(/%2C/gi, ",").replace(/%3B/gi, ";").replace(/%3D/gi, "=");
}
var SdkworkAppClient = class {
  constructor(config) {
    __publicField(this, "httpClient");
    __publicField(this, "ai");
    __publicField(this, "iam");
    __publicField(this, "notification");
    __publicField(this, "runtime");
    __publicField(this, "system");
    this.httpClient = createHttpClient(config);
    this.ai = createAiApi(this.httpClient);
    this.iam = createIamApi(this.httpClient);
    this.notification = createNotificationApi(this.httpClient);
    this.runtime = createRuntimeApi(this.httpClient);
    this.system = createSystemApi(this.httpClient);
  }
  setAuthToken(token) {
    this.httpClient.setAuthToken(token);
    return this;
  }
  setAccessToken(token) {
    this.httpClient.setAccessToken(token);
    return this;
  }
  setTokenManager(manager) {
    this.httpClient.setTokenManager(manager);
    return this;
  }
  get http() {
    return this.httpClient;
  }
};

// packages/sdkwork-cloudrouter-mp-core/src/sdk/sdkClients.ts
var appSdkClient = null;
var appSdkBaseUrl = null;
function createCloudRouterMpAppSdkClient(baseUrl) {
  return new SdkworkAppClient({
    baseUrl,
    platform: "mp-weixin",
    tokenManager: getCloudRouterTokenManager()
  });
}
function getCloudRouterMpAppSdkClient(baseUrl) {
  if (!appSdkClient || appSdkBaseUrl !== baseUrl) {
    appSdkClient = createCloudRouterMpAppSdkClient(baseUrl);
    appSdkBaseUrl = baseUrl;
  }
  return appSdkClient;
}

// packages/sdkwork-cloudrouter-mp-core/src/sdk/consolePorts.ts
var DEFAULT_API_KEY_QUOTA = "0.000000";
var DEFAULT_API_KEY_IP_LIMIT = "unrestricted";
var DEFAULT_API_KEY_EXPIRATION = "never";
var DEFAULT_API_KEY_MODALITIES = ["text", "image", "video", "audio", "music"];
function createConsoleOperationToken(prefix) {
  var _a;
  const host = globalThis;
  const randomUUID = (_a = host.crypto) == null ? void 0 : _a.randomUUID;
  const unique = typeof randomUUID === "function" ? randomUUID.call(host.crypto) : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${unique}`;
}
function createCloudRouterMpConsolePorts(appApiBaseUrl) {
  const client = () => getCloudRouterMpAppSdkClient(appApiBaseUrl);
  return {
    overview: {
      retrieveOverview: async () => await client().ai.dashboard.overview.retrieve()
    },
    usage: {
      listUsageLogs: async (query) => await client().ai.usage.logs.list({
        ...query.pageSize !== void 0 ? { pageSize: query.pageSize } : {},
        ...query.model !== void 0 ? { q: query.model } : {},
        ...query.status === "succeeded" ? { status: "success" } : query.status === "failed" ? { status: "error" } : {}
      })
    },
    apiKeys: {
      listApiKeys: async (query) => await client().iam.apiKeys.list({
        ...query.pageSize !== void 0 ? { pageSize: query.pageSize } : {}
      }),
      createApiKey: async (input) => {
        var _a, _b, _c, _d, _e;
        return await client().iam.apiKeys.create(
          {
            name: input.name,
            quota: (_a = input.quota) != null ? _a : DEFAULT_API_KEY_QUOTA,
            isUnlimitedQuota: (_b = input.isUnlimitedQuota) != null ? _b : true,
            modalities: [...(_c = input.modalities) != null ? _c : DEFAULT_API_KEY_MODALITIES],
            ipLimit: (_d = input.ipLimit) != null ? _d : DEFAULT_API_KEY_IP_LIMIT,
            expires: (_e = input.expires) != null ? _e : DEFAULT_API_KEY_EXPIRATION
          },
          { idempotencyKey: createConsoleOperationToken("create-api-key") }
        );
      },
      revokeApiKey: async (apiKeyId) => {
        await client().iam.apiKeys.delete(apiKeyId);
      }
    },
    catalog: {
      listPricingRates: async (query) => await client().ai.pricing.rates.list({
        ...query.pageSize !== void 0 ? { pageSize: query.pageSize } : {},
        ...query.vendor !== void 0 ? { vendor: query.vendor } : {},
        ...query.keyword !== void 0 ? { q: query.keyword } : {}
      })
    },
    notifications: {
      listNotifications: async (query) => await client().notification.list({
        ...query.unreadOnly !== void 0 ? { unreadOnly: query.unreadOnly } : {},
        ...query.pageSize !== void 0 ? { pageSize: query.pageSize } : {}
      })
    },
    session: {
      readSession: readCloudRouterSession,
      saveSession: writeCloudRouterSession,
      clearSession: clearCloudRouterSession
    }
  };
}

// packages/sdkwork-cloudrouter-mp-i18n/src/i18n/zh-CN/cloudrouter/console/shared.ts
var sharedMessages = {
  "cloudrouter.console.shared.appTitle": "CloudRouter \u63A7\u5236\u53F0",
  "cloudrouter.console.shared.appSubtitle": "\u5C0F\u7A0B\u5E8F\u6A21\u578B\u8DEF\u7531\u63A7\u5236\u53F0",
  "cloudrouter.console.shared.signOut": "\u9000\u51FA\u767B\u5F55",
  "cloudrouter.console.shared.reload": "\u91CD\u8BD5",
  "cloudrouter.console.shared.empty": "\u6682\u65E0\u6570\u636E",
  "cloudrouter.console.shared.loading": "\u52A0\u8F7D\u4E2D\u2026"
};

// packages/sdkwork-cloudrouter-mp-i18n/src/i18n/zh-CN/cloudrouter/console/dashboard.ts
var dashboardMessages = {
  "cloudrouter.console.dashboard.title": "\u6982\u89C8",
  "cloudrouter.console.dashboard.summary": "\u7F51\u5173\u8BF7\u6C42\u3001Token \u4E0E\u9519\u8BEF\u7387\u5FEB\u7167",
  "cloudrouter.console.dashboard.requests": "\u8BF7\u6C42\u603B\u6570",
  "cloudrouter.console.dashboard.tokens": "Token \u603B\u6570",
  "cloudrouter.console.dashboard.cost": "\u7D2F\u8BA1\u82B1\u8D39",
  "cloudrouter.console.dashboard.errorRate": "\u9519\u8BEF\u7387"
};

// packages/sdkwork-cloudrouter-mp-i18n/src/i18n/zh-CN/cloudrouter/console/usage.ts
var usageMessages = {
  "cloudrouter.console.usage.title": "\u7528\u91CF",
  "cloudrouter.console.usage.summary": "\u9010\u6B21\u8BF7\u6C42\u7684\u7528\u91CF\u4E0E\u8BA1\u8D39\u8BB0\u5F55",
  "cloudrouter.console.usage.columnModel": "\u6A21\u578B",
  "cloudrouter.console.usage.columnTokens": "Token",
  "cloudrouter.console.usage.columnCost": "\u8D39\u7528",
  "cloudrouter.console.usage.columnStatus": "\u72B6\u6001",
  "cloudrouter.console.usage.columnTime": "\u65F6\u95F4",
  "cloudrouter.console.usage.statusSucceeded": "\u6210\u529F",
  "cloudrouter.console.usage.statusFailed": "\u5931\u8D25",
  "cloudrouter.console.usage.statusProcessing": "\u5904\u7406\u4E2D",
  "cloudrouter.console.usage.statusUnknown": "\u672A\u77E5"
};

// packages/sdkwork-cloudrouter-mp-i18n/src/i18n/zh-CN/cloudrouter/console/apiKeys.ts
var apiKeysMessages = {
  "cloudrouter.console.apiKeys.title": "API Key",
  "cloudrouter.console.apiKeys.summary": "\u7BA1\u7406\u8C03\u7528\u7F51\u5173\u4F7F\u7528\u7684\u5BC6\u94A5",
  "cloudrouter.console.apiKeys.namePlaceholder": "\u5BC6\u94A5\u540D\u79F0",
  "cloudrouter.console.apiKeys.create": "\u65B0\u5EFA\u5BC6\u94A5",
  "cloudrouter.console.apiKeys.creating": "\u521B\u5EFA\u4E2D",
  "cloudrouter.console.apiKeys.revoke": "\u540A\u9500",
  "cloudrouter.console.apiKeys.empty": "\u8FD8\u6CA1\u6709 API Key",
  "cloudrouter.console.apiKeys.createdOnce": "\u5BC6\u94A5\u5DF2\u521B\u5EFA\uFF0C\u8BF7\u7ACB\u5373\u4FDD\u5B58\uFF1A",
  "cloudrouter.console.apiKeys.statusActive": "\u542F\u7528",
  "cloudrouter.console.apiKeys.statusDisabled": "\u505C\u7528",
  "cloudrouter.console.apiKeys.statusRevoked": "\u5DF2\u540A\u9500"
};

// packages/sdkwork-cloudrouter-mp-i18n/src/i18n/zh-CN/cloudrouter/console/catalog.ts
var catalogMessages = {
  "cloudrouter.console.catalog.title": "\u6A21\u578B\u4E0E\u5B9A\u4EF7",
  "cloudrouter.console.catalog.summary": "\u5B98\u65B9\u6A21\u578B\u76EE\u5F55\u4E0E\u6BCF\u767E\u4E07 Token \u4EF7\u683C",
  "cloudrouter.console.catalog.columnVendor": "\u5382\u5546",
  "cloudrouter.console.catalog.columnModel": "\u6A21\u578B",
  "cloudrouter.console.catalog.columnInput": "\u8F93\u5165\u4EF7",
  "cloudrouter.console.catalog.columnOutput": "\u8F93\u51FA\u4EF7"
};

// packages/sdkwork-cloudrouter-mp-i18n/src/i18n/en-US/cloudrouter/console/shared.ts
var sharedMessages2 = {
  "cloudrouter.console.shared.appTitle": "CloudRouter Console",
  "cloudrouter.console.shared.appSubtitle": "Mini program model routing console",
  "cloudrouter.console.shared.signOut": "Sign out",
  "cloudrouter.console.shared.reload": "Retry",
  "cloudrouter.console.shared.empty": "No data",
  "cloudrouter.console.shared.loading": "Loading\u2026"
};

// packages/sdkwork-cloudrouter-mp-i18n/src/i18n/en-US/cloudrouter/console/dashboard.ts
var dashboardMessages2 = {
  "cloudrouter.console.dashboard.title": "Overview",
  "cloudrouter.console.dashboard.summary": "Gateway requests, tokens, and error-rate snapshot",
  "cloudrouter.console.dashboard.requests": "Requests",
  "cloudrouter.console.dashboard.tokens": "Tokens",
  "cloudrouter.console.dashboard.cost": "Total cost",
  "cloudrouter.console.dashboard.errorRate": "Error rate"
};

// packages/sdkwork-cloudrouter-mp-i18n/src/i18n/en-US/cloudrouter/console/usage.ts
var usageMessages2 = {
  "cloudrouter.console.usage.title": "Usage",
  "cloudrouter.console.usage.summary": "Per-request usage and billing records",
  "cloudrouter.console.usage.columnModel": "Model",
  "cloudrouter.console.usage.columnTokens": "Tokens",
  "cloudrouter.console.usage.columnCost": "Cost",
  "cloudrouter.console.usage.columnStatus": "Status",
  "cloudrouter.console.usage.columnTime": "Time",
  "cloudrouter.console.usage.statusSucceeded": "Succeeded",
  "cloudrouter.console.usage.statusFailed": "Failed",
  "cloudrouter.console.usage.statusProcessing": "Processing",
  "cloudrouter.console.usage.statusUnknown": "Unknown"
};

// packages/sdkwork-cloudrouter-mp-i18n/src/i18n/en-US/cloudrouter/console/apiKeys.ts
var apiKeysMessages2 = {
  "cloudrouter.console.apiKeys.title": "API Keys",
  "cloudrouter.console.apiKeys.summary": "Manage the keys used to call the gateway",
  "cloudrouter.console.apiKeys.namePlaceholder": "Key name",
  "cloudrouter.console.apiKeys.create": "Create key",
  "cloudrouter.console.apiKeys.creating": "Creating",
  "cloudrouter.console.apiKeys.revoke": "Revoke",
  "cloudrouter.console.apiKeys.empty": "No API keys yet",
  "cloudrouter.console.apiKeys.createdOnce": "Key created \u2014 copy it now:",
  "cloudrouter.console.apiKeys.statusActive": "Active",
  "cloudrouter.console.apiKeys.statusDisabled": "Disabled",
  "cloudrouter.console.apiKeys.statusRevoked": "Revoked"
};

// packages/sdkwork-cloudrouter-mp-i18n/src/i18n/en-US/cloudrouter/console/catalog.ts
var catalogMessages2 = {
  "cloudrouter.console.catalog.title": "Models & Pricing",
  "cloudrouter.console.catalog.summary": "Official model catalog and per-million-token prices",
  "cloudrouter.console.catalog.columnVendor": "Vendor",
  "cloudrouter.console.catalog.columnModel": "Model",
  "cloudrouter.console.catalog.columnInput": "Input price",
  "cloudrouter.console.catalog.columnOutput": "Output price"
};

// packages/sdkwork-cloudrouter-mp-i18n/src/locale.ts
var SDKWORK_CONSOLE_SUPPORTED_LOCALES = ["zh-CN", "en-US"];
var SDKWORK_CONSOLE_DEFAULT_LOCALE = "zh-CN";
function normalizeConsoleLocale(candidate) {
  if (!candidate) return SDKWORK_CONSOLE_DEFAULT_LOCALE;
  const normalized = candidate.trim().toLowerCase();
  const exact = SDKWORK_CONSOLE_SUPPORTED_LOCALES.find(
    (locale) => locale.toLowerCase() === normalized
  );
  if (exact) return exact;
  const language = normalized.split("-")[0];
  const byLanguage = SDKWORK_CONSOLE_SUPPORTED_LOCALES.find(
    (locale) => locale.split("-")[0].toLowerCase() === language
  );
  return byLanguage != null ? byLanguage : SDKWORK_CONSOLE_DEFAULT_LOCALE;
}
function resolveConsoleLocale() {
  var _a, _b;
  const host = globalThis;
  const language = (_b = (_a = host.wx) == null ? void 0 : _a.getAppBaseInfo) == null ? void 0 : _b.call(_a).language;
  return normalizeConsoleLocale(language);
}

// packages/sdkwork-cloudrouter-mp-i18n/src/i18n/index.ts
var SDKWORK_CONSOLE_MESSAGES = {
  "zh-CN": {
    ...sharedMessages,
    ...dashboardMessages,
    ...usageMessages,
    ...apiKeysMessages,
    ...catalogMessages
  },
  "en-US": {
    ...sharedMessages2,
    ...dashboardMessages2,
    ...usageMessages2,
    ...apiKeysMessages2,
    ...catalogMessages2
  }
};
function resolveConsoleMessages(locale) {
  var _a;
  return (_a = SDKWORK_CONSOLE_MESSAGES[locale]) != null ? _a : SDKWORK_CONSOLE_MESSAGES[SDKWORK_CONSOLE_DEFAULT_LOCALE];
}
function createConsoleTranslator(locale) {
  const messages = resolveConsoleMessages(locale);
  const fallback = SDKWORK_CONSOLE_MESSAGES[SDKWORK_CONSOLE_DEFAULT_LOCALE];
  return (key) => {
    var _a, _b;
    return (_b = (_a = messages[key]) != null ? _a : fallback[key]) != null ? _b : key;
  };
}

// src/bootstrap/runtime.ts
function bootstrapMiniProgramApplication() {
  const environment = resolveRuntimeEnv();
  const locale = resolveConsoleLocale();
  return {
    locale,
    translate: createConsoleTranslator(locale),
    consolePorts: createCloudRouterMpConsolePorts(environment.appApiBaseUrl)
  };
}

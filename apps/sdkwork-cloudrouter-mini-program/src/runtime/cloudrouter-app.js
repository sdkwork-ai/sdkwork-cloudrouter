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
var CLOUDROUTER_CONSOLE_ROUTE_ORDER = [
  "dashboard",
  "usage",
  "apiKeys",
  "catalog"
];
var CLOUDROUTER_CONSOLE_TABS = CLOUDROUTER_CONSOLE_ROUTE_ORDER.map((routeKey) => {
  const route = CLOUDROUTER_CONSOLE_ROUTES[routeKey];
  const glyph = routeKey === "dashboard" ? "dashboard" : routeKey === "usage" ? "receipt" : routeKey === "apiKeys" ? "key" : "barChart";
  return { routeKey, path: route.path, titleKey: route.titleKey, glyph };
});
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
  var _a, _b, _c, _d, _e;
  const bridgeValue = (_a = globalThis["SDKWORK_RUNTIME_ENV"]) == null ? void 0 : _a[key];
  if (typeof bridgeValue === "string" && bridgeValue.length > 0) return bridgeValue;
  const viteValue = (_c = (_b = globalThis["import.meta"]) == null ? void 0 : _b.env) == null ? void 0 : _c[key];
  if (typeof viteValue === "string" && viteValue.length > 0) return viteValue;
  const processValue = (_e = (_d = globalThis["process"]) == null ? void 0 : _d.env) == null ? void 0 : _e[key];
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
  const relativeCandidate = parts.find((item) => item.candidate.startsWith("/") && !item.candidate.startsWith("//"));
  if (relativeCandidate) return {
    ...result(relativeCandidate.candidate.replace(/\/+$/u, "") || "/", "same-origin-relative"),
    host: ""
  };
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

// ../../../sdkwork-sdk-commons/sdkwork-sdk-common-typescript/dist/sdkwork-utils/packages/sdkwork-utils-typescript/src/runtime/random.js
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
  var _a, _b;
  const crypto = getCrypto();
  if (typeof crypto.randomUUID === "function") try {
    return crypto.randomUUID.call(crypto);
  } catch {
  }
  const bytes = randomBytes(16);
  bytes[6] = ((_a = bytes[6]) != null ? _a : 0) & 15 | 64;
  bytes[8] = ((_b = bytes[8]) != null ? _b : 0) & 63 | 128;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// ../../../sdkwork-sdk-commons/sdkwork-sdk-common-typescript/dist/sdkwork-utils/packages/sdkwork-utils-typescript/src/id.js
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
  function countOccurrences2(value, search) {
    if (isEmpty(value) || isEmpty(search)) return 0;
    return (value.match(new RegExp(escapeRegex(search), "g")) || []).length;
  }
  _StringUtils.countOccurrences = countOccurrences2;
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
    const normalize3 = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "").split("").sort().join("");
    return normalize3(a) === normalize3(b);
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
  var _a, _b, _c;
  const lifecycle = (_a = readEnv(source, "SDKWORK_ENVIRONMENT")) != null ? _a : "production";
  const appApiBaseUrl = readEnv(source, "SDKWORK_CLOUDROUTER_ROUTER_APP_API_BASE_URL");
  if (!appApiBaseUrl) {
    throw new Error(
      "Cloud Router mini program requires SDKWORK_CLOUDROUTER_ROUTER_APP_API_BASE_URL in the runtime environment."
    );
  }
  const appApiOrigin = resolveCloudRouterAppApiBaseUrl(appApiBaseUrl);
  const configuredPublicUrl = readEnv(
    source,
    "SDKWORK_CLOUDROUTER_ROUTER_APPLICATION_PUBLIC_HTTP_URL"
  );
  const configuredWebUrl = readEnv(
    source,
    "SDKWORK_CLOUDROUTER_ROUTER_WEB_PUBLIC_HTTP_URL"
  );
  return {
    appApiBaseUrl: appApiOrigin,
    webPublicHttpUrl: (_b = configuredWebUrl != null ? configuredWebUrl : configuredPublicUrl) != null ? _b : deriveOrigin(appApiOrigin),
    lifecycleEnvironment: LIFECYCLE_ENVIRONMENTS.has(lifecycle) ? lifecycle : "production",
    profileId: (_c = readEnv(source, "SDKWORK_PROFILE_ID")) != null ? _c : "standalone.production"
  };
}
function deriveOrigin(candidate) {
  const match = /^(https?:\/\/[^/]+)/iu.exec(candidate.trim());
  if (!match) {
    throw new Error(
      "Cloud Router mini program requires an absolute application public HTTP URL."
    );
  }
  return match[1];
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

// ../../../sdkwork-utils/packages/sdkwork-utils-typescript/src/string.js
function trim(value) {
  return value.trim();
}

// ../../../sdkwork-utils/packages/sdkwork-utils-typescript/src/runtime/binary.js
var textEncoder = new TextEncoder();
function toUtf8(value) {
  return textEncoder.encode(value);
}
var HEX = "0123456789abcdef";
function hexEncode(bytes) {
  let result = "";
  for (let index = 0; index < bytes.length; index += 1) {
    const byte = bytes[index];
    if (byte === void 0) {
      continue;
    }
    result += HEX[byte >> 4];
    result += HEX[byte & 15];
  }
  return result;
}

// ../../../sdkwork-utils/packages/sdkwork-utils-typescript/src/runtime/sha256.js
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
function readBlockU32(block, byteOffset) {
  return block[byteOffset] << 24 | block[byteOffset + 1] << 16 | block[byteOffset + 2] << 8 | block[byteOffset + 3];
}
function sha256Block(state, block, offset) {
  const words = new Uint32Array(64);
  for (let index = 0; index < 16; index += 1) {
    words[index] = readBlockU32(block, offset + index * 4);
  }
  for (let index = 16; index < 64; index += 1) {
    const wordMinus15 = words[index - 15];
    const wordMinus2 = words[index - 2];
    const wordMinus16 = words[index - 16];
    const wordMinus7 = words[index - 7];
    const s0 = rotr(wordMinus15, 7) ^ rotr(wordMinus15, 18) ^ wordMinus15 >>> 3;
    const s1 = rotr(wordMinus2, 17) ^ rotr(wordMinus2, 19) ^ wordMinus2 >>> 10;
    words[index] = wordMinus16 + s0 + wordMinus7 + s1 >>> 0;
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

// ../../../sdkwork-utils/packages/sdkwork-utils-typescript/src/crypto.js
function sha256Hash(value) {
  return sha256Hex(value);
}

// ../../../sdkwork-utils/packages/sdkwork-utils-typescript/src/money.js
var LOCALE_RULES = {
  "en-us": {
    prefix: true,
    decimal: ".",
    grouping: ",",
    nameSpace: true,
    compact: [
      { exponent: 12, unit: "T" },
      { exponent: 9, unit: "B" },
      { exponent: 6, unit: "M" },
      { exponent: 3, unit: "K" }
    ]
  },
  "zh-cn": {
    prefix: true,
    decimal: ".",
    grouping: ",",
    nameSpace: false,
    compact: [
      { exponent: 12, unit: "\u5146" },
      { exponent: 8, unit: "\u4EBF" },
      { exponent: 4, unit: "\u4E07" }
    ]
  },
  "ja-jp": {
    prefix: true,
    decimal: ".",
    grouping: ",",
    nameSpace: false,
    compact: [
      { exponent: 12, unit: "\u5146" },
      { exponent: 8, unit: "\u5104" },
      { exponent: 4, unit: "\u4E07" }
    ]
  },
  "ko-kr": {
    prefix: true,
    decimal: ".",
    grouping: ",",
    nameSpace: false,
    compact: [
      { exponent: 12, unit: "\uC870" },
      { exponent: 8, unit: "\uC5B5" },
      { exponent: 4, unit: "\uB9CC" }
    ]
  },
  "de-de": {
    prefix: false,
    decimal: ",",
    grouping: ".",
    nameSpace: true,
    compact: [
      { exponent: 12, unit: "Bio." },
      { exponent: 9, unit: "Mrd." },
      { exponent: 6, unit: "Mio." },
      { exponent: 3, unit: "Tsd." }
    ]
  },
  "fr-fr": {
    prefix: false,
    decimal: ",",
    grouping: " ",
    nameSpace: true,
    compact: [
      { exponent: 12, unit: "B" },
      { exponent: 9, unit: "Md" },
      { exponent: 6, unit: "M" },
      { exponent: 3, unit: "k" }
    ]
  },
  "it-it": {
    prefix: false,
    decimal: ",",
    grouping: ".",
    nameSpace: true,
    compact: [
      { exponent: 12, unit: "Bio." },
      { exponent: 9, unit: "Mrd." },
      { exponent: 6, unit: "M" },
      { exponent: 3, unit: "k" }
    ]
  },
  "es-es": {
    prefix: false,
    decimal: ",",
    grouping: ".",
    nameSpace: true,
    compact: [
      { exponent: 12, unit: "T" },
      { exponent: 9, unit: "B" },
      { exponent: 6, unit: "M" },
      { exponent: 3, unit: "k" }
    ]
  },
  "ru-ru": {
    prefix: false,
    decimal: ",",
    grouping: " ",
    nameSpace: true,
    compact: [
      { exponent: 12, unit: "\u0442\u0440\u043B\u043D" },
      { exponent: 9, unit: "\u043C\u043B\u0440\u0434" },
      { exponent: 6, unit: "\u043C\u043B\u043D" },
      { exponent: 3, unit: "\u0442\u044B\u0441." }
    ]
  }
};
var CURRENCY_NAMES = {
  "en-us": {
    USD: "US dollars",
    EUR: "euros",
    GBP: "British pounds",
    CNY: "Chinese yuan",
    JPY: "Japanese yen",
    KRW: "South Korean won",
    HKD: "Hong Kong dollars",
    TWD: "New Taiwan dollars",
    CHF: "Swiss francs",
    CAD: "Canadian dollars",
    AUD: "Australian dollars",
    INR: "Indian rupees",
    BHD: "Bahraini dinars",
    KWD: "Kuwaiti dinars"
  },
  "zh-cn": {
    USD: "\u7F8E\u5143",
    EUR: "\u6B27\u5143",
    GBP: "\u82F1\u9563",
    CNY: "\u4EBA\u6C11\u5E01",
    JPY: "\u65E5\u5143",
    KRW: "\u97E9\u5143",
    HKD: "\u6E2F\u5E01",
    TWD: "\u65B0\u53F0\u5E01",
    CHF: "\u745E\u58EB\u6CD5\u90CE",
    CAD: "\u52A0\u62FF\u5927\u5143",
    AUD: "\u6FB3\u5927\u5229\u4E9A\u5143",
    INR: "\u5370\u5EA6\u5362\u6BD4",
    BHD: "\u5DF4\u6797\u7B2C\u7EB3\u5C14",
    KWD: "\u79D1\u5A01\u7279\u7B2C\u7EB3\u5C14"
  },
  "de-de": {
    USD: "US-Dollar",
    EUR: "Euro",
    GBP: "Britisches Pfund",
    CNY: "Chinesischer Yuan",
    JPY: "Japanischer Yen",
    KRW: "S\xFCdkoreanischer Won",
    HKD: "Hongkong-Dollar",
    TWD: "Neuer Taiwan-Dollar",
    CHF: "Schweizer Franken",
    CAD: "Kanadischer Dollar",
    AUD: "Australischer Dollar",
    INR: "Indische Rupie",
    BHD: "Bahrainischer Dinar",
    KWD: "Kuwaitischer Dinar"
  },
  "fr-fr": {
    USD: "dollar am\xE9ricain",
    EUR: "euro",
    GBP: "livre sterling",
    CNY: "yuan chinois",
    JPY: "yen japonais",
    KRW: "won sud-cor\xE9en",
    HKD: "dollar de Hong Kong",
    TWD: "nouveau dollar de Ta\xEFwan",
    CHF: "franc suisse",
    CAD: "dollar canadien",
    AUD: "dollar australien",
    INR: "roupie indienne",
    BHD: "dinar bahre\xEFni",
    KWD: "dinar kowe\xEFtien"
  },
  "it-it": {
    USD: "dollaro statunitense",
    EUR: "euro",
    GBP: "sterlina britannica",
    CNY: "yuan cinese",
    JPY: "yen giapponese",
    KRW: "won sudcoreano",
    HKD: "dollaro di Hong Kong",
    TWD: "nuovo dollaro taiwanese",
    CHF: "franco svizzero",
    CAD: "dollaro canadese",
    AUD: "dollaro australiano",
    INR: "rupia indiana",
    BHD: "dinaro bahreinita",
    KWD: "dinaro kuwaitiano"
  },
  "es-es": {
    USD: "d\xF3lar estadounidense",
    EUR: "euro",
    GBP: "libra esterlina",
    CNY: "yuan chino",
    JPY: "yen japon\xE9s",
    KRW: "won surcoreano",
    HKD: "d\xF3lar de Hong Kong",
    TWD: "nuevo d\xF3lar taiwan\xE9s",
    CHF: "franco suizo",
    CAD: "d\xF3lar canadiense",
    AUD: "d\xF3lar australiano",
    INR: "rupia india",
    BHD: "dinar bahrein\xED",
    KWD: "dinar kuwait\xED"
  },
  "ja-jp": {
    USD: "\u7C73\u30C9\u30EB",
    EUR: "\u30E6\u30FC\u30ED",
    GBP: "\u82F1\u30DD\u30F3\u30C9",
    CNY: "\u4E2D\u56FD\u4EBA\u6C11\u5143",
    JPY: "\u65E5\u672C\u5186",
    KRW: "\u97D3\u56FD\u30A6\u30A9\u30F3",
    HKD: "\u9999\u6E2F\u30C9\u30EB",
    TWD: "\u53F0\u6E7E\u30C9\u30EB",
    CHF: "\u30B9\u30A4\u30B9\u30D5\u30E9\u30F3",
    CAD: "\u30AB\u30CA\u30C0\u30C9\u30EB",
    AUD: "\u30AA\u30FC\u30B9\u30C8\u30E9\u30EA\u30A2\u30C9\u30EB",
    INR: "\u30A4\u30F3\u30C9\u30EB\u30D4\u30FC",
    BHD: "\u30D0\u30FC\u30EC\u30FC\u30F3\u30C7\u30A3\u30FC\u30CA\u30FC\u30EB",
    KWD: "\u30AF\u30A6\u30A7\u30FC\u30C8\u30C7\u30A3\u30CA\u30FC\u30EB"
  },
  "ko-kr": {
    USD: "\uBBF8\uAD6D \uB2EC\uB7EC",
    EUR: "\uC720\uB85C",
    GBP: "\uC601\uAD6D \uD30C\uC6B4\uB4DC",
    CNY: "\uC911\uAD6D \uC704\uC548",
    JPY: "\uC77C\uBCF8 \uC5D4",
    KRW: "\uB300\uD55C\uBBFC\uAD6D \uC6D0",
    HKD: "\uD64D\uCF69 \uB2EC\uB7EC",
    TWD: "\uC2E0 \uB300\uB9CC \uB2EC\uB7EC",
    CHF: "\uC2A4\uC704\uC2A4 \uD504\uB791",
    CAD: "\uCE90\uB098\uB2E4 \uB2EC\uB7EC",
    AUD: "\uD638\uC8FC \uB2EC\uB7EC",
    INR: "\uC778\uB3C4 \uB8E8\uD53C",
    BHD: "\uBC14\uB808\uC778 \uB514\uB098\uB974",
    KWD: "\uCFE0\uC6E8\uC774\uD2B8 \uB514\uB098\uB974"
  },
  "ru-ru": {
    USD: "\u0434\u043E\u043B\u043B\u0430\u0440 \u0421\u0428\u0410",
    EUR: "\u0435\u0432\u0440\u043E",
    GBP: "\u0431\u0440\u0438\u0442\u0430\u043D\u0441\u043A\u0438\u0439 \u0444\u0443\u043D\u0442",
    CNY: "\u043A\u0438\u0442\u0430\u0439\u0441\u043A\u0438\u0439 \u044E\u0430\u043D\u044C",
    JPY: "\u044F\u043F\u043E\u043D\u0441\u043A\u0430\u044F \u0438\u0435\u043D\u0430",
    KRW: "\u044E\u0436\u043D\u043E\u043A\u043E\u0440\u0435\u0439\u0441\u043A\u0430\u044F \u0432\u043E\u043D\u0430",
    HKD: "\u0433\u043E\u043D\u043A\u043E\u043D\u0433\u0441\u043A\u0438\u0439 \u0434\u043E\u043B\u043B\u0430\u0440",
    TWD: "\u043D\u043E\u0432\u044B\u0439 \u0442\u0430\u0439\u0432\u0430\u043D\u044C\u0441\u043A\u0438\u0439 \u0434\u043E\u043B\u043B\u0430\u0440",
    CHF: "\u0448\u0432\u0435\u0439\u0446\u0430\u0440\u0441\u043A\u0438\u0439 \u0444\u0440\u0430\u043D\u043A",
    CAD: "\u043A\u0430\u043D\u0430\u0434\u0441\u043A\u0438\u0439 \u0434\u043E\u043B\u043B\u0430\u0440",
    AUD: "\u0430\u0432\u0441\u0442\u0440\u0430\u043B\u0438\u0439\u0441\u043A\u0438\u0439 \u0434\u043E\u043B\u043B\u0430\u0440",
    INR: "\u0438\u043D\u0434\u0438\u0439\u0441\u043A\u0430\u044F \u0440\u0443\u043F\u0438\u044F",
    BHD: "\u0431\u0430\u0445\u0440\u0435\u0439\u043D\u0441\u043A\u0438\u0439 \u0434\u0438\u043D\u0430\u0440",
    KWD: "\u043A\u0443\u0432\u0435\u0439\u0442\u0441\u043A\u0438\u0439 \u0434\u0438\u043D\u0430\u0440"
  }
};
var DEFAULT_LOCALE_RULES = LOCALE_RULES["en-us"];
var DEFAULT_CURRENCY_NAMES = CURRENCY_NAMES["en-us"];

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

// ../../../sdkwork-appbase/packages/common/system/sdkwork-settings-core/src/values.ts
function isSameSdkworkSettingsValue(left, right) {
  if (left === right) {
    return true;
  }
  if (Array.isArray(left) && Array.isArray(right)) {
    if (left.length !== right.length) {
      return false;
    }
    return left.every((item, index) => item === right[index]);
  }
  return false;
}
function resolveSdkworkSettingsValues(catalog, layers = {}) {
  const values = { ...catalog.defaults };
  const scopedLayers = [
    layers.system,
    layers.tenant,
    layers.user
  ];
  for (const layer of scopedLayers) {
    if (!layer) {
      continue;
    }
    for (const setting of catalog.settings) {
      const nextValue = layer[setting.id];
      if (nextValue !== void 0) {
        values[setting.id] = nextValue;
      }
    }
  }
  return values;
}
function findSdkworkSettingsDirtyIds(catalog, values, savedValues) {
  return catalog.settings.filter(
    (setting) => !isSameSdkworkSettingsValue(values[setting.id], savedValues[setting.id])
  ).map((setting) => setting.id);
}
function freezeSdkworkSettingsValues(values) {
  return Object.freeze({ ...values });
}

// ../../../sdkwork-appbase/packages/common/system/sdkwork-settings-core/src/catalog.ts
var DEFAULT_GROUP_ORDER = [
  "account",
  "general",
  "appearance",
  "language",
  "notifications",
  "privacy",
  "security",
  "storage",
  "advanced",
  "workspace",
  "ai",
  "usage",
  "system",
  "about"
];
function humanizeSdkworkSettingsId(id) {
  return id.split(/[-_.]/u).filter(Boolean).map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`).join(" ");
}
function createIds(values, label) {
  const byId = {};
  for (const value of values) {
    if (!value.id) {
      throw new Error(`Settings ${label} must define a non-empty id`);
    }
    if (byId[value.id]) {
      throw new Error(`Duplicate settings ${label} id: ${value.id}`);
    }
    byId[value.id] = value;
  }
  return byId;
}
function compareOrder(leftOrder, rightOrder) {
  return (leftOrder != null ? leftOrder : Number.MAX_SAFE_INTEGER) - (rightOrder != null ? rightOrder : Number.MAX_SAFE_INTEGER);
}
function groupRank(groupId) {
  const rank = DEFAULT_GROUP_ORDER.indexOf(
    groupId
  );
  return rank === -1 ? DEFAULT_GROUP_ORDER.length : rank;
}
function sortGroups(groups) {
  return [...groups].sort((left, right) => {
    const orderDifference = compareOrder(left.order, right.order);
    if (orderDifference !== 0) {
      return orderDifference;
    }
    const rankDifference = groupRank(left.id) - groupRank(right.id);
    if (rankDifference !== 0) {
      return rankDifference;
    }
    return String(left.id).localeCompare(String(right.id));
  });
}
function sortSections(sections) {
  return [...sections].sort((left, right) => {
    var _a, _b, _c, _d;
    const groupDifference = groupRank(left.groupId) - groupRank(right.groupId);
    if (groupDifference !== 0) {
      return groupDifference;
    }
    const orderDifference = compareOrder(left.order, right.order);
    if (orderDifference !== 0) {
      return orderDifference;
    }
    return ((_b = (_a = left.titleKey) != null ? _a : left.title) != null ? _b : left.id).localeCompare(
      (_d = (_c = right.titleKey) != null ? _c : right.title) != null ? _d : right.id
    );
  });
}
function sortSettings(settings) {
  return [...settings].sort((left, right) => {
    var _a, _b, _c, _d;
    const orderDifference = compareOrder(left.order, right.order);
    if (orderDifference !== 0) {
      return orderDifference;
    }
    return ((_b = (_a = left.titleKey) != null ? _a : left.title) != null ? _b : left.id).localeCompare(
      (_d = (_c = right.titleKey) != null ? _c : right.title) != null ? _d : right.id
    );
  });
}
function assertSettingDefinition(setting, sectionById) {
  const section = sectionById[setting.sectionId];
  if (!section) {
    throw new Error(
      `Settings setting ${setting.id} references unknown section ${setting.sectionId}`
    );
  }
  if (setting.kind === "select" || setting.kind === "radio") {
    if (!setting.options || setting.options.length === 0) {
      throw new Error(
        `Settings setting ${setting.id} requires options for kind ${setting.kind}`
      );
    }
    const optionValues = new Set(setting.options.map((option) => option.value));
    if (!optionValues.has(setting.defaultValue)) {
      throw new Error(
        `Settings setting ${setting.id} default value is not a declared option`
      );
    }
  }
  if (setting.kind === "toggle" && typeof setting.defaultValue !== "boolean") {
    throw new Error(`Settings toggle ${setting.id} requires a boolean default`);
  }
  if ((setting.kind === "number" || setting.kind === "slider") && typeof setting.defaultValue !== "number") {
    throw new Error(`Settings ${setting.kind} ${setting.id} requires a numeric default`);
  }
}
function createNavigation(groups, sections) {
  return groups.map((group) => ({
    group,
    sections: sections.filter((section) => section.groupId === group.id)
  })).filter((entry) => entry.sections.length > 0);
}
function createSdkworkSettingsCatalog(input) {
  var _a;
  const sectionById = createIds(input.sections, "section");
  const settingById = createIds(input.settings, "setting");
  const groupInputById = /* @__PURE__ */ new Map();
  for (const group of (_a = input.groups) != null ? _a : []) {
    if (groupInputById.has(group.id)) {
      throw new Error(`Duplicate settings group id: ${group.id}`);
    }
    groupInputById.set(group.id, group);
  }
  for (const section of input.sections) {
    if (!groupInputById.has(section.groupId)) {
      groupInputById.set(section.groupId, {
        id: section.groupId,
        titleKey: `settings.group.${section.groupId}.title`
      });
    }
  }
  for (const setting of input.settings) {
    assertSettingDefinition(setting, sectionById);
  }
  const groups = sortGroups([...groupInputById.values()]);
  const sections = sortSections(input.sections);
  const settings = sortSettings(input.settings);
  const sectionSettings = {};
  for (const section of sections) {
    sectionSettings[section.id] = settings.filter(
      (setting) => setting.sectionId === section.id
    );
  }
  const defaults = {};
  for (const setting of settings) {
    defaults[setting.id] = setting.defaultValue;
  }
  return {
    defaults: Object.freeze(defaults),
    groups: Object.freeze(groups),
    navigation: Object.freeze(createNavigation(groups, sections)),
    sectionById: Object.freeze(sectionById),
    sectionSettings: Object.freeze(sectionSettings),
    sections: Object.freeze(sections),
    settingById: Object.freeze(settingById),
    settings: Object.freeze(settings)
  };
}
function matchesPermission(permission, permissions) {
  return !permission || permissions.includes(permission) || permissions.includes("*");
}
function isVisible(definition, context) {
  const visible = typeof definition.visible === "function" ? definition.visible(context) : definition.visible !== false;
  const enabled = typeof definition.enabled === "function" ? definition.enabled(context) : definition.enabled !== false;
  return visible && enabled;
}
function resolveVisibleSdkworkSettings(catalog, context) {
  var _a;
  const sections = catalog.sections.filter(
    (section) => matchesPermission(section.permission, context.permissions) && isVisible(section, context)
  );
  const settingsBySection = {};
  for (const section of sections) {
    settingsBySection[section.id] = ((_a = catalog.sectionSettings[section.id]) != null ? _a : []).filter(
      (setting) => matchesPermission(setting.permission, context.permissions) && isVisible(setting, context)
    );
  }
  return {
    sections: Object.freeze(sections),
    settingsBySection: Object.freeze(settingsBySection)
  };
}
function resolveDefaultSdkworkSettingsSectionId(catalog) {
  var _a, _b;
  return (_b = (_a = catalog.navigation[0]) == null ? void 0 : _a.sections[0]) == null ? void 0 : _b.id;
}

// ../../../sdkwork-appbase/packages/common/system/sdkwork-settings-core/src/defaults.ts
var DEFAULT_GROUPS = [
  { id: "account", titleKey: "settings.group.account.title", order: 10 },
  { id: "general", titleKey: "settings.group.general.title", order: 20 },
  { id: "privacy", titleKey: "settings.group.privacy.title", order: 30 },
  { id: "notifications", titleKey: "settings.group.notifications.title", order: 40 },
  { id: "storage", titleKey: "settings.group.storage.title", order: 50 },
  { id: "advanced", titleKey: "settings.group.advanced.title", order: 60 },
  { id: "about", titleKey: "settings.group.about.title", order: 70 }
];
var DEFAULT_SECTIONS = [
  {
    id: "profile",
    groupId: "account",
    icon: "user",
    order: 10,
    titleKey: "settings.section.profile.title",
    descriptionKey: "settings.section.profile.description"
  },
  {
    id: "account-security",
    groupId: "account",
    icon: "shield",
    order: 20,
    titleKey: "settings.section.account-security.title",
    descriptionKey: "settings.section.account-security.description"
  },
  {
    id: "appearance",
    groupId: "general",
    icon: "palette",
    order: 10,
    saveMode: "auto",
    titleKey: "settings.section.appearance.title",
    descriptionKey: "settings.section.appearance.description"
  },
  {
    id: "language",
    groupId: "general",
    icon: "languages",
    order: 20,
    saveMode: "auto",
    titleKey: "settings.section.language.title",
    descriptionKey: "settings.section.language.description"
  },
  {
    id: "voice",
    groupId: "general",
    icon: "volume",
    order: 30,
    saveMode: "auto",
    titleKey: "settings.section.voice.title",
    descriptionKey: "settings.section.voice.description"
  },
  {
    id: "notifications",
    groupId: "notifications",
    icon: "bell",
    order: 10,
    saveMode: "auto",
    titleKey: "settings.section.notifications.title",
    descriptionKey: "settings.section.notifications.description"
  },
  {
    id: "privacy",
    groupId: "privacy",
    icon: "lock",
    order: 10,
    saveMode: "manual",
    titleKey: "settings.section.privacy.title",
    descriptionKey: "settings.section.privacy.description"
  },
  {
    id: "storage",
    groupId: "storage",
    icon: "database",
    order: 10,
    titleKey: "settings.section.storage.title",
    descriptionKey: "settings.section.storage.description"
  },
  {
    id: "advanced",
    groupId: "advanced",
    icon: "sliders",
    order: 10,
    saveMode: "manual",
    titleKey: "settings.section.advanced.title",
    descriptionKey: "settings.section.advanced.description"
  },
  {
    id: "about",
    groupId: "about",
    icon: "info",
    order: 10,
    titleKey: "settings.section.about.title",
    descriptionKey: "settings.section.about.description"
  }
];
var DEFAULT_SETTINGS = [
  {
    id: "account.profile",
    sectionId: "profile",
    kind: "action",
    scope: "user",
    defaultValue: null,
    order: 10,
    titleKey: "settings.account.profile.title",
    descriptionKey: "settings.account.profile.description",
    metadata: { action: "open-profile" }
  },
  {
    id: "account.security",
    sectionId: "profile",
    kind: "action",
    scope: "user",
    defaultValue: null,
    order: 20,
    titleKey: "settings.account.security.title",
    descriptionKey: "settings.account.security.description",
    metadata: { action: "open-account-security" }
  },
  {
    id: "appearance.theme",
    sectionId: "appearance",
    kind: "select",
    scope: "user",
    defaultValue: "system",
    order: 10,
    saveMode: "auto",
    titleKey: "settings.appearance.theme.title",
    descriptionKey: "settings.appearance.theme.description",
    options: [
      { value: "system", labelKey: "settings.appearance.theme.option.system" },
      { value: "light", labelKey: "settings.appearance.theme.option.light" },
      { value: "dark", labelKey: "settings.appearance.theme.option.dark" }
    ]
  },
  {
    id: "appearance.font-size",
    sectionId: "appearance",
    kind: "radio",
    scope: "user",
    defaultValue: "medium",
    order: 20,
    saveMode: "auto",
    titleKey: "settings.appearance.font-size.title",
    descriptionKey: "settings.appearance.font-size.description",
    options: [
      { value: "small", labelKey: "settings.appearance.font-size.option.small" },
      { value: "medium", labelKey: "settings.appearance.font-size.option.medium" },
      { value: "large", labelKey: "settings.appearance.font-size.option.large" }
    ]
  },
  {
    id: "appearance.density",
    sectionId: "appearance",
    kind: "radio",
    scope: "user",
    defaultValue: "comfortable",
    order: 30,
    saveMode: "auto",
    titleKey: "settings.appearance.density.title",
    descriptionKey: "settings.appearance.density.description",
    options: [
      {
        value: "comfortable",
        labelKey: "settings.appearance.density.option.comfortable"
      },
      {
        value: "compact",
        labelKey: "settings.appearance.density.option.compact"
      }
    ]
  },
  {
    id: "appearance.reduce-motion",
    sectionId: "appearance",
    kind: "toggle",
    scope: "user",
    defaultValue: false,
    order: 40,
    saveMode: "auto",
    titleKey: "settings.appearance.reduce-motion.title",
    descriptionKey: "settings.appearance.reduce-motion.description"
  },
  {
    id: "language.locale",
    sectionId: "language",
    kind: "select",
    scope: "user",
    defaultValue: "zh-CN",
    order: 10,
    saveMode: "auto",
    titleKey: "settings.language.locale.title",
    descriptionKey: "settings.language.locale.description",
    options: [
      { value: "zh-CN", label: "\u7B80\u4F53\u4E2D\u6587" },
      { value: "en-US", label: "English (US)" },
      { value: "ja-JP", label: "\u65E5\u672C\u8A9E" },
      { value: "ko-KR", label: "\uD55C\uAD6D\uC5B4" }
    ]
  },
  {
    id: "language.timezone",
    sectionId: "language",
    kind: "select",
    scope: "user",
    defaultValue: "Asia/Shanghai",
    order: 20,
    saveMode: "auto",
    titleKey: "settings.language.timezone.title",
    descriptionKey: "settings.language.timezone.description",
    options: [
      { value: "Asia/Shanghai", label: "UTC+08:00 \xB7 \u5317\u4EAC / \u4E0A\u6D77" },
      { value: "Asia/Tokyo", label: "UTC+09:00 \xB7 \u4E1C\u4EAC" },
      { value: "UTC", label: "UTC \xB7 \u534F\u8C03\u4E16\u754C\u65F6" },
      { value: "America/Los_Angeles", label: "UTC-08:00 \xB7 \u6D1B\u6749\u77F6" }
    ]
  },
  {
    id: "language.date-format",
    sectionId: "language",
    kind: "radio",
    scope: "user",
    defaultValue: "YYYY-MM-DD",
    order: 30,
    saveMode: "auto",
    titleKey: "settings.language.date-format.title",
    descriptionKey: "settings.language.date-format.description",
    options: [
      { value: "YYYY-MM-DD", label: "2026-07-01" },
      { value: "DD/MM/YYYY", label: "01/07/2026" },
      { value: "MM/DD/YYYY", label: "07/01/2026" }
    ]
  },
  {
    id: "voice.enabled",
    sectionId: "voice",
    kind: "toggle",
    scope: "user",
    defaultValue: true,
    order: 10,
    saveMode: "auto",
    titleKey: "settings.voice.enabled.title",
    descriptionKey: "settings.voice.enabled.description"
  },
  {
    id: "voice.speaker",
    sectionId: "voice",
    kind: "select",
    scope: "user",
    defaultValue: "system",
    order: 20,
    saveMode: "auto",
    titleKey: "settings.voice.speaker.title",
    descriptionKey: "settings.voice.speaker.description",
    options: [
      { value: "system", labelKey: "settings.voice.speaker.option.system" },
      { value: "female", labelKey: "settings.voice.speaker.option.female" },
      { value: "male", labelKey: "settings.voice.speaker.option.male" }
    ]
  },
  {
    id: "voice.rate",
    sectionId: "voice",
    kind: "slider",
    scope: "user",
    defaultValue: 1,
    order: 30,
    saveMode: "auto",
    titleKey: "settings.voice.rate.title",
    descriptionKey: "settings.voice.rate.description",
    constraints: { min: 0.5, max: 2, step: 0.1 },
    ui: { unit: "x" }
  },
  {
    id: "notifications.enabled",
    sectionId: "notifications",
    kind: "toggle",
    scope: "user",
    defaultValue: true,
    order: 10,
    saveMode: "auto",
    titleKey: "settings.notifications.enabled.title",
    descriptionKey: "settings.notifications.enabled.description"
  },
  {
    id: "notifications.sound",
    sectionId: "notifications",
    kind: "toggle",
    scope: "user",
    defaultValue: true,
    order: 20,
    saveMode: "auto",
    titleKey: "settings.notifications.sound.title",
    descriptionKey: "settings.notifications.sound.description"
  },
  {
    id: "notifications.preview",
    sectionId: "notifications",
    kind: "toggle",
    scope: "user",
    defaultValue: true,
    order: 30,
    saveMode: "auto",
    titleKey: "settings.notifications.preview.title",
    descriptionKey: "settings.notifications.preview.description"
  },
  {
    id: "notifications.email",
    sectionId: "notifications",
    kind: "toggle",
    scope: "user",
    defaultValue: false,
    order: 40,
    saveMode: "auto",
    titleKey: "settings.notifications.email.title",
    descriptionKey: "settings.notifications.email.description"
  },
  {
    id: "privacy.analytics",
    sectionId: "privacy",
    kind: "toggle",
    scope: "user",
    defaultValue: false,
    order: 10,
    saveMode: "manual",
    titleKey: "settings.privacy.analytics.title",
    descriptionKey: "settings.privacy.analytics.description"
  },
  {
    id: "privacy.crash-reports",
    sectionId: "privacy",
    kind: "toggle",
    scope: "user",
    defaultValue: true,
    order: 20,
    saveMode: "manual",
    titleKey: "settings.privacy.crash-reports.title",
    descriptionKey: "settings.privacy.crash-reports.description"
  },
  {
    id: "privacy.personalization",
    sectionId: "privacy",
    kind: "toggle",
    scope: "user",
    defaultValue: false,
    order: 30,
    saveMode: "manual",
    titleKey: "settings.privacy.personalization.title",
    descriptionKey: "settings.privacy.personalization.description"
  },
  {
    id: "storage.clear-cache",
    sectionId: "storage",
    kind: "action",
    scope: "user",
    defaultValue: null,
    order: 10,
    titleKey: "settings.storage.clear-cache.title",
    descriptionKey: "settings.storage.clear-cache.description",
    metadata: { action: "clear-cache" }
  },
  {
    id: "storage.offline-downloads",
    sectionId: "storage",
    kind: "action",
    scope: "user",
    defaultValue: null,
    order: 20,
    titleKey: "settings.storage.offline-downloads.title",
    descriptionKey: "settings.storage.offline-downloads.description",
    metadata: { action: "open-offline-downloads" }
  },
  {
    id: "advanced.developer-mode",
    sectionId: "advanced",
    kind: "toggle",
    scope: "user",
    defaultValue: false,
    order: 10,
    saveMode: "manual",
    requiresRestart: true,
    titleKey: "settings.advanced.developer-mode.title",
    descriptionKey: "settings.advanced.developer-mode.description"
  },
  {
    id: "advanced.experimental",
    sectionId: "advanced",
    kind: "toggle",
    scope: "user",
    defaultValue: false,
    order: 20,
    saveMode: "manual",
    requiresRestart: true,
    titleKey: "settings.advanced.experimental.title",
    descriptionKey: "settings.advanced.experimental.description"
  },
  {
    id: "advanced.reset",
    sectionId: "advanced",
    kind: "action",
    scope: "user",
    defaultValue: null,
    order: 30,
    titleKey: "settings.advanced.reset.title",
    descriptionKey: "settings.advanced.reset.description",
    ui: { destructive: true },
    metadata: { action: "reset-settings" }
  },
  {
    id: "about.version",
    sectionId: "about",
    kind: "info",
    scope: "system",
    defaultValue: "",
    order: 10,
    titleKey: "settings.about.version.title",
    descriptionKey: "settings.about.version.description"
  },
  {
    id: "about.terms",
    sectionId: "about",
    kind: "action",
    scope: "system",
    defaultValue: null,
    order: 20,
    titleKey: "settings.about.terms.title",
    descriptionKey: "settings.about.terms.description",
    metadata: { action: "open-terms" }
  },
  {
    id: "about.privacy-policy",
    sectionId: "about",
    kind: "action",
    scope: "system",
    defaultValue: null,
    order: 30,
    titleKey: "settings.about.privacy-policy.title",
    descriptionKey: "settings.about.privacy-policy.description",
    metadata: { action: "open-privacy-policy" }
  }
];
function createDefaultSdkworkSettingsCatalog(input = {}) {
  var _a, _b, _c;
  return createSdkworkSettingsCatalog({
    groups: [...DEFAULT_GROUPS, ...(_a = input.extraGroups) != null ? _a : []],
    sections: [...DEFAULT_SECTIONS, ...(_b = input.extraSections) != null ? _b : []],
    settings: [...DEFAULT_SETTINGS, ...(_c = input.extraSettings) != null ? _c : []]
  });
}
var SDKWORK_SETTINGS_DEFAULT_GROUP_IDS = Object.freeze(
  DEFAULT_GROUPS.map((group) => group.id)
);

// ../../../sdkwork-appbase/packages/common/system/sdkwork-settings-core/src/i18n/en-US/system/settings/center.ts
var enUsSettingsMessages = {
  "settings.group.about.title": "About",
  "settings.group.account.title": "Account",
  "settings.group.advanced.title": "Advanced",
  "settings.group.ai.title": "Intelligence",
  "settings.group.appearance.title": "Appearance",
  "settings.group.general.title": "General",
  "settings.group.language.title": "Language & region",
  "settings.group.notifications.title": "Notifications",
  "settings.group.privacy.title": "Privacy",
  "settings.group.security.title": "Security",
  "settings.group.storage.title": "Storage",
  "settings.group.system.title": "System",
  "settings.group.usage.title": "Usage",
  "settings.group.workspace.title": "Workspace",
  "settings.section.profile.title": "Profile",
  "settings.section.profile.description": "Your public identity across SDKWork applications.",
  "settings.section.account-security.title": "Account security",
  "settings.section.account-security.description": "Sign-in methods, sessions, and recovery options.",
  "settings.section.appearance.title": "Appearance",
  "settings.section.appearance.description": "Theme, type scale, and display density.",
  "settings.section.language.title": "Language & region",
  "settings.section.language.description": "Interface language, time zone, and date formatting.",
  "settings.section.voice.title": "Voice",
  "settings.section.voice.description": "Voice playback, speaker, and rate.",
  "settings.section.notifications.title": "Notifications",
  "settings.section.notifications.description": "Choose which updates reach you and how.",
  "settings.section.privacy.title": "Privacy",
  "settings.section.privacy.description": "Control diagnostic data and personalization.",
  "settings.section.storage.title": "Storage",
  "settings.section.storage.description": "Manage cached data and local downloads.",
  "settings.section.about.title": "About",
  "settings.section.about.description": "Version information, terms, and policies.",
  "settings.section.advanced.title": "Advanced",
  "settings.section.advanced.description": "Developer tools and experimental capabilities.",
  "settings.section.workspace.title": "Workspace",
  "settings.section.workspace.description": "Defaults for this workspace.",
  "settings.section.ai.title": "Intelligence",
  "settings.section.ai.description": "Assistant behavior and model preferences.",
  "settings.account.profile.title": "Profile",
  "settings.account.profile.description": "Name, avatar, and public profile.",
  "settings.account.security.title": "Security",
  "settings.account.security.description": "Password, passkeys, and active sessions.",
  "settings.appearance.theme.title": "Theme",
  "settings.appearance.theme.description": "Follow the system or choose a fixed appearance.",
  "settings.appearance.theme.option.system": "System",
  "settings.appearance.theme.option.light": "Light",
  "settings.appearance.theme.option.dark": "Dark",
  "settings.appearance.font-size.title": "Text size",
  "settings.appearance.font-size.description": "Adjust the base size of interface text.",
  "settings.appearance.font-size.option.small": "Small",
  "settings.appearance.font-size.option.medium": "Medium",
  "settings.appearance.font-size.option.large": "Large",
  "settings.appearance.density.title": "Display density",
  "settings.appearance.density.description": "Compact mode fits more content on one screen.",
  "settings.appearance.density.option.comfortable": "Comfortable",
  "settings.appearance.density.option.compact": "Compact",
  "settings.appearance.reduce-motion.title": "Reduce motion",
  "settings.appearance.reduce-motion.description": "Minimize non-essential animation.",
  "settings.language.locale.title": "Interface language",
  "settings.language.locale.description": "Language used by menus, labels, and messages.",
  "settings.language.timezone.title": "Time zone",
  "settings.language.timezone.description": "Affects timestamps, schedules, and reminders.",
  "settings.language.date-format.title": "Date format",
  "settings.language.date-format.description": "How calendar dates are displayed.",
  "settings.voice.enabled.title": "Voice playback",
  "settings.voice.enabled.description": "Enable assistant voice playback and voice interaction.",
  "settings.voice.speaker.title": "Voice",
  "settings.voice.speaker.description": "Choose the voice used for playback.",
  "settings.voice.speaker.option.system": "System default",
  "settings.voice.speaker.option.female": "Female",
  "settings.voice.speaker.option.male": "Male",
  "settings.voice.rate.title": "Speaking rate",
  "settings.voice.rate.description": "Adjust the speed of voice playback.",
  "settings.notifications.enabled.title": "Notifications",
  "settings.notifications.enabled.description": "Receive account and product updates.",
  "settings.notifications.sound.title": "Sound",
  "settings.notifications.sound.description": "Play a sound for new notifications.",
  "settings.notifications.preview.title": "Message preview",
  "settings.notifications.preview.description": "Show content in notification previews.",
  "settings.notifications.email.title": "Email notifications",
  "settings.notifications.email.description": "Receive important updates by email.",
  "settings.privacy.analytics.title": "Usage analytics",
  "settings.privacy.analytics.description": "Share anonymous usage data to improve the product.",
  "settings.privacy.crash-reports.title": "Crash reports",
  "settings.privacy.crash-reports.description": "Send diagnostic information after a crash.",
  "settings.privacy.personalization.title": "Personalized recommendations",
  "settings.privacy.personalization.description": "Use activity to tailor suggestions.",
  "settings.storage.clear-cache.title": "Clear cache",
  "settings.storage.clear-cache.description": "Remove temporary files. Your data stays intact.",
  "settings.storage.offline-downloads.title": "Offline downloads",
  "settings.storage.offline-downloads.description": "Review files stored on this device.",
  "settings.about.version.title": "Version",
  "settings.about.version.description": "Installed application version.",
  "settings.about.terms.title": "Terms of service",
  "settings.about.terms.description": "Read the terms that govern this application.",
  "settings.about.privacy-policy.title": "Privacy policy",
  "settings.about.privacy-policy.description": "Learn how data is collected and used.",
  "settings.advanced.developer-mode.title": "Developer mode",
  "settings.advanced.developer-mode.description": "Enable diagnostics and developer tooling.",
  "settings.advanced.experimental.title": "Experimental features",
  "settings.advanced.experimental.description": "Try features that are still in progress.",
  "settings.advanced.reset.title": "Reset all settings",
  "settings.advanced.reset.description": "Restore every preference to its default value.",
  "settings.ui.search.placeholder": "Search settings",
  "settings.ui.title": "Settings",
  "settings.ui.description": "Manage your account, preferences, and application behavior.",
  "settings.ui.search.empty-title": "No settings match your search",
  "settings.ui.search.empty-description": "Try a different keyword or browse the navigation.",
  "settings.ui.loading": "Loading settings\u2026",
  "settings.ui.error-title": "Settings could not be loaded",
  "settings.ui.error-description": "Check your connection and try again.",
  "settings.ui.retry": "Retry",
  "settings.ui.save": "Save",
  "settings.ui.saving": "Saving\u2026",
  "settings.ui.saved": "Saved",
  "settings.ui.discard": "Discard",
  "settings.ui.dirty-title": "Unsaved changes",
  "settings.ui.dirty-description": "Review your changes before leaving this page.",
  "settings.ui.restart-required": "Restart required",
  "settings.ui.restart-description": "Some changes take effect after the application restarts.",
  "settings.ui.restart": "Restart now",
  "settings.ui.back": "Back",
  "settings.ui.close": "Close",
  "settings.ui.reset": "Reset",
  "settings.ui.navigation": "Settings navigation",
  "settings.ui.section-navigation": "Sections in this group",
  "settings.ui.read-only": "Read only",
  "settings.ui.unavailable": "Unavailable",
  "settings.ui.unsaved-badge": "Unsaved",
  "settings.ui.danger-zone": "Danger zone",
  "settings.ui.on": "On",
  "settings.ui.off": "Off",
  "settings.ui.not-set": "Not set",
  "settings.validation.required": "This field is required.",
  "settings.validation.min": "The value is below the allowed minimum.",
  "settings.validation.max": "The value is above the allowed maximum.",
  "settings.validation.min-length": "The value is too short.",
  "settings.validation.max-length": "The value is too long.",
  "settings.validation.pattern": "The value does not match the required format.",
  "settings.validation.pattern-invalid": "The validation pattern is invalid.",
  "settings.validation.option": "Choose one of the available options.",
  "settings.validation.boolean": "This setting must be on or off.",
  "settings.validation.number": "Enter a number.",
  "settings.validation.text": "Enter text.",
  "settings.validation.step": "The value must use the allowed increment."
};

// ../../../sdkwork-appbase/packages/common/system/sdkwork-settings-core/src/i18n/zh-CN/system/settings/center.ts
var zhCnSettingsMessages = {
  "settings.group.about.title": "\u5173\u4E8E",
  "settings.group.account.title": "\u8D26\u6237",
  "settings.group.advanced.title": "\u9AD8\u7EA7",
  "settings.group.ai.title": "\u667A\u80FD",
  "settings.group.appearance.title": "\u5916\u89C2",
  "settings.group.general.title": "\u901A\u7528",
  "settings.group.language.title": "\u8BED\u8A00\u4E0E\u5730\u533A",
  "settings.group.notifications.title": "\u901A\u77E5",
  "settings.group.privacy.title": "\u9690\u79C1",
  "settings.group.security.title": "\u5B89\u5168",
  "settings.group.storage.title": "\u5B58\u50A8",
  "settings.group.system.title": "\u7CFB\u7EDF",
  "settings.group.usage.title": "\u7528\u91CF",
  "settings.group.workspace.title": "\u5DE5\u4F5C\u533A",
  "settings.section.profile.title": "\u4E2A\u4EBA\u8D44\u6599",
  "settings.section.profile.description": "\u5728 SDKWork \u5E94\u7528\u4E2D\u5C55\u793A\u7684\u516C\u5F00\u8EAB\u4EFD\u3002",
  "settings.section.account-security.title": "\u8D26\u6237\u5B89\u5168",
  "settings.section.account-security.description": "\u767B\u5F55\u65B9\u5F0F\u3001\u4F1A\u8BDD\u4E0E\u627E\u56DE\u9009\u9879\u3002",
  "settings.section.appearance.title": "\u5916\u89C2",
  "settings.section.appearance.description": "\u4E3B\u9898\u3001\u5B57\u4F53\u5927\u5C0F\u4E0E\u663E\u793A\u5BC6\u5EA6\u3002",
  "settings.section.language.title": "\u8BED\u8A00\u4E0E\u5730\u533A",
  "settings.section.language.description": "\u754C\u9762\u8BED\u8A00\u3001\u65F6\u533A\u4E0E\u65E5\u671F\u683C\u5F0F\u3002",
  "settings.section.voice.title": "\u8BED\u97F3",
  "settings.section.voice.description": "\u8BED\u97F3\u64AD\u62A5\u3001\u97F3\u8272\u4E0E\u8BED\u901F\u3002",
  "settings.section.notifications.title": "\u901A\u77E5",
  "settings.section.notifications.description": "\u9009\u62E9\u63A5\u6536\u54EA\u4E9B\u52A8\u6001\u4EE5\u53CA\u63A5\u6536\u65B9\u5F0F\u3002",
  "settings.section.privacy.title": "\u9690\u79C1",
  "settings.section.privacy.description": "\u63A7\u5236\u8BCA\u65AD\u6570\u636E\u4E0E\u4E2A\u6027\u5316\u3002",
  "settings.section.storage.title": "\u5B58\u50A8",
  "settings.section.storage.description": "\u7BA1\u7406\u7F13\u5B58\u6570\u636E\u4E0E\u672C\u5730\u4E0B\u8F7D\u3002",
  "settings.section.about.title": "\u5173\u4E8E",
  "settings.section.about.description": "\u7248\u672C\u4FE1\u606F\u3001\u6761\u6B3E\u4E0E\u653F\u7B56\u3002",
  "settings.section.advanced.title": "\u9AD8\u7EA7",
  "settings.section.advanced.description": "\u5F00\u53D1\u8005\u5DE5\u5177\u4E0E\u5B9E\u9A8C\u529F\u80FD\u3002",
  "settings.section.workspace.title": "\u5DE5\u4F5C\u533A",
  "settings.section.workspace.description": "\u5F53\u524D\u5DE5\u4F5C\u533A\u7684\u9ED8\u8BA4\u8BBE\u7F6E\u3002",
  "settings.section.ai.title": "\u667A\u80FD",
  "settings.section.ai.description": "\u52A9\u624B\u884C\u4E3A\u4E0E\u6A21\u578B\u504F\u597D\u3002",
  "settings.account.profile.title": "\u4E2A\u4EBA\u8D44\u6599",
  "settings.account.profile.description": "\u59D3\u540D\u3001\u5934\u50CF\u4E0E\u516C\u5F00\u8D44\u6599\u3002",
  "settings.account.security.title": "\u5B89\u5168",
  "settings.account.security.description": "\u5BC6\u7801\u3001\u901A\u884C\u5BC6\u94A5\u4E0E\u767B\u5F55\u4F1A\u8BDD\u3002",
  "settings.appearance.theme.title": "\u4E3B\u9898",
  "settings.appearance.theme.description": "\u8DDF\u968F\u7CFB\u7EDF\u6216\u56FA\u5B9A\u4F7F\u7528\u67D0\u79CD\u5916\u89C2\u3002",
  "settings.appearance.theme.option.system": "\u8DDF\u968F\u7CFB\u7EDF",
  "settings.appearance.theme.option.light": "\u6D45\u8272",
  "settings.appearance.theme.option.dark": "\u6DF1\u8272",
  "settings.appearance.font-size.title": "\u5B57\u4F53\u5927\u5C0F",
  "settings.appearance.font-size.description": "\u8C03\u6574\u754C\u9762\u6587\u5B57\u7684\u57FA\u7840\u5927\u5C0F\u3002",
  "settings.appearance.font-size.option.small": "\u5C0F",
  "settings.appearance.font-size.option.medium": "\u4E2D",
  "settings.appearance.font-size.option.large": "\u5927",
  "settings.appearance.density.title": "\u663E\u793A\u5BC6\u5EA6",
  "settings.appearance.density.description": "\u7D27\u51D1\u6A21\u5F0F\u53EF\u5728\u4E00\u5C4F\u5185\u5C55\u793A\u66F4\u591A\u5185\u5BB9\u3002",
  "settings.appearance.density.option.comfortable": "\u8212\u9002",
  "settings.appearance.density.option.compact": "\u7D27\u51D1",
  "settings.appearance.reduce-motion.title": "\u51CF\u5C11\u52A8\u6548",
  "settings.appearance.reduce-motion.description": "\u5C3D\u91CF\u51CF\u5C11\u975E\u5FC5\u8981\u52A8\u753B\u3002",
  "settings.language.locale.title": "\u754C\u9762\u8BED\u8A00",
  "settings.language.locale.description": "\u83DC\u5355\u3001\u6807\u7B7E\u4E0E\u63D0\u793A\u4F7F\u7528\u7684\u8BED\u8A00\u3002",
  "settings.language.timezone.title": "\u65F6\u533A",
  "settings.language.timezone.description": "\u5F71\u54CD\u65F6\u95F4\u6233\u3001\u65E5\u7A0B\u4E0E\u63D0\u9192\u7684\u663E\u793A\u3002",
  "settings.language.date-format.title": "\u65E5\u671F\u683C\u5F0F",
  "settings.language.date-format.description": "\u65E5\u5386\u65E5\u671F\u7684\u663E\u793A\u65B9\u5F0F\u3002",
  "settings.voice.enabled.title": "\u8BED\u97F3\u64AD\u62A5",
  "settings.voice.enabled.description": "\u5F00\u542F\u52A9\u624B\u8BED\u97F3\u64AD\u62A5\u4E0E\u8BED\u97F3\u4EA4\u4E92\u3002",
  "settings.voice.speaker.title": "\u8BED\u97F3\u97F3\u8272",
  "settings.voice.speaker.description": "\u9009\u62E9\u64AD\u62A5\u65F6\u4F7F\u7528\u7684\u58F0\u97F3\u3002",
  "settings.voice.speaker.option.system": "\u7CFB\u7EDF\u9ED8\u8BA4",
  "settings.voice.speaker.option.female": "\u5973\u58F0",
  "settings.voice.speaker.option.male": "\u7537\u58F0",
  "settings.voice.rate.title": "\u8BED\u901F",
  "settings.voice.rate.description": "\u8C03\u6574\u8BED\u97F3\u64AD\u62A5\u901F\u5EA6\u3002",
  "settings.notifications.enabled.title": "\u901A\u77E5",
  "settings.notifications.enabled.description": "\u63A5\u6536\u8D26\u6237\u4E0E\u4EA7\u54C1\u52A8\u6001\u3002",
  "settings.notifications.sound.title": "\u58F0\u97F3",
  "settings.notifications.sound.description": "\u65B0\u901A\u77E5\u5230\u8FBE\u65F6\u64AD\u653E\u63D0\u793A\u97F3\u3002",
  "settings.notifications.preview.title": "\u6D88\u606F\u9884\u89C8",
  "settings.notifications.preview.description": "\u5728\u901A\u77E5\u9884\u89C8\u4E2D\u663E\u793A\u5185\u5BB9\u3002",
  "settings.notifications.email.title": "\u90AE\u4EF6\u901A\u77E5",
  "settings.notifications.email.description": "\u901A\u8FC7\u90AE\u4EF6\u63A5\u6536\u91CD\u8981\u66F4\u65B0\u3002",
  "settings.privacy.analytics.title": "\u4F7F\u7528\u5206\u6790",
  "settings.privacy.analytics.description": "\u5171\u4EAB\u533F\u540D\u4F7F\u7528\u6570\u636E\u4EE5\u6539\u8FDB\u4EA7\u54C1\u3002",
  "settings.privacy.crash-reports.title": "\u5D29\u6E83\u62A5\u544A",
  "settings.privacy.crash-reports.description": "\u5D29\u6E83\u540E\u53D1\u9001\u8BCA\u65AD\u4FE1\u606F\u3002",
  "settings.privacy.personalization.title": "\u4E2A\u6027\u5316\u63A8\u8350",
  "settings.privacy.personalization.description": "\u6839\u636E\u6D3B\u52A8\u8BB0\u5F55\u8C03\u6574\u63A8\u8350\u5185\u5BB9\u3002",
  "settings.storage.clear-cache.title": "\u6E05\u9664\u7F13\u5B58",
  "settings.storage.clear-cache.description": "\u5220\u9664\u4E34\u65F6\u6587\u4EF6\uFF0C\u4E0D\u4F1A\u5F71\u54CD\u4F60\u7684\u6570\u636E\u3002",
  "settings.storage.offline-downloads.title": "\u79BB\u7EBF\u4E0B\u8F7D",
  "settings.storage.offline-downloads.description": "\u67E5\u770B\u4FDD\u5B58\u5728\u672C\u8BBE\u5907\u4E0A\u7684\u6587\u4EF6\u3002",
  "settings.about.version.title": "\u7248\u672C",
  "settings.about.version.description": "\u5F53\u524D\u5B89\u88C5\u7684\u5E94\u7528\u7248\u672C\u3002",
  "settings.about.terms.title": "\u670D\u52A1\u6761\u6B3E",
  "settings.about.terms.description": "\u9605\u8BFB\u9002\u7528\u4E8E\u672C\u5E94\u7528\u7684\u6761\u6B3E\u3002",
  "settings.about.privacy-policy.title": "\u9690\u79C1\u653F\u7B56",
  "settings.about.privacy-policy.description": "\u4E86\u89E3\u6570\u636E\u5982\u4F55\u88AB\u6536\u96C6\u4E0E\u4F7F\u7528\u3002",
  "settings.advanced.developer-mode.title": "\u5F00\u53D1\u8005\u6A21\u5F0F",
  "settings.advanced.developer-mode.description": "\u542F\u7528\u8BCA\u65AD\u4E0E\u5F00\u53D1\u8005\u5DE5\u5177\u3002",
  "settings.advanced.experimental.title": "\u5B9E\u9A8C\u529F\u80FD",
  "settings.advanced.experimental.description": "\u4F53\u9A8C\u4ECD\u5728\u5F00\u53D1\u4E2D\u7684\u529F\u80FD\u3002",
  "settings.advanced.reset.title": "\u91CD\u7F6E\u5168\u90E8\u8BBE\u7F6E",
  "settings.advanced.reset.description": "\u5C06\u6240\u6709\u504F\u597D\u6062\u590D\u4E3A\u9ED8\u8BA4\u503C\u3002",
  "settings.ui.search.placeholder": "\u641C\u7D22\u8BBE\u7F6E",
  "settings.ui.title": "\u8BBE\u7F6E",
  "settings.ui.description": "\u7BA1\u7406\u8D26\u6237\u3001\u504F\u597D\u4E0E\u5E94\u7528\u884C\u4E3A\u3002",
  "settings.ui.search.empty-title": "\u6CA1\u6709\u5339\u914D\u7684\u8BBE\u7F6E",
  "settings.ui.search.empty-description": "\u5C1D\u8BD5\u5176\u4ED6\u5173\u952E\u8BCD\uFF0C\u6216\u76F4\u63A5\u6D4F\u89C8\u5BFC\u822A\u3002",
  "settings.ui.loading": "\u6B63\u5728\u52A0\u8F7D\u8BBE\u7F6E\u2026",
  "settings.ui.error-title": "\u65E0\u6CD5\u52A0\u8F7D\u8BBE\u7F6E",
  "settings.ui.error-description": "\u8BF7\u68C0\u67E5\u7F51\u7EDC\u8FDE\u63A5\u540E\u91CD\u8BD5\u3002",
  "settings.ui.retry": "\u91CD\u8BD5",
  "settings.ui.save": "\u4FDD\u5B58",
  "settings.ui.saving": "\u6B63\u5728\u4FDD\u5B58\u2026",
  "settings.ui.saved": "\u5DF2\u4FDD\u5B58",
  "settings.ui.discard": "\u653E\u5F03",
  "settings.ui.dirty-title": "\u6709\u672A\u4FDD\u5B58\u7684\u66F4\u6539",
  "settings.ui.dirty-description": "\u79BB\u5F00\u6B64\u9875\u9762\u524D\u8BF7\u786E\u8BA4\u4F60\u7684\u66F4\u6539\u3002",
  "settings.ui.restart-required": "\u9700\u8981\u91CD\u542F",
  "settings.ui.restart-description": "\u90E8\u5206\u66F4\u6539\u5C06\u5728\u5E94\u7528\u91CD\u542F\u540E\u751F\u6548\u3002",
  "settings.ui.restart": "\u7ACB\u5373\u91CD\u542F",
  "settings.ui.back": "\u8FD4\u56DE",
  "settings.ui.close": "\u5173\u95ED",
  "settings.ui.reset": "\u91CD\u7F6E",
  "settings.ui.navigation": "\u8BBE\u7F6E\u5BFC\u822A",
  "settings.ui.section-navigation": "\u6B64\u5206\u7EC4\u4E0B\u7684\u7AE0\u8282",
  "settings.ui.read-only": "\u53EA\u8BFB",
  "settings.ui.unavailable": "\u4E0D\u53EF\u7528",
  "settings.ui.unsaved-badge": "\u672A\u4FDD\u5B58",
  "settings.ui.danger-zone": "\u5371\u9669\u533A\u57DF",
  "settings.ui.on": "\u5F00",
  "settings.ui.off": "\u5173",
  "settings.ui.not-set": "\u672A\u8BBE\u7F6E",
  "settings.validation.required": "\u6B64\u9879\u4E3A\u5FC5\u586B\u9879\u3002",
  "settings.validation.min": "\u8BE5\u503C\u4F4E\u4E8E\u5141\u8BB8\u7684\u6700\u5C0F\u503C\u3002",
  "settings.validation.max": "\u8BE5\u503C\u9AD8\u4E8E\u5141\u8BB8\u7684\u6700\u5927\u503C\u3002",
  "settings.validation.min-length": "\u5185\u5BB9\u8FC7\u77ED\u3002",
  "settings.validation.max-length": "\u5185\u5BB9\u8FC7\u957F\u3002",
  "settings.validation.pattern": "\u5185\u5BB9\u683C\u5F0F\u4E0D\u6B63\u786E\u3002",
  "settings.validation.pattern-invalid": "\u6821\u9A8C\u89C4\u5219\u65E0\u6548\u3002",
  "settings.validation.option": "\u8BF7\u9009\u62E9\u53EF\u7528\u7684\u9009\u9879\u3002",
  "settings.validation.boolean": "\u6B64\u8BBE\u7F6E\u53EA\u80FD\u4E3A\u5F00\u6216\u5173\u3002",
  "settings.validation.number": "\u8BF7\u8F93\u5165\u6570\u5B57\u3002",
  "settings.validation.text": "\u8BF7\u8F93\u5165\u6587\u672C\u3002",
  "settings.validation.step": "\u8BE5\u503C\u5FC5\u987B\u7B26\u5408\u5141\u8BB8\u7684\u6B65\u957F\u3002"
};

// ../../../sdkwork-appbase/packages/common/system/sdkwork-settings-core/src/messages.ts
var BASE_MESSAGES = enUsSettingsMessages;
function createSdkworkSettingsMessageCatalog(options = {}) {
  var _a, _b, _c;
  const locale = (_a = options.locale) != null ? _a : "en-US";
  const localeMessages = locale.toLowerCase().startsWith("zh") ? zhCnSettingsMessages : void 0;
  return Object.freeze({
    direction: (_b = options.direction) != null ? _b : "ltr",
    locale,
    messages: Object.freeze({
      ...BASE_MESSAGES,
      ...localeMessages != null ? localeMessages : {},
      ...(_c = options.messages) != null ? _c : {}
    })
  });
}
function resolveSdkworkSettingsMessage(catalog, key, fallback) {
  var _a, _b;
  if (!key) {
    return fallback != null ? fallback : "";
  }
  return (_b = (_a = catalog.messages[key]) != null ? _a : fallback) != null ? _b : key;
}
function resolveSdkworkSettingsGroupTitle(group, catalog) {
  var _a, _b;
  return (_b = group.title) != null ? _b : resolveSdkworkSettingsMessage(
    catalog,
    (_a = group.titleKey) != null ? _a : `settings.group.${group.id}.title`,
    humanizeSdkworkSettingsId(String(group.id))
  );
}
function resolveSdkworkSettingsGroupDescription(group, catalog) {
  var _a;
  return (_a = group.description) != null ? _a : group.descriptionKey ? resolveSdkworkSettingsMessage(catalog, group.descriptionKey) : void 0;
}
function resolveSdkworkSettingsSectionTitle(section, catalog) {
  var _a, _b;
  return (_b = section.title) != null ? _b : resolveSdkworkSettingsMessage(
    catalog,
    (_a = section.titleKey) != null ? _a : `settings.section.${section.id}.title`,
    humanizeSdkworkSettingsId(section.id)
  );
}
function resolveSdkworkSettingsSectionDescription(section, catalog) {
  var _a;
  return (_a = section.description) != null ? _a : section.descriptionKey ? resolveSdkworkSettingsMessage(catalog, section.descriptionKey) : void 0;
}
function resolveSdkworkSettingTitle(setting, catalog) {
  var _a, _b;
  return (_b = setting.title) != null ? _b : resolveSdkworkSettingsMessage(
    catalog,
    (_a = setting.titleKey) != null ? _a : `settings.setting.${setting.id}.title`,
    humanizeSdkworkSettingsId(setting.id)
  );
}
function resolveSdkworkSettingDescription(setting, catalog) {
  var _a;
  return (_a = setting.description) != null ? _a : setting.descriptionKey ? resolveSdkworkSettingsMessage(catalog, setting.descriptionKey) : void 0;
}
function resolveSdkworkSettingOptionTitle(option, catalog) {
  var _a;
  return (_a = option.label) != null ? _a : resolveSdkworkSettingsMessage(
    catalog,
    option.labelKey,
    String(option.value)
  );
}
function resolveSdkworkSettingsValidationMessage(issue2, catalog) {
  var _a, _b;
  return (_b = issue2.message) != null ? _b : resolveSdkworkSettingsMessage(
    catalog,
    (_a = issue2.messageKey) != null ? _a : `settings.validation.${issue2.code}`,
    "This value is invalid."
  );
}

// ../../../sdkwork-appbase/packages/common/system/sdkwork-settings-core/src/validation.ts
function issue(settingId, code, messageKey) {
  return { code, messageKey, settingId };
}
function validateConstraints(setting, value, constraints) {
  const issues = [];
  const isBlankString = typeof value === "string" && value.length === 0;
  if (constraints.required && (value === null || value === void 0 || isBlankString)) {
    return [issue(setting.id, "required", "settings.validation.required")];
  }
  if (typeof value === "number") {
    if (constraints.min !== void 0 && value < constraints.min) {
      issues.push(issue(setting.id, "min", "settings.validation.min"));
    }
    if (constraints.max !== void 0 && value > constraints.max) {
      issues.push(issue(setting.id, "max", "settings.validation.max"));
    }
    if (constraints.step !== void 0 && constraints.step > 0 && Math.round(value / constraints.step) * constraints.step !== value) {
      issues.push(issue(setting.id, "invalid-type", "settings.validation.step"));
    }
  }
  if (typeof value === "string" && value.length > 0) {
    if (constraints.minLength !== void 0 && value.length < constraints.minLength) {
      issues.push(issue(setting.id, "min-length", "settings.validation.min-length"));
    }
    if (constraints.maxLength !== void 0 && value.length > constraints.maxLength) {
      issues.push(issue(setting.id, "max-length", "settings.validation.max-length"));
    }
    if (constraints.pattern) {
      try {
        if (!new RegExp(constraints.pattern, "u").test(value)) {
          issues.push(issue(setting.id, "pattern", "settings.validation.pattern"));
        }
      } catch {
        issues.push(issue(setting.id, "custom", "settings.validation.pattern-invalid"));
      }
    }
  }
  return issues;
}
function validateKind(setting, value) {
  var _a;
  if (setting.kind === "toggle" && typeof value !== "boolean") {
    return [issue(setting.id, "invalid-type", "settings.validation.boolean")];
  }
  if ((setting.kind === "number" || setting.kind === "slider") && typeof value !== "number") {
    return [issue(setting.id, "invalid-type", "settings.validation.number")];
  }
  if ((setting.kind === "text" || setting.kind === "select" || setting.kind === "radio") && typeof value !== "string" && setting.kind !== "select") {
    return [issue(setting.id, "invalid-type", "settings.validation.text")];
  }
  if (setting.kind === "select" || setting.kind === "radio") {
    const optionValues = new Set(((_a = setting.options) != null ? _a : []).map((option) => option.value));
    if (!optionValues.has(value)) {
      return [issue(setting.id, "invalid-option", "settings.validation.option")];
    }
  }
  return [];
}
function validateSdkworkSettingValue(setting, value, values) {
  var _a;
  const issues = [
    ...validateKind(setting, value),
    ...validateConstraints(setting, value, (_a = setting.constraints) != null ? _a : {})
  ];
  if (setting.validate) {
    issues.push(
      ...setting.validate(value, {
        setting,
        values
      })
    );
  }
  return issues;
}
function validateSdkworkSettingsValues(catalog, values) {
  return catalog.settings.flatMap(
    (setting) => {
      var _a;
      return validateSdkworkSettingValue(setting, (_a = values[setting.id]) != null ? _a : setting.defaultValue, values);
    }
  );
}
function createSdkworkSettingsSavePlan(catalog, dirtySettingIds) {
  var _a, _b;
  const autoSettingIds = [];
  const manualSettingIds = [];
  const applySettingIds = [];
  const restartSettingIds = [];
  for (const settingId of dirtySettingIds) {
    const setting = catalog.settingById[settingId];
    if (!setting) {
      continue;
    }
    if (setting.requiresRestart) {
      restartSettingIds.push(settingId);
    }
    const section = catalog.sectionById[setting.sectionId];
    const saveMode = (_b = (_a = setting.saveMode) != null ? _a : section == null ? void 0 : section.saveMode) != null ? _b : "manual";
    if (saveMode === "auto") {
      autoSettingIds.push(settingId);
    } else if (saveMode === "apply") {
      applySettingIds.push(settingId);
    } else {
      manualSettingIds.push(settingId);
    }
  }
  return {
    applySettingIds: Object.freeze(applySettingIds),
    autoSettingIds: Object.freeze(autoSettingIds),
    manualSettingIds: Object.freeze(manualSettingIds),
    restartSettingIds: Object.freeze(restartSettingIds)
  };
}

// ../../../sdkwork-appbase/packages/common/system/sdkwork-settings-core/src/runtime.ts
function groupIssues(issues) {
  var _a;
  const grouped = {};
  for (const issue2 of issues) {
    grouped[issue2.settingId] = [...(_a = grouped[issue2.settingId]) != null ? _a : [], issue2];
  }
  return grouped;
}
function toErrorMessage(error) {
  return error instanceof Error ? error.message : "Unknown settings error";
}
function createSdkworkSettingsRuntime(options) {
  var _a, _b, _c, _d;
  const autoSaveDelayMs = (_a = options.autoSaveDelayMs) != null ? _a : 600;
  let values = freezeSdkworkSettingsValues(
    resolveSdkworkSettingsValues(options.catalog, {
      ...options.layers,
      user: {
        ...(_c = (_b = options.layers) == null ? void 0 : _b.user) != null ? _c : {},
        ...(_d = options.initialValues) != null ? _d : {}
      }
    })
  );
  let savedValues = values;
  let status = options.autoLoad === false ? "ready" : "idle";
  let activeSectionId = resolveDefaultSdkworkSettingsSectionId(options.catalog);
  let query = "";
  let readOnly = false;
  let lastError;
  let lastSavedAt;
  let revision;
  let autoSaveTimer;
  let destroyed = false;
  const listeners = /* @__PURE__ */ new Set();
  function computeSnapshot() {
    const dirtySettingIds = findSdkworkSettingsDirtyIds(
      options.catalog,
      values,
      savedValues
    );
    const issues = validateSdkworkSettingsValues(options.catalog, values);
    return {
      activeSectionId,
      dirtySettingIds: Object.freeze(dirtySettingIds),
      issuesBySettingId: Object.freeze(groupIssues(issues)),
      lastError,
      lastSavedAt,
      query,
      readOnly,
      revision,
      savedValues,
      status,
      values
    };
  }
  let snapshot = computeSnapshot();
  function publish() {
    snapshot = computeSnapshot();
    for (const listener of listeners) {
      listener();
    }
  }
  function emit(event) {
    var _a2;
    (_a2 = options.onEvent) == null ? void 0 : _a2.call(options, event);
  }
  function clearAutoSaveTimer() {
    if (autoSaveTimer !== void 0) {
      clearTimeout(autoSaveTimer);
      autoSaveTimer = void 0;
    }
  }
  function scheduleAutoSave() {
    clearAutoSaveTimer();
    if (autoSaveDelayMs <= 0) {
      return;
    }
    const plan = createSdkworkSettingsSavePlan(
      options.catalog,
      findSdkworkSettingsDirtyIds(options.catalog, values, savedValues)
    );
    if (plan.autoSettingIds.length === 0) {
      return;
    }
    autoSaveTimer = setTimeout(() => {
      autoSaveTimer = void 0;
      void save(plan.autoSettingIds);
    }, autoSaveDelayMs);
  }
  function setStatus(nextStatus) {
    status = nextStatus;
    publish();
    emit({ status, type: "status" });
  }
  function resolveTargetIds(settingIds) {
    return settingIds ? [...settingIds] : findSdkworkSettingsDirtyIds(options.catalog, values, savedValues);
  }
  async function save(settingIds) {
    var _a2;
    if (destroyed) {
      return {
        error: { code: "save-failed", message: "Settings runtime was destroyed" },
        status: "failed"
      };
    }
    const targetIds = resolveTargetIds(settingIds);
    if (targetIds.length === 0) {
      return { reason: "nothing-dirty", status: "skipped" };
    }
    const targetSet = new Set(targetIds);
    const issues = validateSdkworkSettingsValues(options.catalog, values).filter(
      (issue2) => targetSet.has(issue2.settingId)
    );
    if (issues.length > 0) {
      publish();
      return { issues: Object.freeze(issues), status: "invalid" };
    }
    setStatus("saving");
    lastError = void 0;
    try {
      const result = await options.store.save({
        changedSettingIds: targetIds,
        query: options.query,
        values
      });
      const nextSavedValues = { ...savedValues };
      for (const settingId of targetIds) {
        nextSavedValues[settingId] = (_a2 = values[settingId]) != null ? _a2 : null;
      }
      savedValues = freezeSdkworkSettingsValues(nextSavedValues);
      lastSavedAt = result.updatedAt;
      revision = result.revision;
      status = "ready";
      publish();
      emit({ type: "saved", values });
      return {
        savedSettingIds: Object.freeze(targetIds),
        status: "saved"
      };
    } catch (error) {
      lastError = { code: "save-failed", message: toErrorMessage(error) };
      status = "error";
      publish();
      emit({ message: lastError.message, type: "error" });
      return { error: lastError, status: "failed" };
    }
  }
  async function load(signal) {
    if (destroyed) {
      return;
    }
    setStatus("loading");
    lastError = void 0;
    try {
      const stored = await options.store.load(options.query, signal);
      if (stored) {
        const permitted = {};
        for (const setting of options.catalog.settings) {
          const storedValue = stored.values[setting.id];
          if (storedValue !== void 0) {
            permitted[setting.id] = storedValue;
          }
        }
        values = freezeSdkworkSettingsValues({
          ...values,
          ...permitted
        });
        savedValues = values;
        lastSavedAt = stored.updatedAt;
        revision = stored.revision;
      } else {
        savedValues = values;
      }
      status = "ready";
      publish();
      emit({ type: "loaded", values });
    } catch (error) {
      lastError = { code: "load-failed", message: toErrorMessage(error) };
      status = "error";
      publish();
      emit({ message: lastError.message, type: "error" });
    }
  }
  function update(settingId, nextValue) {
    if (readOnly || destroyed) {
      return;
    }
    const setting = options.catalog.settingById[settingId];
    if (!setting) {
      throw new Error(`Unknown settings setting id: ${settingId}`);
    }
    const normalized = setting.normalize ? setting.normalize(nextValue, { setting, values }) : nextValue;
    const nextValues = {
      ...values,
      [settingId]: normalized
    };
    const changedIds = findSdkworkSettingsDirtyIds(
      options.catalog,
      nextValues,
      savedValues
    );
    values = freezeSdkworkSettingsValues(nextValues);
    publish();
    emit({
      change: {
        changedSettingIds: Object.freeze(changedIds),
        reason: "update",
        values
      },
      type: "changed"
    });
    emit({ dirtySettingIds: snapshot.dirtySettingIds, type: "dirty" });
    scheduleAutoSave();
  }
  function updateMany(nextValues) {
    for (const [settingId, value] of Object.entries(nextValues)) {
      update(settingId, value);
    }
  }
  function discard(settingIds) {
    var _a2, _b2;
    if (destroyed) {
      return;
    }
    const targetIds = resolveTargetIds(settingIds);
    const nextValues = { ...values };
    for (const settingId of targetIds) {
      nextValues[settingId] = (_b2 = (_a2 = savedValues[settingId]) != null ? _a2 : options.catalog.defaults[settingId]) != null ? _b2 : null;
    }
    values = freezeSdkworkSettingsValues(nextValues);
    lastError = void 0;
    publish();
    emit({
      change: {
        changedSettingIds: Object.freeze(targetIds),
        reason: "discard",
        values
      },
      type: "changed"
    });
  }
  async function reset(settingIds) {
    var _a2, _b2;
    if (destroyed) {
      return;
    }
    const targetIds = settingIds != null ? settingIds : options.catalog.settings.map((setting) => setting.id);
    setStatus("saving");
    try {
      await options.store.reset({
        query: options.query,
        ...settingIds ? { settingIds } : {}
      });
      const nextValues = { ...values };
      for (const settingId of targetIds) {
        nextValues[settingId] = (_a2 = options.catalog.defaults[settingId]) != null ? _a2 : null;
      }
      values = freezeSdkworkSettingsValues(nextValues);
      const nextSavedValues = { ...savedValues };
      for (const settingId of targetIds) {
        nextSavedValues[settingId] = (_b2 = nextValues[settingId]) != null ? _b2 : null;
      }
      savedValues = freezeSdkworkSettingsValues(nextSavedValues);
      lastError = void 0;
      status = "ready";
      publish();
      emit({
        change: {
          changedSettingIds: Object.freeze(targetIds),
          reason: "reset",
          values
        },
        type: "changed"
      });
    } catch (error) {
      lastError = { code: "reset-failed", message: toErrorMessage(error) };
      status = "error";
      publish();
      emit({ message: lastError.message, type: "error" });
    }
  }
  if (options.autoLoad !== false) {
    void load();
  }
  return {
    apply: save,
    destroy() {
      destroyed = true;
      clearAutoSaveTimer();
      listeners.clear();
    },
    discard,
    getSnapshot() {
      return snapshot;
    },
    getVisibleSections(context) {
      return resolveVisibleSdkworkSettings(options.catalog, {
        locale: context.locale,
        permissions: context.permissions,
        platform: context.platform,
        scope: context.scope,
        values
      });
    },
    load,
    reset,
    save,
    setActiveSectionId(sectionId) {
      const nextSectionId = sectionId && options.catalog.sectionById[sectionId] ? sectionId : void 0;
      if (activeSectionId === nextSectionId) {
        return;
      }
      activeSectionId = nextSectionId;
      publish();
    },
    setQuery(nextQuery) {
      const normalized = trim(nextQuery);
      if (query === normalized) {
        return;
      }
      query = normalized;
      publish();
    },
    setReadOnly(nextReadOnly) {
      if (readOnly === nextReadOnly) {
        return;
      }
      readOnly = nextReadOnly;
      publish();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    update,
    updateMany
  };
}

// ../../../sdkwork-appbase/packages/common/system/sdkwork-settings-core/src/search.ts
function normalize2(value) {
  return value.toLocaleLowerCase();
}
function collectSettingText(setting) {
  var _a, _b;
  return [
    setting.id,
    setting.title,
    setting.titleKey,
    setting.description,
    setting.descriptionKey,
    setting.customType,
    ...(_a = setting.keywords) != null ? _a : [],
    ...((_b = setting.options) != null ? _b : []).flatMap((option) => {
      var _a2;
      return [
        option.label,
        option.labelKey,
        option.description,
        option.descriptionKey,
        ...(_a2 = option.keywords) != null ? _a2 : []
      ];
    })
  ].filter((part) => Boolean(part)).join(" ");
}
function collectSectionText(section) {
  var _a;
  return [
    section.id,
    section.title,
    section.titleKey,
    section.description,
    section.descriptionKey,
    ...(_a = section.keywords) != null ? _a : []
  ].filter((part) => Boolean(part)).join(" ");
}
function countOccurrences(haystack, needle) {
  if (!needle) {
    return 0;
  }
  let count = 0;
  let index = haystack.indexOf(needle);
  while (index !== -1) {
    count += 1;
    index = haystack.indexOf(needle, index + needle.length);
  }
  return count;
}
function scoreText(haystack, query) {
  if (!query) {
    return 0;
  }
  const normalized = normalize2(haystack);
  const idStart = normalized.startsWith(query) ? 3 : 0;
  const wordStart = normalized.includes(` ${query}`) ? 2 : 0;
  const occurrences = countOccurrences(normalized, query);
  return idStart + wordStart + Math.min(occurrences, 4);
}
function searchSdkworkSettings(catalog, query) {
  var _a;
  const normalizedQuery = normalize2(trim(query));
  if (!normalizedQuery) {
    return [];
  }
  const results = [];
  for (const section of catalog.sections) {
    const sectionScore = scoreText(collectSectionText(section), normalizedQuery);
    if (sectionScore > 0) {
      results.push({ section, score: sectionScore });
    }
    for (const setting of (_a = catalog.sectionSettings[section.id]) != null ? _a : []) {
      const settingScore = scoreText(
        collectSettingText(setting),
        normalizedQuery
      );
      if (settingScore > 0) {
        results.push({ section, setting, score: settingScore + 0.5 });
      }
    }
  }
  return results.sort((left, right) => {
    var _a2, _b, _c, _d;
    if (right.score !== left.score) {
      return right.score - left.score;
    }
    return ((_b = (_a2 = left.setting) == null ? void 0 : _a2.id) != null ? _b : left.section.id).localeCompare(
      (_d = (_c = right.setting) == null ? void 0 : _c.id) != null ? _d : right.section.id
    );
  });
}

// ../../../sdkwork-appbase/packages/common/system/sdkwork-settings-core/src/stores.ts
function createSdkworkSettingsStorageKey(query) {
  var _a, _b, _c;
  return [
    "sdkwork.settings.v1",
    encodeURIComponent(query.appId),
    query.scope,
    encodeURIComponent((_a = query.tenantId) != null ? _a : "-"),
    encodeURIComponent((_b = query.userId) != null ? _b : "-"),
    encodeURIComponent((_c = query.namespace) != null ? _c : "default")
  ].join(":");
}
function isSdkworkSettingsValue(value) {
  if (value === null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return true;
  }
  if (Array.isArray(value)) {
    return value.every(
      (item) => typeof item === "string" || typeof item === "number"
    );
  }
  return false;
}
function toStoredValues(values) {
  const stored = {};
  for (const [key, value] of Object.entries(values)) {
    if (isSdkworkSettingsValue(value)) {
      stored[key] = value;
    }
  }
  return stored;
}
var SdkworkMemorySettingsStore = class {
  constructor() {
    __publicField(this, "snapshots", /* @__PURE__ */ new Map());
  }
  async load(query, signal) {
    var _a;
    signal == null ? void 0 : signal.throwIfAborted();
    return (_a = this.snapshots.get(createSdkworkSettingsStorageKey(query))) != null ? _a : null;
  }
  async reset(request) {
    var _a;
    const key = createSdkworkSettingsStorageKey(request.query);
    const current = this.snapshots.get(key);
    if (!current) {
      return;
    }
    if (!request.settingIds) {
      this.snapshots.delete(key);
      return;
    }
    const values = { ...current.values };
    for (const settingId of request.settingIds) {
      delete values[settingId];
    }
    this.snapshots.set(key, {
      revision: `${Number((_a = current.revision) != null ? _a : 0) + 1}`,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      values
    });
  }
  async save(request) {
    var _a;
    const current = this.snapshots.get(createSdkworkSettingsStorageKey(request.query));
    const snapshot = {
      revision: `${Number((_a = current == null ? void 0 : current.revision) != null ? _a : 0) + 1}`,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      values: Object.freeze(toStoredValues(request.values))
    };
    this.snapshots.set(createSdkworkSettingsStorageKey(request.query), snapshot);
    return snapshot;
  }
};

// ../../../sdkwork-appbase/packages/common/system/sdkwork-settings-core/src/view-model.ts
function createRow(setting, input) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i;
  const dirty = (input.savedValues ? findSdkworkSettingsDirtyIds(
    input.catalog,
    { [setting.id]: input.values[setting.id] },
    { [setting.id]: input.savedValues[setting.id] }
  ) : []).length > 0;
  const issues = (_b = (_a = input.issuesBySettingId) == null ? void 0 : _a[setting.id]) != null ? _b : [];
  return {
    action: typeof ((_c = setting.metadata) == null ? void 0 : _c.action) === "string" ? setting.metadata.action : void 0,
    customType: setting.customType,
    description: resolveSdkworkSettingDescription(setting, input.messages),
    destructive: ((_d = setting.ui) == null ? void 0 : _d.destructive) === true,
    dirty,
    disabled: setting.enabled === false,
    kind: setting.kind,
    options: ((_e = setting.options) != null ? _e : []).map((option) => ({
      disabled: option.disabled === true,
      label: resolveSdkworkSettingOptionTitle(option, input.messages),
      value: option.value
    })),
    placeholder: setting.placeholderKey ? resolveSdkworkSettingsMessage(input.messages, setting.placeholderKey) : setting.placeholder,
    requiresRestart: setting.requiresRestart === true,
    settingId: setting.id,
    span: (_g = (_f = setting.ui) == null ? void 0 : _f.span) != null ? _g : "full",
    title: resolveSdkworkSettingTitle(setting, input.messages),
    unit: (_h = setting.ui) == null ? void 0 : _h.unit,
    validationMessages: issues.map(
      (issue2) => resolveSdkworkSettingsValidationMessage(issue2, input.messages)
    ),
    value: (_i = input.values[setting.id]) != null ? _i : setting.defaultValue
  };
}
function createSection(section, input, settingsBySection) {
  var _a;
  return {
    description: resolveSdkworkSettingsSectionDescription(section, input.messages),
    id: section.id,
    rows: ((_a = settingsBySection[section.id]) != null ? _a : []).map(
      (setting) => createRow(setting, input)
    ),
    title: resolveSdkworkSettingsSectionTitle(section, input.messages)
  };
}
function matchesSearch(section, query, catalog) {
  var _a;
  if (!query) {
    return null;
  }
  const results = searchSdkworkSettings(catalog, query);
  const settingIds = /* @__PURE__ */ new Set();
  for (const result of results) {
    if (result.section.id === section.id) {
      if (result.setting) {
        settingIds.add(result.setting.id);
      } else {
        for (const setting of (_a = catalog.sectionSettings[section.id]) != null ? _a : []) {
          settingIds.add(setting.id);
        }
      }
    }
  }
  return settingIds;
}
function createSdkworkSettingsViewModel(input) {
  var _a, _b, _c, _d, _e, _f, _g, _h;
  const query = (_a = input.query) != null ? _a : "";
  const dirtySettingIds = input.savedValues ? findSdkworkSettingsDirtyIds(input.catalog, input.values, input.savedValues) : [];
  const visible = resolveVisibleSdkworkSettings(input.catalog, {
    locale: input.locale,
    permissions: (_b = input.permissions) != null ? _b : [],
    platform: input.platform,
    scope: input.scope,
    values: input.values
  });
  const dirty = new Set(dirtySettingIds);
  const groups = [];
  for (const navGroup of input.catalog.navigation) {
    const groupSections = visible.sections.filter(
      (section) => section.groupId === navGroup.group.id
    );
    const sections = [];
    const items = [];
    for (const section of groupSections) {
      const matchedSettingIds = matchesSearch(section, query, input.catalog);
      if (matchedSettingIds && matchedSettingIds.size === 0) {
        continue;
      }
      const sectionSettingIds = (_d = (_c = input.catalog.sectionSettings[section.id]) == null ? void 0 : _c.map((setting) => setting.id)) != null ? _d : [];
      const isDirty = sectionSettingIds.some((settingId) => dirty.has(settingId));
      sections.push({ matchedSettingIds, section });
      items.push({
        description: resolveSdkworkSettingsSectionDescription(section, input.messages),
        dirty: isDirty,
        icon: section.icon,
        id: section.id,
        title: resolveSdkworkSettingsSectionTitle(section, input.messages)
      });
    }
    if (items.length > 0) {
      groups.push({ group: navGroup.group, items, sections });
    }
  }
  const availableSectionIds = groups.flatMap(
    (group) => group.sections.map((entry) => entry.section.id)
  );
  let activeSectionId = (_e = input.activeSectionId) != null ? _e : "";
  if (!availableSectionIds.includes(activeSectionId)) {
    activeSectionId = (_g = (_f = availableSectionIds[0]) != null ? _f : resolveDefaultSdkworkSettingsSectionId(input.catalog)) != null ? _g : "";
  }
  const activeGroup = groups.find(
    (group) => group.sections.some((entry) => entry.section.id === activeSectionId)
  );
  const activeEntry = activeGroup == null ? void 0 : activeGroup.sections.find(
    (entry) => entry.section.id === activeSectionId
  );
  const activeSection = activeEntry ? createSection(
    activeEntry.section,
    input,
    activeEntry.matchedSettingIds ? {
      [activeEntry.section.id]: ((_h = visible.settingsBySection[activeEntry.section.id]) != null ? _h : []).filter(
        (setting) => {
          var _a2;
          return (_a2 = activeEntry.matchedSettingIds) == null ? void 0 : _a2.has(setting.id);
        }
      )
    } : visible.settingsBySection
  ) : void 0;
  const navigation = groups.map(
    (group) => ({
      description: resolveSdkworkSettingsGroupDescription(group.group, input.messages),
      id: String(group.group.id),
      items: group.items,
      title: resolveSdkworkSettingsGroupTitle(group.group, input.messages)
    })
  );
  return {
    activeSection,
    activeSectionId,
    dirtySettingIds,
    navigation,
    query
  };
}

// ../../../sdkwork-appbase/packages/mini-program/system/sdkwork-settings-mini-program/src/projection/model.ts
function valueText(row) {
  var _a, _b, _c;
  if (row.kind === "toggle") {
    return row.value === true ? "On" : "Off";
  }
  if (row.kind === "select" || row.kind === "radio") {
    const option = row.options.find((candidate) => candidate.value === row.value);
    return (_b = option == null ? void 0 : option.label) != null ? _b : String((_a = row.value) != null ? _a : "");
  }
  if (row.value === null || row.value === "") {
    return "\u2014";
  }
  return `${row.value}${(_c = row.unit) != null ? _c : ""}`;
}
function projectRow(row, setting) {
  var _a, _b, _c, _d, _e, _f, _g;
  return {
    description: row.description,
    dirty: row.dirty,
    disabled: row.disabled,
    errors: row.validationMessages,
    kind: row.kind,
    ...((_a = setting == null ? void 0 : setting.constraints) == null ? void 0 : _a.max) != null ? { max: setting.constraints.max } : {},
    ...((_b = setting == null ? void 0 : setting.constraints) == null ? void 0 : _b.min) != null ? { min: setting.constraints.min } : {},
    ...((_c = setting == null ? void 0 : setting.constraints) == null ? void 0 : _c.step) != null ? { step: setting.constraints.step } : {},
    options: row.options.map((option) => ({
      disabled: option.disabled,
      label: option.label,
      value: option.value
    })),
    requiresRestart: row.requiresRestart,
    settingId: row.settingId,
    title: row.title,
    ...((_e = row.unit) != null ? _e : (_d = setting == null ? void 0 : setting.ui) == null ? void 0 : _d.unit) ? { unit: (_g = row.unit) != null ? _g : (_f = setting == null ? void 0 : setting.ui) == null ? void 0 : _f.unit } : {},
    value: row.value,
    valueText: valueText(row)
  };
}
function projectSdkworkMiniProgramSettings(runtime, options) {
  var _a, _b, _c, _d;
  const snapshot = runtime.getSnapshot();
  const locale = (_a = options.locale) != null ? _a : "en-US";
  const messages = (_b = options.messages) != null ? _b : createSdkworkSettingsMessageCatalog({
    locale,
    messages: options.messageOverrides
  });
  const viewModel = createSdkworkSettingsViewModel({
    activeSectionId: snapshot.activeSectionId,
    catalog: options.catalog,
    issuesBySettingId: snapshot.issuesBySettingId,
    locale,
    messages,
    permissions: (_c = options.permissions) != null ? _c : [],
    platform: "mini-program",
    query: snapshot.query,
    savedValues: snapshot.savedValues,
    scope: "user",
    values: snapshot.values
  });
  const manualDirtyCount = options.catalog.settings.filter((setting) => {
    var _a2, _b2;
    if (!snapshot.dirtySettingIds.includes(setting.id)) {
      return false;
    }
    const section = options.catalog.sectionById[setting.sectionId];
    return ((_b2 = (_a2 = setting.saveMode) != null ? _a2 : section == null ? void 0 : section.saveMode) != null ? _b2 : "manual") === "manual";
  }).length;
  return {
    activeSection: viewModel.activeSection ? {
      description: viewModel.activeSection.description,
      id: viewModel.activeSection.id,
      rows: viewModel.activeSection.rows.map(
        (row) => projectRow(row, options.catalog.settingById[row.settingId])
      ),
      title: viewModel.activeSection.title
    } : null,
    activeSectionId: viewModel.activeSectionId,
    dirtyCount: manualDirtyCount,
    navigation: viewModel.navigation.map((group) => ({
      id: group.id,
      items: group.items.map((item) => ({
        description: item.description,
        dirty: item.dirty,
        icon: item.icon,
        id: item.id,
        title: item.title
      })),
      title: group.title
    })),
    query: snapshot.query,
    readOnly: snapshot.readOnly,
    savebarVisible: manualDirtyCount > 0,
    status: snapshot.status,
    view: (_d = options.view) != null ? _d : "list"
  };
}

// ../../../sdkwork-appbase/packages/mini-program/system/sdkwork-settings-mini-program/src/projection/wechat.ts
function createSdkworkMiniProgramSettingsBinding(runtime, options) {
  var _a;
  let listener = null;
  let unsubscribe = null;
  let view = (_a = options.view) != null ? _a : "list";
  function getData() {
    return projectSdkworkMiniProgramSettings(runtime, { ...options, view });
  }
  function publish() {
    listener == null ? void 0 : listener(getData());
  }
  return {
    attach(setData) {
      listener = setData;
      unsubscribe == null ? void 0 : unsubscribe();
      unsubscribe = runtime.subscribe(publish);
      publish();
    },
    detach() {
      unsubscribe == null ? void 0 : unsubscribe();
      unsubscribe = null;
      listener = null;
    },
    getData,
    onBack() {
      view = "list";
      runtime.setQuery("");
      publish();
    },
    onChoice(settingId, value) {
      runtime.update(settingId, value);
      publish();
    },
    onDiscard() {
      runtime.discard();
      publish();
    },
    onInput(settingId, value) {
      runtime.update(settingId, value);
      publish();
    },
    async onSave() {
      await runtime.save();
      publish();
    },
    onSearch(query) {
      runtime.setQuery(query);
      publish();
    },
    onSelectSection(sectionId) {
      view = "detail";
      runtime.setActiveSectionId(sectionId);
      runtime.setQuery("");
      publish();
    },
    onToggle(settingId, value) {
      runtime.update(settingId, value);
      publish();
    }
  };
}

// src/bootstrap/runtime.ts
var CLOUDROUTER_SETTINGS_SECTIONS = /* @__PURE__ */ new Set([
  "appearance",
  "voice",
  "notifications",
  "about"
]);
function createMiniSettingsCatalog() {
  const defaults = createDefaultSdkworkSettingsCatalog();
  const sections = defaults.sections.filter(
    (section) => CLOUDROUTER_SETTINGS_SECTIONS.has(section.id)
  );
  const settings = defaults.settings.filter(
    (setting) => CLOUDROUTER_SETTINGS_SECTIONS.has(setting.sectionId)
  );
  const groups = defaults.groups.filter(
    (group) => sections.some((section) => section.groupId === group.id)
  );
  return createSdkworkSettingsCatalog({ groups, sections, settings });
}
function createMiniSettingsStore() {
  const storage = globalThis.wx;
  if (!storage) {
    return new SdkworkMemorySettingsStore();
  }
  return {
    async load(query) {
      try {
        const values = storage.getStorageSync(createSdkworkSettingsStorageKey(query));
        return values && typeof values === "object" ? { values } : null;
      } catch {
        return null;
      }
    },
    async save(request) {
      storage.setStorageSync(
        createSdkworkSettingsStorageKey(request.query),
        request.values
      );
      return { values: request.values };
    },
    async reset(request) {
      const key = createSdkworkSettingsStorageKey(request.query);
      if (!request.settingIds) {
        storage.removeStorageSync(key);
        return;
      }
      try {
        const stored = storage.getStorageSync(key);
        if (stored && typeof stored === "object") {
          const values = { ...stored };
          for (const settingId of request.settingIds) {
            delete values[settingId];
          }
          storage.setStorageSync(key, values);
        }
      } catch {
        storage.removeStorageSync(key);
      }
    }
  };
}
function bootstrapMiniProgramApplication() {
  const environment = resolveRuntimeEnv();
  const locale = resolveConsoleLocale();
  const settingsCatalog = createMiniSettingsCatalog();
  const settingsRuntime = createSdkworkSettingsRuntime({
    autoLoad: true,
    catalog: settingsCatalog,
    query: {
      appId: "sdkwork-cloudrouter-mini-program",
      scope: "user",
      userId: "local"
    },
    store: createMiniSettingsStore()
  });
  return {
    locale,
    translate: createConsoleTranslator(locale),
    consolePorts: createCloudRouterMpConsolePorts(environment.appApiBaseUrl),
    webPublicHttpUrl: environment.webPublicHttpUrl,
    settingsBinding: createSdkworkMiniProgramSettingsBinding(settingsRuntime, {
      catalog: settingsCatalog,
      locale
    }),
    settingsRuntime
  };
}

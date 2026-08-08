/**
 * SDK transport locale propagation (`I18N_SPEC.md` §4/§10).
 *
 * Wraps the SDK HTTP boundary so every request carries the active runtime
 * locale through `Accept-Language` and the approved `X-SdkWork-Locale` header.
 * The locale is resolved from the app i18n runtime mirror (explicit user
 * preference, then `document.documentElement.lang`, then the browser language)
 * at request time — language switches take effect on the next request without
 * client reconstruction.
 */

export const SDKWORK_SDK_LOCALE_BOUNDARY = Symbol.for('sdkwork.sdk.localeBoundary');

export interface SdkworkSdkLocaleBoundaryHttp {
  request<TResponse>(path: string, options?: unknown): Promise<TResponse>;
  streamJson?<TResponse>(path: string, options?: unknown): AsyncIterable<TResponse>;
  [SDKWORK_SDK_LOCALE_BOUNDARY]?: boolean;
}

export interface SdkworkSdkLocaleBoundaryClient {
  http?: SdkworkSdkLocaleBoundaryHttp;
}

interface SdkworkSdkRequestOptions {
  headers?: Record<string, string>;
  [key: string]: unknown;
}

function readBrowserDocumentLanguage(): string | undefined {
  if (typeof document === 'undefined') {
    return undefined;
  }
  const lang = document.documentElement.lang?.trim();
  return lang || undefined;
}

function readExplicitUserLocale(): string | undefined {
  try {
    const explicit = globalThis.localStorage?.getItem('user_explicit_lang')?.trim();
    return explicit || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Resolves the active runtime locale at request time. Mirrors the app i18n
 * bootstrap precedence: explicit user preference, then the synced document
 * language, then the browser language.
 */
export function resolveSdkworkSdkLocale(): string {
  return (
    readExplicitUserLocale()
    ?? readBrowserDocumentLanguage()
    ?? (typeof navigator !== 'undefined' ? navigator.language : '')
  ).trim();
}

function withLocaleHeaders(options: unknown): unknown {
  const locale = resolveSdkworkSdkLocale();
  if (!locale) {
    return options;
  }
  const isOptionsObject = typeof options === 'object' && options !== null && !Array.isArray(options);
  if (!isOptionsObject && options !== undefined) {
    return options;
  }
  const base = isOptionsObject ? (options as SdkworkSdkRequestOptions) : {};
  return {
    ...base,
    headers: {
      'Accept-Language': locale,
      'X-SdkWork-Locale': locale,
      ...(base.headers ?? {}),
    },
  };
}

/**
 * Attaches the locale boundary to an SDK client's HTTP transport. Idempotent
 * per client (symbol-guarded), matching the session-auth boundary pattern.
 */
export function attachSdkworkSdkLocaleBoundary<TClient extends SdkworkSdkLocaleBoundaryClient>(
  client: TClient,
): TClient {
  const http = client.http as SdkworkSdkLocaleBoundaryHttp | undefined;
  if (!http || http[SDKWORK_SDK_LOCALE_BOUNDARY] || typeof http.request !== 'function') {
    return client;
  }

  const originalRequest = http.request.bind(http) as SdkworkSdkLocaleBoundaryHttp['request'];
  http.request = async <TResponse>(path: string, options?: unknown): Promise<TResponse> => {
    return originalRequest<TResponse>(path, withLocaleHeaders(options));
  };

  if (typeof http.streamJson === 'function') {
    const originalStreamJson = http.streamJson.bind(http) as NonNullable<
      SdkworkSdkLocaleBoundaryHttp['streamJson']
    >;
    http.streamJson = async function* <TResponse>(
      path: string,
      options?: unknown,
    ): AsyncIterable<TResponse> {
      yield* originalStreamJson<TResponse>(path, withLocaleHeaders(options));
    };
  }

  Object.defineProperty(http, SDKWORK_SDK_LOCALE_BOUNDARY, {
    configurable: false,
    enumerable: false,
    value: true,
  });
  return client;
}

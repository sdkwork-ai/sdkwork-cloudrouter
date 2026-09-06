let configuredAppClient;
let configuredModelsClient;
/** Bind the clients (or factories) the service resolves on every call. */
export function configureApiKeyServiceClients(clients) {
    configuredAppClient = clients.appClient;
    configuredModelsClient = clients.modelsClient;
}
/** Remove the binding (tests / embed teardown). */
export function resetApiKeyServiceClients() {
    configuredAppClient = undefined;
    configuredModelsClient = undefined;
}
/** Resolve the app client for one service call. */
export function resolveApiKeyServiceAppClient() {
    const configured = configuredAppClient;
    if (configured === undefined) {
        throw new Error('ApiKeyService is not configured: call configureApiKeyServiceClients() before use');
    }
    return typeof configured === 'function' ? configured() : configured;
}
/** Resolve the models client for one vendor-catalog call, or undefined. */
export function resolveApiKeyServiceModelsClient() {
    const configured = configuredModelsClient;
    if (configured === undefined) {
        return undefined;
    }
    return typeof configured === 'function' ? configured() : configured;
}
//# sourceMappingURL=serviceClients.js.map
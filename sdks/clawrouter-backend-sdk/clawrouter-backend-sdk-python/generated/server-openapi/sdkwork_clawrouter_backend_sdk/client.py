from .http_client import HttpClient, SdkConfig
from .api.ai import AiApi
from .api.integration import IntegrationApi
from .api.sites import SitesApi
from .api.system import SystemApi


class SdkworkBackendClient:
    """clawrouter-backend-sdk SDK Client."""

    def __init__(self, config: SdkConfig):
        self._client = HttpClient(config)
        self.ai: AiApi
        self.integration: IntegrationApi
        self.sites: SitesApi
        self.system: SystemApi

        # Initialize API modules
        self.ai = AiApi(self._client)
        self.integration = IntegrationApi(self._client)
        self.sites = SitesApi(self._client)
        self.system = SystemApi(self._client)
    def set_auth_token(self, token: str) -> 'SdkworkBackendClient':
        """Set auth token for authentication."""
        self._client.set_auth_token(token)
        return self

    def set_access_token(self, token: str) -> 'SdkworkBackendClient':
        """Set access token for authentication."""
        self._client.set_access_token(token)
        return self

    def set_header(self, key: str, value: str) -> 'SdkworkBackendClient':
        """Set custom header."""
        self._client.set_header(key, value)
        return self

    @property
    def http(self) -> HttpClient:
        """Get the underlying HTTP client."""
        return self._client


def create_client(config: SdkConfig) -> SdkworkBackendClient:
    """Create a new SDK client instance."""
    return SdkworkBackendClient(config)

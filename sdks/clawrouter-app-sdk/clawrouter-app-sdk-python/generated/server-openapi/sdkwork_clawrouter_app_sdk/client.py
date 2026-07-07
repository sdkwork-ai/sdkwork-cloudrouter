from .http_client import HttpClient, SdkConfig
from .api.system import SystemApi
from .api.ai import AiApi
from .api.chat import ChatApi
from .api.iam import IamApi
from .api.notification import NotificationApi
from .api.runtime import RuntimeApi


class SdkworkAppClient:
    """clawrouter-app-sdk SDK Client."""

    def __init__(self, config: SdkConfig):
        self._client = HttpClient(config)
        self.system: SystemApi
        self.ai: AiApi
        self.chat: ChatApi
        self.iam: IamApi
        self.notification: NotificationApi
        self.runtime: RuntimeApi

        # Initialize API modules
        self.system = SystemApi(self._client)
        self.ai = AiApi(self._client)
        self.chat = ChatApi(self._client)
        self.iam = IamApi(self._client)
        self.notification = NotificationApi(self._client)
        self.runtime = RuntimeApi(self._client)
    def set_auth_token(self, token: str) -> 'SdkworkAppClient':
        """Set auth token for authentication."""
        self._client.set_auth_token(token)
        return self

    def set_access_token(self, token: str) -> 'SdkworkAppClient':
        """Set access token for authentication."""
        self._client.set_access_token(token)
        return self

    def set_header(self, key: str, value: str) -> 'SdkworkAppClient':
        """Set custom header."""
        self._client.set_header(key, value)
        return self

    @property
    def http(self) -> HttpClient:
        """Get the underlying HTTP client."""
        return self._client


def create_client(config: SdkConfig) -> SdkworkAppClient:
    """Create a new SDK client instance."""
    return SdkworkAppClient(config)

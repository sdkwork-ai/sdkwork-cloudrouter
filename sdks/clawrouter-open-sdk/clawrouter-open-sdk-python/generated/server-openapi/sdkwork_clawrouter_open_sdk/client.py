from .http_client import HttpClient, SdkConfig
from .api.files_anthropic import FilesAnthropicApi
from .api.chat_anthropic import ChatAnthropicApi
from .api.batches_anthropic import BatchesAnthropicApi
from .api.responses_google import ResponsesGoogleApi
from .api.files_google import FilesGoogleApi
from .api.embeddings_google import EmbeddingsGoogleApi
from .api.chat_google import ChatGoogleApi
from .api.videos_kling import VideosKlingApi
from .api.images_midjourney import ImagesMidjourneyApi
from .api.images_nano_banana import ImagesNanoBananaApi
from .api.audio_suno import AudioSunoApi
from .api.assistants import AssistantsApi
from .api.audio import AudioApi
from .api.batches import BatchesApi
from .api.chat import ChatApi
from .api.completion import CompletionApi
from .api.container import ContainerApi
from .api.conversation import ConversationApi
from .api.embeddings import EmbeddingsApi
from .api.files import FilesApi
from .api.images import ImagesApi
from .api.models import ModelsApi
from .api.moderations import ModerationsApi
from .api.realtime import RealtimeApi
from .api.responses import ResponsesApi
from .api.threads import ThreadsApi
from .api.uploads import UploadsApi
from .api.vector_stores import VectorStoresApi
from .api.video import VideoApi
from .api.videos_vidu import VideosViduApi
from .api.images_vidu import ImagesViduApi
from .api.videos_volcengine import VideosVolcengineApi


class SdkworkAiClient:
    """clawrouter-open-sdk SDK Client."""

    def __init__(self, config: SdkConfig):
        self._client = HttpClient(config)
        self.files_anthropic: FilesAnthropicApi
        self.chat_anthropic: ChatAnthropicApi
        self.batches_anthropic: BatchesAnthropicApi
        self.responses_google: ResponsesGoogleApi
        self.files_google: FilesGoogleApi
        self.embeddings_google: EmbeddingsGoogleApi
        self.chat_google: ChatGoogleApi
        self.videos_kling: VideosKlingApi
        self.images_midjourney: ImagesMidjourneyApi
        self.images_nano_banana: ImagesNanoBananaApi
        self.audio_suno: AudioSunoApi
        self.assistants: AssistantsApi
        self.audio: AudioApi
        self.batches: BatchesApi
        self.chat: ChatApi
        self.completion: CompletionApi
        self.container: ContainerApi
        self.conversation: ConversationApi
        self.embeddings: EmbeddingsApi
        self.files: FilesApi
        self.images: ImagesApi
        self.models: ModelsApi
        self.moderations: ModerationsApi
        self.realtime: RealtimeApi
        self.responses: ResponsesApi
        self.threads: ThreadsApi
        self.uploads: UploadsApi
        self.vector_stores: VectorStoresApi
        self.video: VideoApi
        self.videos_vidu: VideosViduApi
        self.images_vidu: ImagesViduApi
        self.videos_volcengine: VideosVolcengineApi

        # Initialize API modules
        self.files_anthropic = FilesAnthropicApi(self._client)
        self.chat_anthropic = ChatAnthropicApi(self._client)
        self.batches_anthropic = BatchesAnthropicApi(self._client)
        self.responses_google = ResponsesGoogleApi(self._client)
        self.files_google = FilesGoogleApi(self._client)
        self.embeddings_google = EmbeddingsGoogleApi(self._client)
        self.chat_google = ChatGoogleApi(self._client)
        self.videos_kling = VideosKlingApi(self._client)
        self.images_midjourney = ImagesMidjourneyApi(self._client)
        self.images_nano_banana = ImagesNanoBananaApi(self._client)
        self.audio_suno = AudioSunoApi(self._client)
        self.assistants = AssistantsApi(self._client)
        self.audio = AudioApi(self._client)
        self.batches = BatchesApi(self._client)
        self.chat = ChatApi(self._client)
        self.completion = CompletionApi(self._client)
        self.container = ContainerApi(self._client)
        self.conversation = ConversationApi(self._client)
        self.embeddings = EmbeddingsApi(self._client)
        self.files = FilesApi(self._client)
        self.images = ImagesApi(self._client)
        self.models = ModelsApi(self._client)
        self.moderations = ModerationsApi(self._client)
        self.realtime = RealtimeApi(self._client)
        self.responses = ResponsesApi(self._client)
        self.threads = ThreadsApi(self._client)
        self.uploads = UploadsApi(self._client)
        self.vector_stores = VectorStoresApi(self._client)
        self.video = VideoApi(self._client)
        self.videos_vidu = VideosViduApi(self._client)
        self.images_vidu = ImagesViduApi(self._client)
        self.videos_volcengine = VideosVolcengineApi(self._client)

    def set_api_key(self, api_key: str) -> 'SdkworkAiClient':
        """Set API key for authentication."""
        self._client.set_api_key(api_key)
        return self

    def set_auth_token(self, token: str) -> 'SdkworkAiClient':
        """Set auth token for authentication."""
        self._client.set_auth_token(token)
        return self

    def set_access_token(self, token: str) -> 'SdkworkAiClient':
        """Set access token for authentication."""
        self._client.set_access_token(token)
        return self

    def set_header(self, key: str, value: str) -> 'SdkworkAiClient':
        """Set custom header."""
        self._client.set_header(key, value)
        return self

    @property
    def http(self) -> HttpClient:
        """Get the underlying HTTP client."""
        return self._client


def create_client(config: SdkConfig) -> SdkworkAiClient:
    """Create a new SDK client instance."""
    return SdkworkAiClient(config)

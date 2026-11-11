from .http_client import HttpClient, SdkConfig
from .api.images_alibaba import ImagesAlibabaApi
from .api.videos_alibaba import VideosAlibabaApi
from .api.audio_alibaba import AudioAlibabaApi
from .api.files_anthropic import FilesAnthropicApi
from .api.chat_anthropic import ChatAnthropicApi
from .api.batches_anthropic import BatchesAnthropicApi
from .api.videos_black_forest_labs import VideosBlackForestLabsApi
from .api.images_black_forest_labs import ImagesBlackForestLabsApi
from .api.videos_bytedance import VideosBytedanceApi
from .api.images_bytedance import ImagesBytedanceApi
from .api.audio_bytedance import AudioBytedanceApi
from .api.music_elevenlabs import MusicElevenlabsApi
from .api.audio_elevenlabs import AudioElevenlabsApi
from .api.responses_google import ResponsesGoogleApi
from .api.files_google import FilesGoogleApi
from .api.videos_google import VideosGoogleApi
from .api.embeddings_google import EmbeddingsGoogleApi
from .api.chat_google import ChatGoogleApi
from .api.images_google import ImagesGoogleApi
from .api.videos_jimeng import VideosJimengApi
from .api.audio_kling import AudioKlingApi
from .api.images_kling import ImagesKlingApi
from .api.videos_kling import VideosKlingApi
from .api.videos_luma_ai import VideosLumaAiApi
from .api.videos_minimax import VideosMinimaxApi
from .api.images_minimax import ImagesMinimaxApi
from .api.music_minimax import MusicMinimaxApi
from .api.audio_minimax import AudioMinimaxApi
from .api.music_mureka import MusicMurekaApi
from .api.videos_pixverse import VideosPixverseApi
from .api.videos_runway import VideosRunwayApi
from .api.images_runway import ImagesRunwayApi
from .api.audio_stability_ai import AudioStabilityAiApi
from .api.images_stability_ai import ImagesStabilityAiApi
from .api.music_suno import MusicSunoApi
from .api.chat_typesafe import ChatTypesafeApi
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
from .api.tool import ToolApi
from .api.uploads import UploadsApi
from .api.vector_stores import VectorStoresApi
from .api.video import VideoApi
from .api.videos_vidu import VideosViduApi
from .api.images_vidu import ImagesViduApi
from .api.audio_vidu import AudioViduApi
from .api.audio_volcengine import AudioVolcengineApi
from .api.videos_volcengine import VideosVolcengineApi
from .api.images_volcengine import ImagesVolcengineApi
from .api.images_xai import ImagesXaiApi
from .api.videos_xai import VideosXaiApi
from .api.videos_zhipu import VideosZhipuApi
from .api.images_zhipu import ImagesZhipuApi


class SdkworkAiClient:
    """cloudrouter-open-sdk SDK Client."""

    def __init__(self, config: SdkConfig):
        self._client = HttpClient(config)
        self.images_alibaba: ImagesAlibabaApi
        self.videos_alibaba: VideosAlibabaApi
        self.audio_alibaba: AudioAlibabaApi
        self.files_anthropic: FilesAnthropicApi
        self.chat_anthropic: ChatAnthropicApi
        self.batches_anthropic: BatchesAnthropicApi
        self.videos_black_forest_labs: VideosBlackForestLabsApi
        self.images_black_forest_labs: ImagesBlackForestLabsApi
        self.videos_bytedance: VideosBytedanceApi
        self.images_bytedance: ImagesBytedanceApi
        self.audio_bytedance: AudioBytedanceApi
        self.music_elevenlabs: MusicElevenlabsApi
        self.audio_elevenlabs: AudioElevenlabsApi
        self.responses_google: ResponsesGoogleApi
        self.files_google: FilesGoogleApi
        self.videos_google: VideosGoogleApi
        self.embeddings_google: EmbeddingsGoogleApi
        self.chat_google: ChatGoogleApi
        self.images_google: ImagesGoogleApi
        self.videos_jimeng: VideosJimengApi
        self.audio_kling: AudioKlingApi
        self.images_kling: ImagesKlingApi
        self.videos_kling: VideosKlingApi
        self.videos_luma_ai: VideosLumaAiApi
        self.videos_minimax: VideosMinimaxApi
        self.images_minimax: ImagesMinimaxApi
        self.music_minimax: MusicMinimaxApi
        self.audio_minimax: AudioMinimaxApi
        self.music_mureka: MusicMurekaApi
        self.videos_pixverse: VideosPixverseApi
        self.videos_runway: VideosRunwayApi
        self.images_runway: ImagesRunwayApi
        self.audio_stability_ai: AudioStabilityAiApi
        self.images_stability_ai: ImagesStabilityAiApi
        self.music_suno: MusicSunoApi
        self.chat_typesafe: ChatTypesafeApi
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
        self.tool: ToolApi
        self.uploads: UploadsApi
        self.vector_stores: VectorStoresApi
        self.video: VideoApi
        self.videos_vidu: VideosViduApi
        self.images_vidu: ImagesViduApi
        self.audio_vidu: AudioViduApi
        self.audio_volcengine: AudioVolcengineApi
        self.videos_volcengine: VideosVolcengineApi
        self.images_volcengine: ImagesVolcengineApi
        self.images_xai: ImagesXaiApi
        self.videos_xai: VideosXaiApi
        self.videos_zhipu: VideosZhipuApi
        self.images_zhipu: ImagesZhipuApi

        # Initialize API modules
        self.images_alibaba = ImagesAlibabaApi(self._client)
        self.videos_alibaba = VideosAlibabaApi(self._client)
        self.audio_alibaba = AudioAlibabaApi(self._client)
        self.files_anthropic = FilesAnthropicApi(self._client)
        self.chat_anthropic = ChatAnthropicApi(self._client)
        self.batches_anthropic = BatchesAnthropicApi(self._client)
        self.videos_black_forest_labs = VideosBlackForestLabsApi(self._client)
        self.images_black_forest_labs = ImagesBlackForestLabsApi(self._client)
        self.videos_bytedance = VideosBytedanceApi(self._client)
        self.images_bytedance = ImagesBytedanceApi(self._client)
        self.audio_bytedance = AudioBytedanceApi(self._client)
        self.music_elevenlabs = MusicElevenlabsApi(self._client)
        self.audio_elevenlabs = AudioElevenlabsApi(self._client)
        self.responses_google = ResponsesGoogleApi(self._client)
        self.files_google = FilesGoogleApi(self._client)
        self.videos_google = VideosGoogleApi(self._client)
        self.embeddings_google = EmbeddingsGoogleApi(self._client)
        self.chat_google = ChatGoogleApi(self._client)
        self.images_google = ImagesGoogleApi(self._client)
        self.videos_jimeng = VideosJimengApi(self._client)
        self.audio_kling = AudioKlingApi(self._client)
        self.images_kling = ImagesKlingApi(self._client)
        self.videos_kling = VideosKlingApi(self._client)
        self.videos_luma_ai = VideosLumaAiApi(self._client)
        self.videos_minimax = VideosMinimaxApi(self._client)
        self.images_minimax = ImagesMinimaxApi(self._client)
        self.music_minimax = MusicMinimaxApi(self._client)
        self.audio_minimax = AudioMinimaxApi(self._client)
        self.music_mureka = MusicMurekaApi(self._client)
        self.videos_pixverse = VideosPixverseApi(self._client)
        self.videos_runway = VideosRunwayApi(self._client)
        self.images_runway = ImagesRunwayApi(self._client)
        self.audio_stability_ai = AudioStabilityAiApi(self._client)
        self.images_stability_ai = ImagesStabilityAiApi(self._client)
        self.music_suno = MusicSunoApi(self._client)
        self.chat_typesafe = ChatTypesafeApi(self._client)
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
        self.tool = ToolApi(self._client)
        self.uploads = UploadsApi(self._client)
        self.vector_stores = VectorStoresApi(self._client)
        self.video = VideoApi(self._client)
        self.videos_vidu = VideosViduApi(self._client)
        self.images_vidu = ImagesViduApi(self._client)
        self.audio_vidu = AudioViduApi(self._client)
        self.audio_volcengine = AudioVolcengineApi(self._client)
        self.videos_volcengine = VideosVolcengineApi(self._client)
        self.images_volcengine = ImagesVolcengineApi(self._client)
        self.images_xai = ImagesXaiApi(self._client)
        self.videos_xai = VideosXaiApi(self._client)
        self.videos_zhipu = VideosZhipuApi(self._client)
        self.images_zhipu = ImagesZhipuApi(self._client)

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

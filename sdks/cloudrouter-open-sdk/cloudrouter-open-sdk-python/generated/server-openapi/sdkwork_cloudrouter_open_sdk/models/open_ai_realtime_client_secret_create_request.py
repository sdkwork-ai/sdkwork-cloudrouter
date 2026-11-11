from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiRealtimeClientSecretCreateRequest:
    """OpenAI-compatible request to create an ephemeral realtime client secret (`POST /v1/realtime/client_secrets`)."""
    expires_after: Optional[Dict[str, str]] = None
    session: Optional[Dict[str, str]] = None

from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiRealtimeClientSecretValue:
    """Ephemeral realtime client secret value."""
    value: str
    expires_at: Optional[int] = None

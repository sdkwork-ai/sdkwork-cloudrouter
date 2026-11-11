from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class BytedanceSpeechChunk:
    """One streamed Seed TTS frame. The vendor answers NDJSON frames carrying base64 `data`; the final frame has `code` 20000000."""
    code: Optional[int] = None
    data: Optional[str] = None
    message: Optional[str] = None
    sequence: Optional[int] = None

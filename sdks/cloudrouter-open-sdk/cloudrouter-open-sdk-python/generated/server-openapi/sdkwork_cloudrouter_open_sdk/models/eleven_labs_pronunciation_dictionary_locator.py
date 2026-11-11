from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class ElevenLabsPronunciationDictionaryLocator:
    """ElevenLabs pronunciation dictionary version locator."""
    pronunciation_dictionary_id: str
    version_id: Optional[str] = None

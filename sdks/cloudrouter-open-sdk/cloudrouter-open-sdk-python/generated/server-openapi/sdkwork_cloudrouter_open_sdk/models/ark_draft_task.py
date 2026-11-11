from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class ArkDraftTask:
    """Ark draft video task reference used to promote a preview video into a final video."""
    id: str

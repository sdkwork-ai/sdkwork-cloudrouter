from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiFineTuningCheckpointPermission:
    """OpenAI-compatible fine-tuning checkpoint permission object."""
    created_at: int
    id: str
    object: str
    project_id: str

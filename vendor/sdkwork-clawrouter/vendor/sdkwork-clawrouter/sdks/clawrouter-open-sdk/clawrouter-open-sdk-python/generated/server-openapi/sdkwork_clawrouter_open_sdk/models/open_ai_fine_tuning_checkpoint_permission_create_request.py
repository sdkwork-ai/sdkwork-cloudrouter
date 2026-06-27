from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiFineTuningCheckpointPermissionCreateRequest:
    """OpenAI-compatible request to create a fine-tuning checkpoint permission."""
    project_id: str

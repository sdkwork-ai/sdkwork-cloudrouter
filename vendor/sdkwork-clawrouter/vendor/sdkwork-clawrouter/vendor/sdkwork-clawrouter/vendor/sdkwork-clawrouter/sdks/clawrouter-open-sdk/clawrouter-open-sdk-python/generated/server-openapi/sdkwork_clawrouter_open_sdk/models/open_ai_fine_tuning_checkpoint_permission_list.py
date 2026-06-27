from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_fine_tuning_checkpoint_permission import OpenAiFineTuningCheckpointPermission


@dataclass
class OpenAiFineTuningCheckpointPermissionList:
    """OpenAI-compatible paginated list of fine-tuning checkpoint permissions."""
    data: List[OpenAiFineTuningCheckpointPermission]
    object: str
    first_id: Optional[str] = None
    has_more: Optional[bool] = None
    last_id: Optional[str] = None

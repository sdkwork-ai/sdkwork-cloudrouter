from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiProjectGroupCreateRequest:
    """OpenAI-compatible request to add a group to a project."""
    group_id: str

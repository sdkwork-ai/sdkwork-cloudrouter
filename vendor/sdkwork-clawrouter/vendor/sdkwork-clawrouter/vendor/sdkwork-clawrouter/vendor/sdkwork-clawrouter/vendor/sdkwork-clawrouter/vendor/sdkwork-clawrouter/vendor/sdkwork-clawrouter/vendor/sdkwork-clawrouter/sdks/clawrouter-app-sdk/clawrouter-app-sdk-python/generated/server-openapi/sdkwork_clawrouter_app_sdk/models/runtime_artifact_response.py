from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .runtime_artifact_item import RuntimeArtifactItem


@dataclass
class RuntimeArtifactResponse:
    """Runtime artifact response schema exposed by Claw Router."""
    item: RuntimeArtifactItem

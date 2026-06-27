from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .runtime_artifact_list_response import RuntimeArtifactListResponse


@dataclass
class ArtifactsListResult:
    """Artifacts list result schema exposed by Claw Router."""
    code: str
    data: Optional[RuntimeArtifactListResponse] = None
    msg: Optional[str] = None

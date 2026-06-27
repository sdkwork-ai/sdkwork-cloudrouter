from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_model_catalog_sync_response import AdminModelCatalogSyncResponse


@dataclass
class ModelsRefreshResult:
    """Models refresh result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminModelCatalogSyncResponse] = None
    msg: Optional[str] = None

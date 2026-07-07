from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .model_catalog_page import ModelCatalogPage


@dataclass
class ModelRankingsStatusRetrieveResult:
    """Model rankings status retrieve result schema exposed by Claw Router."""
    code: int
    data: Any
    trace_id: str

from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class PageInfo:
    mode: str
    has_more: Optional[bool] = None
    next_cursor: Optional[str] = None
    page: Optional[int] = None
    page_size: Optional[int] = None
    total_items: Optional[str] = None
    total_pages: Optional[int] = None

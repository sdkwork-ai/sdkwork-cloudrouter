from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .media_resource import MediaResource


@dataclass
class AdminSiteItem:
    """Admin site item schema exposed by Claw Router."""
    base_url: str
    display_name: str
    environment: str
    health_status: str
    id: str
    site_code: str
    site_name: str
    site_type: str
    status: str
    consecutive_error_count: Optional[str] = None
    description: Optional[str] = None
    docs_url: Optional[str] = None
    domains: Optional[List[str]] = None
    last_checked_at: Optional[str] = None
    last_latency_ms: Optional[str] = None
    last_sync_at: Optional[str] = None
    logo: Optional[MediaResource] = None
    owner_kind: Optional[str] = None
    region_code: Optional[str] = None
    sort_order: Optional[str] = None
    vendor_codes: Optional[List[str]] = None
    website_url: Optional[str] = None

"""
Enum definitions and table name constants for the Disaster Management System.
With Supabase, we don't need SQLAlchemy ORM models — tables are managed
via the Supabase Dashboard (SQL Editor / Table Editor).
"""

import enum


# ─── Enums ───────────────────────────────────────────────────
class UserRole(str, enum.Enum):
    ADMIN = "admin"
    RESPONDER = "responder"
    CITIZEN = "citizen"


class AlertSeverity(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ResourceStatus(str, enum.Enum):
    AVAILABLE = "available"
    DEPLOYED = "deployed"
    MAINTENANCE = "maintenance"
    UNAVAILABLE = "unavailable"


class DisasterType(str, enum.Enum):
    EARTHQUAKE = "earthquake"
    FLOOD = "flood"
    HURRICANE = "hurricane"
    WILDFIRE = "wildfire"
    TSUNAMI = "tsunami"
    TORNADO = "tornado"
    VOLCANIC = "volcanic"
    LANDSLIDE = "landslide"
    DROUGHT = "drought"
    OTHER = "other"


# ─── Table Names ─────────────────────────────────────────────
USERS_TABLE = "users"
ALERTS_TABLE = "alerts"
RESOURCES_TABLE = "resources"
DISASTER_ZONES_TABLE = "disaster_zones"
DISASTER_EVENTS_TABLE = "disaster_events"

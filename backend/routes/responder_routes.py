"""
Responder Emergency Dispatch System
Full AI-powered mission control for the Responder role.
"""
from __future__ import annotations

import random
import threading
import time
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/responder", tags=["Responder"])

# ── In-Memory Storage ───────────────────────────────────────────────────────

_missions: list[dict] = []
_comm_logs: list[dict] = []
_responder_location: dict = {"latitude": 0.0, "longitude": 0.0}
_resources: dict = {
    "total_ambulances": 10,
    "available_ambulances": 7,
    "fuel_level_percentage": 82,
    "medical_kits_available": 45,
    "team_members": 12,
    "helicopters_available": 2,
    "vehicles_deployed": 3,
}
_mission_id_counter = 0
_simulation_running = False


def _next_mission_id() -> int:
    global _mission_id_counter
    _mission_id_counter += 1
    return _mission_id_counter


_DISASTER_TYPES = ["earthquake", "flood", "wildfire", "hurricane", "landslide", "tsunami"]
_LOCATIONS = [
    ("Downtown District", 34.052, -118.243),
    ("North Harbor", 34.070, -118.280),
    ("Industrial Zone", 34.033, -118.200),
    ("Riverside Park", 34.060, -118.260),
    ("Airport Corridor", 33.942, -118.408),
    ("Mountain Pass", 34.150, -118.100),
    ("Coastal Village", 33.990, -118.450),
    ("East Side", 34.030, -118.150),
]
_SEVERITIES = ["Low", "Medium", "High", "Critical"]


def _seed_initial_missions():
    """Add 3 seed missions on startup."""
    for i, (name, lat, lon) in enumerate(_LOCATIONS[:3]):
        _missions.append(
            {
                "id": _next_mission_id(),
                "disaster_type": _DISASTER_TYPES[i],
                "location_name": name,
                "latitude": lat,
                "longitude": lon,
                "severity": _SEVERITIES[i + 1],
                "status": ["Pending", "En Route", "Arrived"][i],
                "assigned_responder": "Unit Alpha",
                "created_at": datetime.now(tz=timezone.utc).isoformat(),
                "notes": "",
            }
        )


_seed_initial_missions()


def _auto_mission_simulator():
    """Background thread: create a random mission every 60 seconds."""
    global _simulation_running
    _simulation_running = True
    while _simulation_running:
        time.sleep(60)
        loc = random.choice(_LOCATIONS)
        mission = {
            "id": _next_mission_id(),
            "disaster_type": random.choice(_DISASTER_TYPES),
            "location_name": loc[0],
            "latitude": loc[1],
            "longitude": loc[2],
            "severity": random.choice(_SEVERITIES),
            "status": "Pending",
            "assigned_responder": random.choice(
                ["Unit Alpha", "Unit Bravo", "Unit Charlie", "Unit Delta"]
            ),
            "created_at": datetime.now(tz=timezone.utc).isoformat(),
            "notes": "Auto-dispatched by system",
        }
        _missions.append(mission)


# Start background simulation thread
_sim_thread = threading.Thread(target=_auto_mission_simulator, daemon=True)
_sim_thread.start()


# ── Pydantic Models ─────────────────────────────────────────────────────────

class MissionStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None


class MissionAssign(BaseModel):
    disaster_type: str
    location_name: str
    latitude: float
    longitude: float
    severity: str
    assigned_responder: str = "Unit Alpha"


class CommunicationUpdate(BaseModel):
    mission_id: int
    status: str
    message: str


class LocationUpdate(BaseModel):
    latitude: float
    longitude: float


# ── Endpoints ───────────────────────────────────────────────────────────────


@router.get("/missions")
async def get_missions():
    """Return all active missions."""
    return {"missions": _missions, "total": len(_missions)}


@router.put("/missions/{mission_id}")
async def update_mission(mission_id: int, update: MissionStatusUpdate):
    """Update status of a mission."""
    valid_statuses = {"Pending", "En Route", "Arrived", "Completed"}
    if update.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Choose from: {valid_statuses}")
    for m in _missions:
        if m["id"] == mission_id:
            m["status"] = update.status
            if update.notes:
                m["notes"] = update.notes
            return m
    raise HTTPException(status_code=404, detail="Mission not found")


@router.post("/missions/assign", status_code=201)
async def assign_mission(mission: MissionAssign):
    """Assign a new disaster mission to a responder."""
    new_mission = {
        "id": _next_mission_id(),
        "disaster_type": mission.disaster_type,
        "location_name": mission.location_name,
        "latitude": mission.latitude,
        "longitude": mission.longitude,
        "severity": mission.severity,
        "status": "Pending",
        "assigned_responder": mission.assigned_responder,
        "created_at": datetime.now(tz=timezone.utc).isoformat(),
        "notes": "",
    }
    _missions.append(new_mission)
    return new_mission


@router.get("/ai-recommendation")
async def ai_recommendation(
    severity: str = "Medium",
    lat: float = 0.0,
    lon: float = 0.0,
):
    """Return AI-powered resource recommendation for a given severity."""
    from services.disaster_ai import recommend_resources, find_nearest_hospital

    resources = recommend_resources(severity)
    hospital = find_nearest_hospital(lat, lon) if (lat and lon) else None

    risk_messages = {
        "critical": "🔴 CRITICAL EMERGENCY — Deploy maximum resources. Activate mutual aid agreements.",
        "high": "🟠 HIGH ALERT — Significant response required. Pre-position additional units.",
        "medium": "🟡 ELEVATED RISK — Moderate response needed. Monitor situation closely.",
        "low": "🟢 LOW RISK — Minimal deployment. Maintain standby readiness.",
    }
    risk_message = risk_messages.get(severity.lower(), risk_messages["medium"])

    return {
        "ambulances_needed": resources["ambulances"],
        "rescue_teams": resources["rescue_teams"],
        "helicopters": resources.get("helicopters", 0),
        "medical_kits": resources.get("medical_kits", 10),
        "nearest_hospital": hospital,
        "risk_message": risk_message,
    }


@router.get("/resources")
async def get_resources():
    """Return current resource status."""
    return _resources


@router.post("/location")
async def update_location(loc: LocationUpdate):
    """Update responder's current coordinates."""
    _responder_location["latitude"] = loc.latitude
    _responder_location["longitude"] = loc.longitude
    return {"status": "updated", **_responder_location}


@router.get("/location")
async def get_location():
    """Return responder's current coordinates."""
    return _responder_location


@router.post("/update")
async def post_communication_update(update: CommunicationUpdate):
    """Post a communication status update for a mission."""
    log = {
        "id": len(_comm_logs) + 1,
        "mission_id": update.mission_id,
        "status": update.status,
        "message": update.message,
        "timestamp": datetime.now(tz=timezone.utc).isoformat(),
    }
    _comm_logs.append(log)
    # Also update mission status if found
    for m in _missions:
        if m["id"] == update.mission_id:
            m["status"] = update.status
    return log


@router.get("/logs")
async def get_communication_logs():
    """Return communication history."""
    return {"logs": list(reversed(_comm_logs)), "total": len(_comm_logs)}

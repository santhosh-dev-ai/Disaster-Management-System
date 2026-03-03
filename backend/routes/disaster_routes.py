from fastapi import APIRouter, Depends, HTTPException, Query
from database import SupabaseClient, get_supabase
from models import DISASTER_ZONES_TABLE, DISASTER_EVENTS_TABLE
from schemas import (
    DisasterZoneCreate, DisasterZoneResponse,
    DisasterEventCreate, DisasterEventResponse,
    PredictionRequest, PredictionResponse
)
from auth import get_current_user
from typing import Optional

router = APIRouter(prefix="/api/disasters", tags=["Disasters"])


# ─── Disaster Zones ─────────────────────────────────────────
@router.get("/zones", response_model=list[DisasterZoneResponse])
async def get_disaster_zones(
    is_active: Optional[bool] = Query(None),
    disaster_type: Optional[str] = Query(None),
    sb: SupabaseClient = Depends(get_supabase),
):
    """Get all disaster risk zones."""
    query = sb.table(DISASTER_ZONES_TABLE).select("*")
    if is_active is not None:
        query = query.eq("is_active", is_active)
    if disaster_type:
        query = query.eq("disaster_type", disaster_type)

    response = query.execute()
    return [DisasterZoneResponse(**z) for z in response.data]


@router.post("/zones", response_model=DisasterZoneResponse, status_code=201)
async def create_disaster_zone(
    zone_data: DisasterZoneCreate,
    sb: SupabaseClient = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Create a disaster risk zone (Admin only)."""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    new_zone_data = {
        "name": zone_data.name,
        "disaster_type": zone_data.disaster_type.value,
        "risk_level": zone_data.risk_level,
        "latitude": zone_data.latitude,
        "longitude": zone_data.longitude,
        "radius_km": zone_data.radius_km,
        "population_affected": zone_data.population_affected,
        "description": zone_data.description,
        "is_active": True,
    }
    response = sb.table(DISASTER_ZONES_TABLE).insert(new_zone_data).execute()

    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to create disaster zone")

    return DisasterZoneResponse(**response.data[0])


# ─── Disaster Events ────────────────────────────────────────
@router.get("/events", response_model=list[DisasterEventResponse])
async def get_disaster_events(
    event_type: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    sb: SupabaseClient = Depends(get_supabase),
):
    """Get disaster events from the database."""
    query = sb.table(DISASTER_EVENTS_TABLE).select("*")
    if event_type:
        query = query.eq("event_type", event_type)

    response = query.order("created_at", desc=True).limit(limit).execute()
    return [DisasterEventResponse(**e) for e in response.data]


@router.post("/events", response_model=DisasterEventResponse, status_code=201)
async def create_disaster_event(
    event_data: DisasterEventCreate,
    sb: SupabaseClient = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Log a disaster event."""
    if current_user.get("role") not in ["admin", "responder"]:
        raise HTTPException(status_code=403, detail="Access denied")

    new_event_data = {
        "event_type": event_data.event_type.value,
        "title": event_data.title,
        "description": event_data.description,
        "latitude": event_data.latitude,
        "longitude": event_data.longitude,
        "magnitude": event_data.magnitude,
        "affected_area_km2": event_data.affected_area_km2,
        "casualties": event_data.casualties or 0,
        "injuries": event_data.injuries or 0,
        "displaced": event_data.displaced or 0,
        "economic_damage_usd": event_data.economic_damage_usd or 0,
        "source": event_data.source,
        "data": event_data.data,
        "created_by": current_user["id"],
    }
    response = sb.table(DISASTER_EVENTS_TABLE).insert(new_event_data).execute()

    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to create disaster event")

    return DisasterEventResponse(**response.data[0])


# ─── AI Prediction ──────────────────────────────────────────
@router.post("/predict", response_model=PredictionResponse)
async def predict_risk(request: PredictionRequest):
    """AI-based disaster risk prediction for a location."""
    from services.ai_prediction import predict_disaster_risk
    prediction = predict_disaster_risk(
        request.latitude,
        request.longitude,
        request.disaster_type.value if request.disaster_type else None
    )
    return prediction


@router.get("/stats")
async def get_disaster_stats(sb: SupabaseClient = Depends(get_supabase)):
    """Get overall disaster statistics."""
    # Get zone counts
    all_zones = sb.table(DISASTER_ZONES_TABLE).select("id, is_active, risk_level").execute()
    zones_data = all_zones.data or []

    total_zones = len(zones_data)
    active_zones = len([z for z in zones_data if z.get("is_active")])
    high_risk_zones = len([z for z in zones_data if (z.get("risk_level") or 0) >= 0.7])

    # Get event count
    all_events = sb.table(DISASTER_EVENTS_TABLE).select("id", count="exact").execute()
    total_events = all_events.count if all_events.count is not None else len(all_events.data or [])

    return {
        "total_zones": total_zones,
        "active_zones": active_zones,
        "high_risk_zones": high_risk_zones,
        "total_events": total_events,
    }

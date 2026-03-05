from fastapi import APIRouter, Depends, HTTPException, status, Query
from database import SupabaseClient, get_supabase
from models import ALERTS_TABLE
from schemas import AlertCreate, AlertUpdate, AlertResponse
from auth import get_current_user, require_admin
from typing import Optional

router = APIRouter(prefix="/api/alerts", tags=["Alerts"])


@router.get("/", response_model=list[AlertResponse])
async def get_alerts(
    is_active: Optional[bool] = Query(None),
    severity: Optional[str] = Query(None),
    disaster_type: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    sb: SupabaseClient = Depends(get_supabase),
):
    """Get all alerts with optional filters."""
    query = sb.table(ALERTS_TABLE).select("*")

    if is_active is not None:
        query = query.eq("is_active", is_active)
    if severity:
        query = query.eq("severity", severity)
    if disaster_type:
        query = query.eq("disaster_type", disaster_type)

    query = query.order("created_at", desc=True).range(offset, offset + limit - 1)
    response = query.execute()

    return [AlertResponse(**a) for a in response.data]


@router.get("/{alert_id}", response_model=AlertResponse)
async def get_alert(alert_id: int, sb: SupabaseClient = Depends(get_supabase)):
    """Get a specific alert."""
    response = sb.table(ALERTS_TABLE).select("*").eq("id", alert_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Alert not found")
    return AlertResponse(**response.data[0])


@router.post("/", response_model=AlertResponse, status_code=status.HTTP_201_CREATED)
async def create_alert(
    alert_data: AlertCreate,
    sb: SupabaseClient = Depends(get_supabase),
    current_admin: dict = Depends(require_admin),
):
    """Create a new alert (Admin only)."""
    new_alert_data = {
        "title": alert_data.title,
        "description": alert_data.description,
        "disaster_type": alert_data.disaster_type.value,
        "severity": alert_data.severity.value,
        "latitude": alert_data.latitude,
        "longitude": alert_data.longitude,
        "radius_km": alert_data.radius_km,
        "location_name": alert_data.location_name,
        "created_by": None,  # admin table id — not a FK to users
        "is_active": True,
    }
    if alert_data.expires_at:
        new_alert_data["expires_at"] = alert_data.expires_at.isoformat()

    response = sb.table(ALERTS_TABLE).insert(new_alert_data).execute()

    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to create alert")

    return AlertResponse(**response.data[0])


@router.put("/{alert_id}", response_model=AlertResponse)
async def update_alert(
    alert_id: int,
    alert_data: AlertUpdate,
    sb: SupabaseClient = Depends(get_supabase),
    _admin: dict = Depends(require_admin),
):
    """Update an alert (Admin only)."""
    # Check alert exists
    existing = sb.table(ALERTS_TABLE).select("id").eq("id", alert_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Alert not found")

    update_data = alert_data.model_dump(exclude_unset=True)
    # Convert enum values to strings
    for key, value in update_data.items():
        if hasattr(value, 'value'):
            update_data[key] = value.value

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    response = sb.table(ALERTS_TABLE).update(update_data).eq("id", alert_id).execute()
    return AlertResponse(**response.data[0])


@router.delete("/{alert_id}")
async def delete_alert(
    alert_id: int,
    sb: SupabaseClient = Depends(get_supabase),
    _admin: dict = Depends(require_admin),
):
    """Delete an alert (Admin only)."""
    existing = sb.table(ALERTS_TABLE).select("id").eq("id", alert_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Alert not found")

    sb.table(ALERTS_TABLE).delete().eq("id", alert_id).execute()
    return {"message": "Alert deleted successfully"}

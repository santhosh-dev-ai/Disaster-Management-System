from fastapi import APIRouter, Depends, HTTPException, status, Query
from database import SupabaseClient, get_supabase
from models import RESOURCES_TABLE
from schemas import ResourceCreate, ResourceUpdate, ResourceResponse
from auth import get_current_user, require_admin
from typing import Optional

router = APIRouter(prefix="/api/resources", tags=["Resources"])


@router.get("/", response_model=list[ResourceResponse])
async def get_resources(
    status_filter: Optional[str] = Query(None, alias="status"),
    resource_type: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    sb: SupabaseClient = Depends(get_supabase),
):
    """Get all resources with optional filters."""
    query = sb.table(RESOURCES_TABLE).select("*")
    if status_filter:
        query = query.eq("status", status_filter)
    if resource_type:
        query = query.eq("resource_type", resource_type)

    response = query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
    return [ResourceResponse(**r) for r in response.data]


@router.get("/stats")
async def get_resource_stats(sb: SupabaseClient = Depends(get_supabase)):
    """Get resource statistics."""
    all_resources = sb.table(RESOURCES_TABLE).select("id, status").execute()
    resources_data = all_resources.data or []

    total = len(resources_data)
    available = len([r for r in resources_data if r.get("status") == "available"])
    deployed = len([r for r in resources_data if r.get("status") == "deployed"])
    maintenance = len([r for r in resources_data if r.get("status") == "maintenance"])

    return {
        "total": total,
        "available": available,
        "deployed": deployed,
        "maintenance": maintenance,
        "utilization_rate": round((deployed / total * 100) if total > 0 else 0, 1),
    }


@router.get("/{resource_id}", response_model=ResourceResponse)
async def get_resource(resource_id: int, sb: SupabaseClient = Depends(get_supabase)):
    """Get a specific resource."""
    response = sb.table(RESOURCES_TABLE).select("*").eq("id", resource_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Resource not found")
    return ResourceResponse(**response.data[0])


@router.post("/", response_model=ResourceResponse, status_code=status.HTTP_201_CREATED)
async def create_resource(
    resource_data: ResourceCreate,
    sb: SupabaseClient = Depends(get_supabase),
    _admin: dict = Depends(require_admin),
):
    """Create a new resource (Admin only)."""
    new_resource_data = {
        "name": resource_data.name,
        "resource_type": resource_data.resource_type,
        "description": resource_data.description,
        "quantity": resource_data.quantity,
        "unit": resource_data.unit,
        "status": resource_data.status.value,
        "latitude": resource_data.latitude,
        "longitude": resource_data.longitude,
        "location_name": resource_data.location_name,
    }
    response = sb.table(RESOURCES_TABLE).insert(new_resource_data).execute()

    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to create resource")

    return ResourceResponse(**response.data[0])


@router.put("/{resource_id}", response_model=ResourceResponse)
async def update_resource(
    resource_id: int,
    resource_data: ResourceUpdate,
    sb: SupabaseClient = Depends(get_supabase),
    _admin: dict = Depends(require_admin),
):
    """Update a resource (Admin only)."""
    existing = sb.table(RESOURCES_TABLE).select("id").eq("id", resource_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Resource not found")

    update_data = resource_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if hasattr(value, 'value'):
            update_data[key] = value.value

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    response = sb.table(RESOURCES_TABLE).update(update_data).eq("id", resource_id).execute()
    return ResourceResponse(**response.data[0])


@router.delete("/{resource_id}")
async def delete_resource(
    resource_id: int,
    sb: SupabaseClient = Depends(get_supabase),
    _admin: dict = Depends(require_admin),
):
    """Delete a resource (Admin only)."""
    existing = sb.table(RESOURCES_TABLE).select("id").eq("id", resource_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Resource not found")

    sb.table(RESOURCES_TABLE).delete().eq("id", resource_id).execute()
    return {"message": "Resource deleted successfully"}

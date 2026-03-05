"""
Admin Authentication & Management Routes
─────────────────────────────────────────
Admins are stored in a SEPARATE `admins` table — completely isolated from
the regular `users` table.

Workflow
────────
1.  An admin record is inserted manually via the Supabase SQL editor:

        INSERT INTO admins (email, username, hashed_password)
        VALUES ('you@example.com', 'superadmin',
                '<bcrypt hash from get_password_hash()>');

2.  Admin logs in via  POST /admin/login
    → receives a JWT with  {"sub": "<id>", "type": "admin"}
    → frontend stores it as  localStorage.admin_token

3.  Every admin-only route uses  Depends(require_admin)  which:
      • decodes the JWT
      • verifies  type == "admin"
      • looks up the record in the admins table
      • rejects regular user tokens (even role='admin')
"""

from fastapi import APIRouter, Depends, HTTPException, status
from database import SupabaseClient, get_supabase
from models import USERS_TABLE, ADMINS_TABLE, ALERTS_TABLE, RESOURCES_TABLE
from schemas import AdminLogin, AdminResponse, AdminToken, UserAdminUpdate
from auth import verify_password, get_password_hash, create_access_token, require_admin

router = APIRouter(prefix="/admin", tags=["Admin"])


# ─── Admin Login ─────────────────────────────────────────────────────────────

@router.post("/login", response_model=AdminToken)
async def admin_login(
    credentials: AdminLogin,
    sb: SupabaseClient = Depends(get_supabase),
):
    """
    Authenticate an admin using the admins table ONLY.
    Returns a JWT with type='admin' that unlocks all admin-only endpoints.
    """
    response = sb.table(ADMINS_TABLE).select("*").eq("email", credentials.email).execute()
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    admin = response.data[0]

    if not verify_password(credentials.password, admin["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not admin.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin account is deactivated",
        )

    # Mint a token that carries type='admin' so require_admin() can verify it
    access_token = create_access_token(
        data={"sub": str(admin["id"]), "type": "admin"}
    )

    return AdminToken(
        access_token=access_token,
        token_type="bearer",
        admin=AdminResponse(**admin),
    )


# ─── Admin – Verify self ──────────────────────────────────────────────────────

@router.get("/me", response_model=AdminResponse)
async def get_admin_me(current_admin: dict = Depends(require_admin)):
    """Return the authenticated admin's own record."""
    return AdminResponse(**current_admin)


# ─── Admin – User Management ──────────────────────────────────────────────────

@router.get("/users")
async def list_all_users(
    sb: SupabaseClient = Depends(get_supabase),
    _admin: dict = Depends(require_admin),
):
    """Return every user in the system (Admin only)."""
    response = sb.table(USERS_TABLE).select("*").order("created_at", desc=True).execute()
    # Strip hashed_password before sending to frontend
    return [
        {k: v for k, v in u.items() if k != "hashed_password"}
        for u in response.data
    ]


@router.get("/users/responders")
async def list_responders(
    sb: SupabaseClient = Depends(get_supabase),
    _admin: dict = Depends(require_admin),
):
    """Return all responders (Admin only)."""
    response = (
        sb.table(USERS_TABLE)
        .select("*")
        .eq("role", "responder")
        .order("created_at", desc=True)
        .execute()
    )
    return [
        {k: v for k, v in u.items() if k != "hashed_password"}
        for u in response.data
    ]


@router.put("/users/{user_id}")
async def update_user(
    user_id: int,
    update_data: UserAdminUpdate,
    sb: SupabaseClient = Depends(get_supabase),
    _admin: dict = Depends(require_admin),
):
    """Update a user's role, active status, or name (Admin only)."""
    payload: dict = {}
    if update_data.role is not None:
        # Prevent escalating a user to admin through this endpoint
        if update_data.role.value == "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot assign admin role to regular users. "
                       "Add the account directly to the admins table.",
            )
        payload["role"] = update_data.role.value
    if update_data.is_active is not None:
        payload["is_active"] = update_data.is_active
    if update_data.full_name is not None:
        payload["full_name"] = update_data.full_name

    if not payload:
        raise HTTPException(status_code=400, detail="No fields to update")

    response = sb.table(USERS_TABLE).update(payload).eq("id", user_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="User not found")

    updated = response.data[0]
    return {k: v for k, v in updated.items() if k != "hashed_password"}


@router.delete("/users/{user_id}")
async def deactivate_user(
    user_id: int,
    sb: SupabaseClient = Depends(get_supabase),
    _admin: dict = Depends(require_admin),
):
    """Deactivate (soft-delete) a user (Admin only)."""
    existing = sb.table(USERS_TABLE).select("id").eq("id", user_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="User not found")

    sb.table(USERS_TABLE).update({"is_active": False}).eq("id", user_id).execute()
    return {"message": "User deactivated successfully"}


# ─── Admin – Alert Management ─────────────────────────────────────────────────

@router.get("/alerts")
async def list_alerts(
    sb: SupabaseClient = Depends(get_supabase),
    _admin: dict = Depends(require_admin),
):
    """Return all alerts (Admin only)."""
    response = sb.table(ALERTS_TABLE).select("*").order("created_at", desc=True).execute()
    return response.data


@router.delete("/alerts/{alert_id}")
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


# ─── Admin – Resource Management ─────────────────────────────────────────────

@router.get("/resources")
async def list_resources(
    sb: SupabaseClient = Depends(get_supabase),
    _admin: dict = Depends(require_admin),
):
    """Return all resources (Admin only)."""
    response = (
        sb.table(RESOURCES_TABLE).select("*").order("created_at", desc=True).execute()
    )
    return response.data


@router.delete("/resources/{resource_id}")
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


# ─── Admin – Responder Approval ───────────────────────────────────────────────

@router.post("/responders/{user_id}/approve")
async def approve_responder(
    user_id: int,
    sb: SupabaseClient = Depends(get_supabase),
    _admin: dict = Depends(require_admin),
):
    """Approve / activate a responder account (Admin only)."""
    existing = (
        sb.table(USERS_TABLE)
        .select("id, role, is_active")
        .eq("id", user_id)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="User not found")

    user = existing.data[0]
    if user.get("role") != "responder":
        raise HTTPException(status_code=400, detail="User is not a responder")

    sb.table(USERS_TABLE).update({"is_active": True}).eq("id", user_id).execute()
    return {"message": "Responder approved successfully", "user_id": user_id}


@router.post("/responders/{user_id}/revoke")
async def revoke_responder(
    user_id: int,
    sb: SupabaseClient = Depends(get_supabase),
    _admin: dict = Depends(require_admin),
):
    """Revoke / deactivate a responder account (Admin only)."""
    existing = (
        sb.table(USERS_TABLE)
        .select("id, role")
        .eq("id", user_id)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="User not found")

    if existing.data[0].get("role") != "responder":
        raise HTTPException(status_code=400, detail="User is not a responder")

    sb.table(USERS_TABLE).update({"is_active": False}).eq("id", user_id).execute()
    return {"message": "Responder access revoked", "user_id": user_id}

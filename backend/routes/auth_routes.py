from fastapi import APIRouter, Depends, HTTPException, status
from database import SupabaseClient, get_supabase
from models import USERS_TABLE
from schemas import UserRegister, UserLogin, UserResponse, Token, UserUpdate, UserAdminUpdate
from auth import (
    verify_password, get_password_hash, create_access_token, get_current_user,
    supabase_sign_up, supabase_sign_in, EmailNotConfirmedError, require_admin,
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister, sb: SupabaseClient = Depends(get_supabase)):
    """Register a new user. Returns pending_verification when email confirmation is required."""
    # Block admin role creation through public registration
    if user_data.role.value == "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin accounts cannot be created through registration. "
                   "Contact your system administrator.",
        )

    # Check if email already exists
    existing = sb.table(USERS_TABLE).select("id").eq("email", user_data.email).execute()
    if existing.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Check if username exists
    existing_username = sb.table(USERS_TABLE).select("id").eq("username", user_data.username).execute()
    if existing_username.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )

    # Attempt to create in Supabase Auth (sends confirmation email)
    auth_result = supabase_sign_up(user_data.email, user_data.password)
    email_pending = bool(
        auth_result.get("confirmation_sent_at")
        and not auth_result.get("email_confirmed_at")
    )

    # Insert into our users table
    new_user_data = {
        "email": user_data.email,
        "username": user_data.username,
        "full_name": user_data.full_name,
        "hashed_password": get_password_hash(user_data.password),
        "role": user_data.role.value,
        "phone": user_data.phone,
        "location": user_data.location,
        "latitude": user_data.latitude,
        "longitude": user_data.longitude,
        "is_active": True,
    }
    response = sb.table(USERS_TABLE).insert(new_user_data).execute()

    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to create user")

    new_user = response.data[0]

    # If Supabase sent a confirmation email, tell the frontend to wait
    if email_pending:
        return {"status": "pending_verification", "email": user_data.email}

    # Otherwise (fallback / email already confirmed) return a token immediately
    access_token = create_access_token(data={"sub": new_user["id"], "role": new_user["role"]})
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(**new_user)
    )


@router.post("/login", response_model=Token)
async def login(user_data: UserLogin, sb: SupabaseClient = Depends(get_supabase)):
    """Login and get JWT token."""
    response = sb.table(USERS_TABLE).select("*").eq("email", user_data.email).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = response.data[0]

    if not verify_password(user_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )

    # Check email confirmation via Supabase Auth (best-effort — don't fail on unavailability)
    try:
        supabase_sign_in(user_data.email, user_data.password)
    except EmailNotConfirmedError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Please verify your email before logging in. Check your inbox.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception:
        # Supabase Auth unavailable or user not in Supabase Auth — local auth already verified above
        pass

    access_token = create_access_token(data={"sub": user["id"], "role": user["role"]})

    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(**user)
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user profile."""
    return UserResponse(**current_user)


@router.get("/users", response_model=list[UserResponse])
async def get_all_users(
    sb: SupabaseClient = Depends(get_supabase),
    _admin: dict = Depends(require_admin),
):
    """Get all users (Admin only)."""
    response = sb.table(USERS_TABLE).select("*").execute()
    return [UserResponse(**u) for u in response.data]


@router.put("/me", response_model=UserResponse)
async def update_me(
    update_data: UserUpdate,
    sb: SupabaseClient = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Update current user's profile. Optionally change password."""
    payload: dict = {}

    if update_data.full_name is not None:
        payload["full_name"] = update_data.full_name
    if update_data.phone is not None:
        payload["phone"] = update_data.phone
    if update_data.location is not None:
        payload["location"] = update_data.location
    if update_data.latitude is not None:
        payload["latitude"] = update_data.latitude
    if update_data.longitude is not None:
        payload["longitude"] = update_data.longitude

    # Password change
    if update_data.new_password:
        if not update_data.current_password:
            raise HTTPException(status_code=400, detail="Current password is required to set a new password")
        if not verify_password(update_data.current_password, current_user["hashed_password"]):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        payload["hashed_password"] = get_password_hash(update_data.new_password)

    if not payload:
        raise HTTPException(status_code=400, detail="No fields to update")

    response = sb.table(USERS_TABLE).update(payload).eq("id", current_user["id"]).execute()
    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to update profile")

    return UserResponse(**response.data[0])


@router.put("/users/{user_id}", response_model=UserResponse)
async def admin_update_user(
    user_id: int,
    update_data: UserAdminUpdate,
    sb: SupabaseClient = Depends(get_supabase),
    _admin: dict = Depends(require_admin),
):
    """Update a user's role or active status (Admin only)."""
    payload: dict = {}
    if update_data.role is not None:
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

    return UserResponse(**response.data[0])

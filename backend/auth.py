from datetime import datetime, timedelta
from typing import Optional

import httpx
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from database import SupabaseClient, get_supabase
from models import USERS_TABLE, ADMINS_TABLE
from config import get_settings

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
admin_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/admin/login")

_SUPABASE_AUTH = settings.SUPABASE_URL.rstrip("/") + "/auth/v1" if settings.SUPABASE_URL else ""
_ANON_HDR = {
    "apikey": settings.SUPABASE_KEY or "",
    "Content-Type": "application/json",
}


# ── Custom Exceptions ────────────────────────────────────────────────────────

class EmailNotConfirmedError(Exception):
    """Raised when a user tries to log in before confirming their email."""
    pass


# ── Supabase Auth helpers ────────────────────────────────────────────────────

def supabase_sign_up(email: str, password: str) -> dict:
    """
    Create a new user in Supabase Auth (sends confirmation email).
    Returns dict with id, email, email_confirmed_at, confirmation_sent_at.
    Returns empty dict if Supabase Auth is not configured or rate-limited.
    """
    if not _SUPABASE_AUTH:
        return {}
    try:
        res = httpx.post(
            f"{_SUPABASE_AUTH}/signup",
            json={"email": email, "password": password},
            headers=_ANON_HDR,
            timeout=10,
        )
        data = res.json()
        # 429 = rate limited, treat as unavailable (proceed with local auth)
        if res.status_code == 429:
            return {}
        if res.status_code not in (200, 201):
            msg = (
                data.get("msg")
                or data.get("error_description")
                or data.get("message")
                or "Sign-up failed"
            )
            raise HTTPException(status_code=400, detail=msg)
        user_obj = data.get("user") or data
        return {
            "id": user_obj.get("id"),
            "email": user_obj.get("email"),
            "email_confirmed_at": user_obj.get("email_confirmed_at"),
            "confirmation_sent_at": user_obj.get("confirmation_sent_at")
                                    or data.get("confirmation_sent_at"),
        }
    except HTTPException:
        raise
    except Exception:
        return {}


def supabase_sign_in(email: str, password: str) -> dict:
    """
    Verify credentials against Supabase Auth.
    Raises EmailNotConfirmedError if email is unconfirmed.
    Raises HTTPException on bad credentials.
    Returns session dict (we still mint our own JWT for the app).
    """
    if not _SUPABASE_AUTH:
        return {}
    try:
        res = httpx.post(
            f"{_SUPABASE_AUTH}/token?grant_type=password",
            json={"email": email, "password": password},
            headers=_ANON_HDR,
            timeout=10,
        )
        data = res.json()
        if res.status_code != 200:
            # 429 = rate limited, treat as unavailable (let local auth proceed)
            if res.status_code == 429:
                return {}
            err_code = data.get("error_code") or data.get("error") or ""
            msg = str(data.get("msg") or data.get("message", "")).lower()
            if err_code == "email_not_confirmed" or "not confirmed" in msg or "not confirm" in msg:
                raise EmailNotConfirmedError("Please confirm your email before logging in.")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return data
    except (HTTPException, EmailNotConfirmedError):
        raise
    except Exception:
        return {}


# ── Standard helpers ─────────────────────────────────────────────────────────

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    sb: SupabaseClient = Depends(get_supabase),
) -> dict:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    response = sb.table(USERS_TABLE).select("*").eq("id", user_id).execute()
    if not response.data:
        raise credentials_exception

    return response.data[0]


def require_role(*roles):
    """Dependency to require specific roles."""
    async def role_checker(current_user: dict = Depends(get_current_user)):
        allowed = [r.value if hasattr(r, 'value') else r for r in roles]
        if current_user.get("role") not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {', '.join(str(r) for r in roles)}"
            )
        return current_user
    return role_checker


async def require_admin(
    token: str = Depends(admin_oauth2_scheme),
    sb: SupabaseClient = Depends(get_supabase),
) -> dict:
    """
    FastAPI dependency that validates an admin JWT token.

    Admin tokens carry ``{"sub": str(admin_id), "type": "admin"}`` in the
    payload.  The admin must exist and be active in the ``admins`` table.
    Regular user tokens (even with role='admin') are rejected.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Admin authentication required",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        admin_id: str | None = payload.get("sub")
        token_type: str | None = payload.get("type")
        if admin_id is None or token_type != "admin":
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    response = sb.table(ADMINS_TABLE).select("*").eq("id", int(admin_id)).execute()
    if not response.data:
        raise credentials_exception

    admin = response.data[0]
    if not admin.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin account is deactivated",
        )
    return admin

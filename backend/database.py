"""
Supabase database client module with in-memory fallback.
Uses httpx to interact with the Supabase PostgREST API directly.
Falls back to in-memory storage when Supabase is unavailable.
"""

import httpx
from typing import Optional, Any
from datetime import datetime, timezone
from config import get_settings

settings = get_settings()

# ── In-Memory Fallback Store ────────────────────────────────
_USE_FALLBACK = False
_memory_store: dict[str, list[dict[str, Any]]] = {}
_auto_ids: dict[str, int] = {}


def _check_supabase_available() -> bool:
    """Check if Supabase is properly configured and tables exist."""
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        return False
    if settings.SUPABASE_URL.startswith("your_") or settings.SUPABASE_KEY.startswith("your_"):
        return False
    try:
        # Try to query the users table to verify it actually exists
        base = settings.SUPABASE_URL.rstrip("/")
        headers = {
            "apikey": settings.SUPABASE_KEY,
            "Authorization": f"Bearer {settings.SUPABASE_KEY}",
        }
        resp = httpx.get(
            f"{base}/rest/v1/users?select=id&limit=1",
            headers=headers,
            timeout=5,
        )
        # 200 = table exists; 404 or other = doesn't
        return resp.status_code == 200
    except Exception:
        return False


# Check on module load
_USE_FALLBACK = not _check_supabase_available()

if _USE_FALLBACK:
    import warnings
    warnings.warn(
        "\n⚠️  Supabase is not available. Using IN-MEMORY fallback database.\n"
        "   Data will be lost on server restart.\n"
        "   Default login: admin@disastermgmt.com / admin123\n"
        "   Other users:   responder@disastermgmt.com / responder123\n"
        "                  citizen@disastermgmt.com / citizen123"
    )

_BASE_URL = settings.SUPABASE_URL.rstrip("/") if settings.SUPABASE_URL else ""
_REST_URL = f"{_BASE_URL}/rest/v1"
_HEADERS = {
    "apikey": settings.SUPABASE_KEY or "",
    "Authorization": f"Bearer {settings.SUPABASE_KEY or ''}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}


def _next_id(table: str) -> int:
    """Get next auto-increment ID for a table."""
    _auto_ids.setdefault(table, 0)
    _auto_ids[table] += 1
    return _auto_ids[table]


def _matches_filters(row: dict[str, Any], params: dict[str, str]) -> bool:
    """Check if a row matches all PostgREST-style filters."""
    for col, filter_str in params.items():
        if col in ("select", "order", "limit", "offset"):
            continue
        dot_idx = filter_str.index(".")
        op = filter_str[:dot_idx]
        val = filter_str[dot_idx + 1:]
        row_val = row.get(col)

        if op == "eq":
            if isinstance(row_val, bool):
                expected = val.lower() in ("true", "1")
                if row_val != expected:
                    return False
            elif isinstance(row_val, int):
                try:
                    if row_val != int(val):
                        return False
                except (ValueError, TypeError):
                    if str(row_val) != val:
                        return False
            elif isinstance(row_val, float):
                try:
                    if row_val != float(val):
                        return False
                except (ValueError, TypeError):
                    if str(row_val) != val:
                        return False
            else:
                if str(row_val) != val:
                    return False
        elif op == "neq":
            if str(row_val) == val:
                return False
        elif op == "gt":
            try:
                if not (float(row_val) > float(val)):  # type: ignore[arg-type]
                    return False
            except (ValueError, TypeError):
                return False
        elif op == "gte":
            try:
                if not (float(row_val) >= float(val)):  # type: ignore[arg-type]
                    return False
            except (ValueError, TypeError):
                return False
        elif op == "lt":
            try:
                if not (float(row_val) < float(val)):  # type: ignore[arg-type]
                    return False
            except (ValueError, TypeError):
                return False
        elif op == "lte":
            try:
                if not (float(row_val) <= float(val)):  # type: ignore[arg-type]
                    return False
            except (ValueError, TypeError):
                return False
        elif op == "is":
            if val == "null" and row_val is not None:
                return False
            if val == "true" and row_val is not True:
                return False
            if val == "false" and row_val is not False:
                return False
        elif op == "in":
            vals = val.strip("()").split(",")
            if str(row_val) not in vals:
                return False
        elif op == "like":
            pattern = val.replace("%", "")
            if pattern not in str(row_val or ""):
                return False
        elif op == "ilike":
            pattern = val.replace("%", "").lower()
            if pattern not in str(row_val or "").lower():
                return False

    return True


class SupabaseTable:
    """Lightweight query builder for a single Supabase/PostgREST table."""

    def __init__(self, table_name: str):
        self._table = table_name
        self._url = f"{_REST_URL}/{table_name}"
        self._params: dict[str, str] = {}
        self._headers: dict[str, str] = dict(_HEADERS)
        self._order_clauses: list[str] = []
        self._limit_val: Optional[int] = None
        self._offset_val: Optional[int] = None
        self._range_start: Optional[int] = None
        self._range_end: Optional[int] = None
        self._select_cols: str = "*"
        self._count_mode: Optional[str] = None
        self._insert_data: Optional[list[dict[str, Any]]] = None
        self._update_data: Optional[dict[str, Any]] = None
        self._delete_flag: bool = False

    # ── Column selection ────────────────────────────
    def select(self, columns: str = "*", *, count: Optional[str] = None) -> "SupabaseTable":
        self._select_cols = columns
        if count:
            self._count_mode = count
        return self

    # ── Filters ─────────────────────────────────────
    def eq(self, column: str, value: Any) -> "SupabaseTable":
        self._params[column] = f"eq.{value}"
        return self

    def neq(self, column: str, value: Any) -> "SupabaseTable":
        self._params[column] = f"neq.{value}"
        return self

    def gt(self, column: str, value: Any) -> "SupabaseTable":
        self._params[column] = f"gt.{value}"
        return self

    def gte(self, column: str, value: Any) -> "SupabaseTable":
        self._params[column] = f"gte.{value}"
        return self

    def lt(self, column: str, value: Any) -> "SupabaseTable":
        self._params[column] = f"lt.{value}"
        return self

    def lte(self, column: str, value: Any) -> "SupabaseTable":
        self._params[column] = f"lte.{value}"
        return self

    def like(self, column: str, pattern: str) -> "SupabaseTable":
        self._params[column] = f"like.{pattern}"
        return self

    def ilike(self, column: str, pattern: str) -> "SupabaseTable":
        self._params[column] = f"ilike.{pattern}"
        return self

    def is_(self, column: str, value: Any) -> "SupabaseTable":
        self._params[column] = f"is.{value}"
        return self

    def in_(self, column: str, values: list) -> "SupabaseTable":  # type: ignore[type-arg]
        formatted = ",".join(str(v) for v in values)
        self._params[column] = f"in.({formatted})"
        return self

    # ── Ordering ────────────────────────────────────
    def order(self, column: str, *, desc: bool = False) -> "SupabaseTable":
        direction = "desc" if desc else "asc"
        self._order_clauses.append(f"{column}.{direction}")
        return self

    # ── Pagination ──────────────────────────────────
    def limit(self, count: int) -> "SupabaseTable":
        self._limit_val = count
        return self

    def offset(self, count: int) -> "SupabaseTable":
        self._offset_val = count
        return self

    def range(self, start: int, end: int) -> "SupabaseTable":
        self._range_start = start
        self._range_end = end
        return self

    # ── Deferred mutation methods ───────────────────
    def insert(self, data: dict | list[dict]) -> "SupabaseTable":  # type: ignore[type-arg]
        """Stage data for insertion. Call .execute() to run."""
        if isinstance(data, dict):
            data = [data]
        self._insert_data = data
        return self

    def update(self, data: dict) -> "SupabaseTable":  # type: ignore[type-arg]
        """Stage data for update. Call .execute() to run."""
        self._update_data = data
        return self

    def delete(self) -> "SupabaseTable":
        """Stage a delete operation. Call .execute() to run."""
        self._delete_flag = True
        return self

    # ── Build params ────────────────────────────────
    def _build_params(self) -> dict[str, str]:
        params = dict(self._params)
        params["select"] = self._select_cols
        if self._order_clauses:
            params["order"] = ",".join(self._order_clauses)
        if self._limit_val is not None:
            params["limit"] = str(self._limit_val)
        if self._offset_val is not None:
            params["offset"] = str(self._offset_val)
        return params

    def _build_headers(self) -> dict[str, str]:
        headers = dict(self._headers)
        prefer_parts = ["return=representation"]
        if self._count_mode:
            prefer_parts.append(f"count={self._count_mode}")
        headers["Prefer"] = ", ".join(prefer_parts)
        if self._range_start is not None and self._range_end is not None:
            headers["Range"] = f"{self._range_start}-{self._range_end}"
        return headers

    # ── Execute ─────────────────────────────────────
    def execute(self) -> "SupabaseResponse":
        """Execute the staged query or mutation."""
        if _USE_FALLBACK:
            return self._execute_in_memory()
        return self._execute_supabase()

    def _execute_supabase(self) -> "SupabaseResponse":
        """Execute against real Supabase."""
        headers = self._build_headers()

        if self._insert_data is not None:
            resp = httpx.post(self._url, json=self._insert_data, headers=headers, timeout=30)
            resp.raise_for_status()
            return SupabaseResponse(data=resp.json())

        if self._update_data is not None:
            params = dict(self._params)
            params["select"] = self._select_cols
            resp = httpx.patch(self._url, json=self._update_data, params=params, headers=headers, timeout=30)
            resp.raise_for_status()
            return SupabaseResponse(data=resp.json())

        if self._delete_flag:
            params = dict(self._params)
            resp = httpx.delete(self._url, params=params, headers=headers, timeout=30)
            resp.raise_for_status()
            result = resp.json() if resp.content else []
            return SupabaseResponse(data=result)

        # SELECT
        params = self._build_params()
        resp = httpx.get(self._url, params=params, headers=headers, timeout=30)
        resp.raise_for_status()
        count = _parse_content_range_count(resp)
        return SupabaseResponse(data=resp.json(), count=count)

    def _execute_in_memory(self) -> "SupabaseResponse":
        """Execute against the in-memory store."""
        table_data = _memory_store.get(self._table, [])

        if self._insert_data is not None:
            results = []
            for row in self._insert_data:
                new_row = dict(row)
                if "id" not in new_row:
                    new_row["id"] = _next_id(self._table)
                else:
                    # Keep auto_id in sync
                    _auto_ids[self._table] = max(
                        _auto_ids.get(self._table, 0), new_row["id"]
                    )
                if "created_at" not in new_row:
                    new_row["created_at"] = datetime.now(timezone.utc).isoformat()
                _memory_store.setdefault(self._table, []).append(new_row)
                results.append(dict(new_row))
            return SupabaseResponse(data=results)

        if self._update_data is not None:
            results = []
            for row in table_data:
                if _matches_filters(row, self._params):
                    row.update(self._update_data)
                    results.append(dict(row))
            return SupabaseResponse(data=results)

        if self._delete_flag:
            remaining = []
            deleted = []
            for row in table_data:
                if _matches_filters(row, self._params):
                    deleted.append(dict(row))
                else:
                    remaining.append(row)
            _memory_store[self._table] = remaining
            return SupabaseResponse(data=deleted)

        # SELECT
        results = [dict(row) for row in table_data if _matches_filters(row, self._params)]

        # Filter columns
        if self._select_cols != "*":
            cols = [c.strip() for c in self._select_cols.split(",")]
            results = [{k: r.get(k) for k in cols if k in r} for r in results]

        # Order
        if self._order_clauses:
            for clause in reversed(self._order_clauses):
                parts = clause.split(".")
                col = parts[0]
                is_desc = len(parts) > 1 and parts[1] == "desc"
                results.sort(
                    key=lambda x, c=col: (x.get(c) is None, x.get(c, "")),  # type: ignore[misc]
                    reverse=is_desc,
                )

        total_count = len(results) if self._count_mode else None

        # Range
        if self._range_start is not None and self._range_end is not None:
            results = results[self._range_start: self._range_end + 1]

        # Limit/Offset
        if self._offset_val is not None:
            results = results[self._offset_val:]
        if self._limit_val is not None:
            results = results[: self._limit_val]

        return SupabaseResponse(data=results, count=total_count)


class SupabaseResponse:
    """Simple response wrapper matching the supabase-py API shape."""

    def __init__(self, data: list[dict] | None = None, count: Optional[int] = None):  # type: ignore[type-arg]
        self.data = data or []
        self.count = count


class SupabaseClient:
    """Lightweight Supabase client that wraps PostgREST via httpx."""

    def __init__(self, url: str, key: str):
        self.url = url
        self.key = key

    def table(self, table_name: str) -> SupabaseTable:
        return SupabaseTable(table_name)


def _parse_content_range_count(resp: httpx.Response) -> Optional[int]:
    """Parse the total count from Content-Range header if present."""
    cr = resp.headers.get("content-range", "")
    if "/" in cr:
        total = cr.split("/")[-1]
        if total != "*":
            try:
                return int(total)
            except ValueError:
                pass
    return None


def is_fallback_mode() -> bool:
    """Check if we're using the in-memory fallback."""
    return _USE_FALLBACK


# ── Global instance ─────────────────────────────────────────
supabase = SupabaseClient(settings.SUPABASE_URL, settings.SUPABASE_KEY)


def get_supabase() -> SupabaseClient:
    """FastAPI dependency that returns the Supabase client."""
    return supabase

"""Geocoding endpoints using Nominatim (OpenStreetMap) — no API key needed."""
from fastapi import APIRouter, Query
import httpx

router = APIRouter(prefix="/api/geo", tags=["Geocoding"])

_NOMINATIM = "https://nominatim.openstreetmap.org"
_HEADERS = {"User-Agent": "DisasterGuardAI/1.0 (disaster-management-system)"}


@router.get("/search")
async def geocode_search(q: str = Query(..., min_length=2, description="City or location name")):
    """Search for a location by name and return lat/lon candidates."""
    try:
        with httpx.Client(timeout=8) as client:
            res = client.get(
                f"{_NOMINATIM}/search",
                params={"q": q, "format": "json", "limit": 6, "addressdetails": 1},
                headers=_HEADERS,
            )
            res.raise_for_status()
        results = []
        for d in res.json():
            addr = d.get("address", {})
            short = (
                addr.get("city")
                or addr.get("town")
                or addr.get("village")
                or addr.get("county")
                or d.get("display_name", "").split(",")[0]
            )
            country = addr.get("country", "")
            results.append(
                {
                    "name": f"{short}, {country}" if country else short,
                    "display_name": d.get("display_name", ""),
                    "latitude": float(d["lat"]),
                    "longitude": float(d["lon"]),
                    "type": d.get("type", ""),
                }
            )
        return results
    except Exception:
        return []


@router.get("/reverse")
async def reverse_geocode(
    lat: float = Query(...),
    lon: float = Query(...),
):
    """Reverse geocode coordinates to a human-readable location name."""
    try:
        with httpx.Client(timeout=8) as client:
            res = client.get(
                f"{_NOMINATIM}/reverse",
                params={"lat": lat, "lon": lon, "format": "json"},
                headers=_HEADERS,
            )
            res.raise_for_status()
        data = res.json()
        addr = data.get("address", {})
        city = (
            addr.get("city")
            or addr.get("town")
            or addr.get("village")
            or addr.get("county")
            or "Unknown"
        )
        country = addr.get("country", "")
        return {
            "name": f"{city}, {country}" if country else city,
            "display_name": data.get("display_name", ""),
            "latitude": lat,
            "longitude": lon,
        }
    except Exception:
        return {"name": f"{lat:.3f}, {lon:.3f}", "latitude": lat, "longitude": lon}


@router.get("/hotspots")
async def get_live_hotspots():
    """
    Return currently active seismic hotspots from the live USGS feed.
    These replace static preset locations in the prediction UI.
    """
    from services.disaster_ai import fetch_earthquakes
    quakes = fetch_earthquakes(min_magnitude=4.5)
    # Top 8 by magnitude
    top = sorted(quakes, key=lambda q: q["magnitude"], reverse=True)[:8]
    seen: set[str] = set()
    hotspots = []
    for q in top:
        place = q["location"]
        # Extract city part from USGS place string like "12km N of CityName"
        if " of " in place:
            city = place.split(" of ")[-1].strip()
        else:
            city = place.split(",")[0].strip()
        if city in seen:
            continue
        seen.add(city)
        hotspots.append(
            {
                "name": city,
                "latitude": q["coordinates"][0],
                "longitude": q["coordinates"][1],
                "magnitude": q["magnitude"],
                "severity": q["severity"],
            }
        )
    return hotspots

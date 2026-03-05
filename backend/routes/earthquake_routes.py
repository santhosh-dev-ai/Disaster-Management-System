"""Real-time earthquake data from USGS + AI severity classification."""
from fastapi import APIRouter, Query
from services.disaster_ai import fetch_earthquakes, predict_24h_risk, recommend_resources

router = APIRouter(prefix="/api/earthquakes", tags=["Earthquakes"])


@router.get("")
async def get_earthquakes(
    min_magnitude: float = Query(2.5, ge=0, le=10, description="Minimum magnitude filter"),
):
    """
    Real-time earthquake feed from USGS (past 24 hours).
    Each event includes AI-predicted severity.
    """
    quakes = fetch_earthquakes(min_magnitude=min_magnitude)
    mags = [q["magnitude"] for q in quakes]
    risk_24h = predict_24h_risk(mags)

    # Severity breakdown
    breakdown: dict[str, int] = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
    for q in quakes:
        sev = q.get("severity", "Low")
        breakdown[sev] = breakdown.get(sev, 0) + 1

    return {
        "count": len(quakes),
        "risk_next_24h": risk_24h,
        "severity_breakdown": breakdown,
        "earthquakes": quakes,
    }


@router.get("/severity")
async def get_severity_recommendation(
    magnitude: float = Query(..., ge=0, le=10),
    population_density: float = Query(1000, ge=0),
    lat: float = Query(0),
    lon: float = Query(0),
):
    """Get AI resource recommendation for a given earthquake magnitude."""
    from services.disaster_ai import predict_severity, find_nearest_hospital
    severity = predict_severity(magnitude=magnitude, population_density=population_density)
    resources = recommend_resources(severity, population_density)
    hospital = find_nearest_hospital(lat, lon) if lat and lon else None
    return {
        "severity": severity,
        "resources": resources,
        "nearest_hospital": hospital,
    }

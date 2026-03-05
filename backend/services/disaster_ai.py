"""
Disaster AI Service
- USGS real-time earthquake fetching
- RandomForest severity classification
- Haversine distance + nearest hospital
- Resource recommendation engine
- 24-hour risk time-series predictor
"""

from __future__ import annotations

import os
import random
from datetime import datetime, timezone
from math import asin, cos, radians, sin, sqrt
from typing import Optional

import httpx
import numpy as np

# ── Severity Classifier (RandomForest) ─────────────────────────────────────

try:
    from sklearn.ensemble import RandomForestClassifier
    import joblib

    _MODEL_PATH = os.path.join(os.path.dirname(__file__), "severity_model.joblib")

    def _train_model() -> "RandomForestClassifier":
        np.random.seed(42)
        n = 3000
        magnitude = np.random.uniform(0, 10, n)
        rainfall = np.random.uniform(0, 500, n)
        wind_speed = np.random.uniform(0, 200, n)
        pop_density = np.random.uniform(0, 20000, n)

        X = np.column_stack([magnitude, rainfall, wind_speed, pop_density])

        labels = []
        for mag, rain, wind, pop in zip(magnitude, rainfall, wind_speed, pop_density):
            score = (
                (mag / 10) * 0.45
                + (rain / 500) * 0.2
                + (wind / 200) * 0.2
                + (pop / 20000) * 0.15
            )
            if score >= 0.7:
                labels.append("Critical")
            elif score >= 0.5:
                labels.append("High")
            elif score >= 0.28:
                labels.append("Medium")
            else:
                labels.append("Low")

        clf = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
        clf.fit(X, labels)
        joblib.dump(clf, _MODEL_PATH)
        return clf

    def _load_model() -> "RandomForestClassifier":
        if os.path.exists(_MODEL_PATH):
            try:
                return joblib.load(_MODEL_PATH)
            except Exception:
                pass
        return _train_model()

    _clf = _load_model()

    def predict_severity(
        magnitude: float = 0.0,
        rainfall: float = 0.0,
        wind_speed: float = 0.0,
        population_density: float = 1000.0,
    ) -> str:
        X = np.array([[magnitude, rainfall, wind_speed, population_density]])
        return str(_clf.predict(X)[0])

except ImportError:
    def predict_severity(
        magnitude: float = 0.0,
        rainfall: float = 0.0,
        wind_speed: float = 0.0,
        population_density: float = 1000.0,
    ) -> str:
        score = (
            (magnitude / 10) * 0.45
            + (rainfall / 500) * 0.2
            + (wind_speed / 200) * 0.2
            + (population_density / 20000) * 0.15
        )
        if score >= 0.7:
            return "Critical"
        if score >= 0.5:
            return "High"
        if score >= 0.28:
            return "Medium"
        return "Low"


# ── USGS Earthquake Fetcher ─────────────────────────────────────────────────

USGS_URL = (
    "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson"
)


def fetch_earthquakes(min_magnitude: float = 2.5) -> list[dict]:
    """Fetch real-time earthquakes from USGS (past 24 hours)."""
    try:
        with httpx.Client(timeout=12) as client:
            res = client.get(USGS_URL)
            res.raise_for_status()
        features = res.json().get("features", [])
        results: list[dict] = []
        for f in features:
            props = f.get("properties", {})
            coords = f.get("geometry", {}).get("coordinates", [None, None, None])
            mag = props.get("mag")
            if mag is None or mag < min_magnitude:
                continue
            lon, lat = coords[0], coords[1]
            if lat is None or lon is None:
                continue
            time_ms = props.get("time") or 0
            time_str = datetime.fromtimestamp(
                time_ms / 1000, tz=timezone.utc
            ).isoformat()
            severity = predict_severity(magnitude=float(mag), population_density=500)
            results.append(
                {
                    "type": "earthquake",
                    "magnitude": round(float(mag), 1),
                    "location": props.get("place", "Unknown location"),
                    "severity": severity,
                    "time": time_str,
                    "coordinates": [float(lat), float(lon)],
                    "url": props.get("url", ""),
                }
            )
        return results
    except Exception:
        return []


# ── Haversine Distance ──────────────────────────────────────────────────────

HOSPITALS = [
    {"name": "Regional Medical Center", "lat": 34.052, "lon": -118.243},
    {"name": "Pacific Coast Hospital", "lat": 37.774, "lon": -122.419},
    {"name": "Metro General Hospital", "lat": 40.712, "lon": -74.006},
    {"name": "Mumbai Central Hospital", "lat": 19.076, "lon": 72.877},
    {"name": "Tokyo Emergency Medical", "lat": 35.676, "lon": 139.650},
    {"name": "Southeast Relief Hospital", "lat": 25.761, "lon": -80.191},
    {"name": "Istanbul Medical Center", "lat": 41.008, "lon": 28.978},
    {"name": "Sydney District Hospital", "lat": -33.868, "lon": 151.209},
    {"name": "Manila General Hospital", "lat": 14.599, "lon": 120.984},
    {"name": "Dhaka Civil Hospital", "lat": 23.810, "lon": 90.412},
]


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate great-circle distance in km."""
    R = 6371.0
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    return 2 * R * asin(sqrt(max(0, a)))


def find_nearest_hospital(lat: float, lon: float) -> dict:
    best = min(HOSPITALS, key=lambda h: haversine(lat, lon, h["lat"], h["lon"]))
    dist = haversine(lat, lon, best["lat"], best["lon"])
    return {"name": best["name"], "distance_km": round(dist, 1)}


# ── Resource Recommendation ─────────────────────────────────────────────────

def recommend_resources(severity: str, population_density: float = 1000) -> dict:
    s = severity.lower()
    if s == "critical":
        return {
            "ambulances": 10,
            "rescue_teams": 5,
            "helicopters": 3,
            "medical_kits": 100,
            "message": "CRITICAL — Deploy all available resources immediately.",
        }
    if s == "high":
        return {
            "ambulances": 6,
            "rescue_teams": 3,
            "helicopters": 2,
            "medical_kits": 60,
            "message": "HIGH — Large-scale emergency response required.",
        }
    if s == "medium":
        return {
            "ambulances": 3,
            "rescue_teams": 1,
            "helicopters": 1,
            "medical_kits": 30,
            "message": "MEDIUM — Moderate response. Monitor for escalation.",
        }
    return {
        "ambulances": 1,
        "rescue_teams": 0,
        "helicopters": 0,
        "medical_kits": 10,
        "message": "LOW — Minimal resources needed. Stay alert.",
    }


# ── Time-Series Risk Prediction ─────────────────────────────────────────────

def predict_24h_risk(recent_magnitudes: list[float]) -> str:
    """Predict risk level for next 24h based on recent seismic activity."""
    if not recent_magnitudes:
        return "Low"
    avg = sum(recent_magnitudes) / len(recent_magnitudes)
    max_m = max(recent_magnitudes)
    score = (avg / 10) * 0.35 + (max_m / 10) * 0.65
    if score >= 0.6:
        return "Critical"
    if score >= 0.45:
        return "High"
    if score >= 0.28:
        return "Medium"
    return "Low"

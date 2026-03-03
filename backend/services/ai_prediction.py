"""
AI Disaster Risk Prediction Service

Uses a combination of geographic features, historical data patterns,
and environmental factors to predict disaster risk for a given location.
"""

import numpy as np
import random
from typing import Optional, Dict, List
from schemas import PredictionResponse


# ─── Simulated Geographic Risk Data ─────────────────────────
# Real production system would use trained ML models + real-time data feeds
KNOWN_RISK_ZONES = [
    {"lat": 28.6139, "lon": 77.2090, "type": "flood", "base_risk": 0.7, "name": "Delhi"},
    {"lat": 19.0760, "lon": 72.8777, "type": "flood", "base_risk": 0.8, "name": "Mumbai"},
    {"lat": 13.0827, "lon": 80.2707, "type": "hurricane", "base_risk": 0.65, "name": "Chennai"},
    {"lat": 22.5726, "lon": 88.3639, "type": "flood", "base_risk": 0.75, "name": "Kolkata"},
    {"lat": 34.0522, "lon": -118.2437, "type": "earthquake", "base_risk": 0.8, "name": "Los Angeles"},
    {"lat": 35.6762, "lon": 139.6503, "type": "earthquake", "base_risk": 0.85, "name": "Tokyo"},
    {"lat": 37.7749, "lon": -122.4194, "type": "earthquake", "base_risk": 0.75, "name": "San Francisco"},
    {"lat": 25.7617, "lon": -80.1918, "type": "hurricane", "base_risk": 0.8, "name": "Miami"},
    {"lat": 29.7604, "lon": -95.3698, "type": "flood", "base_risk": 0.7, "name": "Houston"},
    {"lat": -33.8688, "lon": 151.2093, "type": "wildfire", "base_risk": 0.6, "name": "Sydney"},
    {"lat": 14.5995, "lon": 120.9842, "type": "hurricane", "base_risk": 0.85, "name": "Manila"},
    {"lat": 23.8103, "lon": 90.4125, "type": "flood", "base_risk": 0.9, "name": "Dhaka"},
    {"lat": 36.2048, "lon": 138.2529, "type": "earthquake", "base_risk": 0.8, "name": "Japan Central"},
    {"lat": -6.2088, "lon": 106.8456, "type": "flood", "base_risk": 0.75, "name": "Jakarta"},
    {"lat": 41.0082, "lon": 28.9784, "type": "earthquake", "base_risk": 0.7, "name": "Istanbul"},
]

DISASTER_FACTORS: Dict[str, Dict] = {
    "earthquake": {
        "contributing_factors": [
            "Tectonic plate boundary proximity",
            "Historical seismic activity",
            "Soil liquefaction potential",
            "Fault line density",
            "Underground water table level",
            "Building density and age",
        ],
        "recommendations": [
            "Ensure earthquake-resistant building codes are followed",
            "Prepare emergency evacuation routes",
            "Stock emergency supplies (72-hour kit)",
            "Secure heavy furniture and appliances",
            "Conduct regular earthquake drills",
            "Register for early warning systems",
        ],
    },
    "flood": {
        "contributing_factors": [
            "Proximity to river systems",
            "Coastal flood zone designation",
            "Average annual rainfall",
            "Drainage infrastructure capacity",
            "Elevation and topography",
            "Urbanization and impervious surfaces",
        ],
        "recommendations": [
            "Install flood barriers and sandbags",
            "Elevate critical infrastructure",
            "Maintain clear drainage systems",
            "Subscribe to flood warning alerts",
            "Review flood insurance coverage",
            "Plan evacuation to higher ground",
        ],
    },
    "hurricane": {
        "contributing_factors": [
            "Coastal exposure",
            "Sea surface temperature",
            "Historical hurricane tracks",
            "Wind corridor patterns",
            "Storm surge vulnerability",
            "Barrier island protection",
        ],
        "recommendations": [
            "Install hurricane shutters",
            "Reinforce roof connections",
            "Create hurricane emergency plan",
            "Stock at least 7 days of supplies",
            "Know your evacuation zone and route",
            "Consider backup power generation",
        ],
    },
    "wildfire": {
        "contributing_factors": [
            "Vegetation density and type",
            "Drought conditions",
            "Wind patterns",
            "Temperature extremes",
            "Terrain slope",
            "Human activity in fire-prone areas",
        ],
        "recommendations": [
            "Create defensible space around structures",
            "Use fire-resistant building materials",
            "Maintain clear evacuation routes",
            "Monitor fire weather warnings",
            "Have a 'go bag' ready",
            "Install ember-resistant vents",
        ],
    },
    "tsunami": {
        "contributing_factors": [
            "Coastal proximity",
            "Submarine earthquake potential",
            "Ocean depth profile",
            "Coastal elevation",
            "Historical tsunami records",
            "Offshore geological features",
        ],
        "recommendations": [
            "Know tsunami evacuation routes to high ground",
            "Recognize natural warning signs",
            "Register for tsunami warning systems",
            "Practice evacuation drills",
            "Avoid building in tsunami inundation zones",
            "Prepare emergency communication plan",
        ],
    },
    "tornado": {
        "contributing_factors": [
            "Tornado Alley proximity",
            "Atmospheric instability patterns",
            "Wind shear conditions",
            "Historical tornado frequency",
            "Terrain features",
            "Seasonal storm patterns",
        ],
        "recommendations": [
            "Identify safe shelter locations",
            "Install weather radio",
            "Reinforce safe rooms",
            "Monitor severe weather alerts",
            "Practice tornado drills",
            "Secure mobile homes",
        ],
    },
}


def _calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate approximate distance between two points in km."""
    R = 6371  # Earth radius in km
    dlat = np.radians(lat2 - lat1)
    dlon = np.radians(lon2 - lon1)
    a = (np.sin(dlat / 2) ** 2 +
         np.cos(np.radians(lat1)) * np.cos(np.radians(lat2)) * np.sin(dlon / 2) ** 2)
    c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1 - a))
    return R * c


def _get_risk_level_label(score: float) -> str:
    """Convert numeric risk score to label."""
    if score >= 0.8:
        return "Critical"
    elif score >= 0.6:
        return "High"
    elif score >= 0.4:
        return "Medium"
    elif score >= 0.2:
        return "Low"
    else:
        return "Minimal"


def predict_disaster_risk(
    latitude: float,
    longitude: float,
    disaster_type: Optional[str] = None
) -> PredictionResponse:
    """
    Predict disaster risk for a given location.
    
    In a production system, this would use trained ML models (Random Forest, 
    Neural Networks, etc.) with real-time sensor data, weather APIs, 
    seismic monitoring, and historical event databases.
    
    This implementation uses distance-based risk calculation with known 
    risk zones as a demonstration of the prediction API interface.
    """
    # Find nearest known risk zones
    min_distance = float('inf')
    nearest_zone = None
    nearby_risks = []

    for zone in KNOWN_RISK_ZONES:
        dist = _calculate_distance(latitude, longitude, zone["lat"], zone["lon"])
        if dist < min_distance:
            min_distance = dist
            nearest_zone = zone
        if dist < 500:  # Within 500km
            nearby_risks.append({"zone": zone, "distance": dist})

    # Determine disaster type
    if disaster_type:
        selected_type = disaster_type
    elif nearest_zone:
        selected_type = nearest_zone["type"]
    else:
        selected_type = random.choice(list(DISASTER_FACTORS.keys()))

    # Calculate risk score based on proximity to known risk zones
    base_risk = 0.15  # Minimum baseline risk

    for risk in nearby_risks:
        if disaster_type is None or risk["zone"]["type"] == selected_type:
            distance_factor = max(0, 1 - (risk["distance"] / 500))
            zone_contribution = risk["zone"]["base_risk"] * distance_factor * 0.8
            base_risk = max(base_risk, zone_contribution + 0.1)

    # Add environmental variability
    noise = random.uniform(-0.05, 0.05)
    risk_score = min(1.0, max(0.0, base_risk + noise))

    # Get factors and recommendations
    factors_data = DISASTER_FACTORS.get(selected_type, DISASTER_FACTORS["earthquake"])
    num_factors = max(3, int(risk_score * len(factors_data["contributing_factors"])))
    num_recs = max(3, int(risk_score * len(factors_data["recommendations"])))

    contributing_factors = random.sample(
        factors_data["contributing_factors"],
        min(num_factors, len(factors_data["contributing_factors"]))
    )
    recommendations = random.sample(
        factors_data["recommendations"],
        min(num_recs, len(factors_data["recommendations"]))
    )

    # Calculate confidence based on data availability
    confidence = 0.85 if nearby_risks else 0.55
    if len(nearby_risks) > 2:
        confidence = min(0.95, confidence + 0.05 * len(nearby_risks))

    return PredictionResponse(
        latitude=latitude,
        longitude=longitude,
        risk_score=round(risk_score, 3),
        risk_level=_get_risk_level_label(risk_score),
        disaster_type=selected_type,
        contributing_factors=contributing_factors,
        recommendations=recommendations,
        confidence=round(confidence, 2),
    )

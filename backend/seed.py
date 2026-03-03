"""
Seed the Supabase database with demo data for development/testing.

Before running this script, make sure:
1. You have created the tables in Supabase (see supabase_schema.sql)
2. Your .env file has SUPABASE_URL and SUPABASE_KEY configured
"""

from database import supabase
from models import (
    USERS_TABLE, ALERTS_TABLE, RESOURCES_TABLE,
    DISASTER_ZONES_TABLE, DISASTER_EVENTS_TABLE
)
from auth import get_password_hash


def seed_database():
    """Seed the Supabase database with demo data."""

    # Check if already seeded
    existing = supabase.table(USERS_TABLE).select("id").limit(1).execute()
    if existing.data:
        print("Database already seeded. Skipping...")
        return

    # ─── Create Users ────────────────────────────────
    users = [
        {
            "email": "admin@disastermgmt.com",
            "username": "admin",
            "full_name": "System Administrator",
            "hashed_password": get_password_hash("admin123"),
            "role": "admin",
            "phone": "+1-555-0100",
            "location": "Washington DC",
            "latitude": 38.9072,
            "longitude": -77.0369,
            "is_active": True,
        },
        {
            "email": "responder@disastermgmt.com",
            "username": "responder1",
            "full_name": "John Responder",
            "hashed_password": get_password_hash("responder123"),
            "role": "responder",
            "phone": "+1-555-0200",
            "location": "New York",
            "latitude": 40.7128,
            "longitude": -74.0060,
            "is_active": True,
        },
        {
            "email": "citizen@disastermgmt.com",
            "username": "citizen1",
            "full_name": "Jane Citizen",
            "hashed_password": get_password_hash("citizen123"),
            "role": "citizen",
            "phone": "+1-555-0300",
            "location": "Los Angeles",
            "latitude": 34.0522,
            "longitude": -118.2437,
            "is_active": True,
        },
    ]
    result = supabase.table(USERS_TABLE).insert(users).execute()
    user_ids = {u["username"]: u["id"] for u in result.data}
    admin_id = user_ids.get("admin", 1)
    responder_id = user_ids.get("responder1", 2)

    # ─── Create Alerts ───────────────────────────────
    alerts = [
        {
            "title": "Severe Flooding in Mumbai",
            "description": "Heavy monsoon rainfall causing severe flooding in low-lying areas. Estimated 50,000 people affected.",
            "disaster_type": "flood",
            "severity": "critical",
            "latitude": 19.0760,
            "longitude": 72.8777,
            "radius_km": 25.0,
            "location_name": "Mumbai, Maharashtra",
            "is_active": True,
            "created_by": admin_id,
        },
        {
            "title": "Earthquake Alert - San Francisco",
            "description": "4.5 magnitude earthquake detected. Minor structural damage reported.",
            "disaster_type": "earthquake",
            "severity": "high",
            "latitude": 37.7749,
            "longitude": -122.4194,
            "radius_km": 30.0,
            "location_name": "San Francisco, CA",
            "is_active": True,
            "created_by": admin_id,
        },
        {
            "title": "Hurricane Warning - Miami",
            "description": "Category 3 hurricane approaching. Evacuation orders issued for coastal areas.",
            "disaster_type": "hurricane",
            "severity": "critical",
            "latitude": 25.7617,
            "longitude": -80.1918,
            "radius_km": 50.0,
            "location_name": "Miami, FL",
            "is_active": True,
            "created_by": admin_id,
        },
        {
            "title": "Wildfire Risk - Sydney Region",
            "description": "Extreme fire danger conditions. Total fire ban in effect.",
            "disaster_type": "wildfire",
            "severity": "high",
            "latitude": -33.8688,
            "longitude": 151.2093,
            "radius_km": 40.0,
            "location_name": "Sydney, NSW",
            "is_active": True,
            "created_by": responder_id,
        },
        {
            "title": "Tsunami Watch - Manila",
            "description": "Tsunami watch issued following undersea earthquake. Coastal areas advised to prepare.",
            "disaster_type": "tsunami",
            "severity": "medium",
            "latitude": 14.5995,
            "longitude": 120.9842,
            "radius_km": 35.0,
            "location_name": "Manila, Philippines",
            "is_active": True,
            "created_by": admin_id,
        },
        {
            "title": "Flood Warning - Houston",
            "description": "Flash flood warning in effect. Avoid low-lying areas and underpasses.",
            "disaster_type": "flood",
            "severity": "high",
            "latitude": 29.7604,
            "longitude": -95.3698,
            "radius_km": 20.0,
            "location_name": "Houston, TX",
            "is_active": True,
            "created_by": responder_id,
        },
    ]
    supabase.table(ALERTS_TABLE).insert(alerts).execute()

    # ─── Create Resources ────────────────────────────
    resources = [
        {"name": "Emergency Medical Team Alpha", "resource_type": "Medical", "description": "20-person medical response team with field hospital capabilities", "quantity": 1, "unit": "team", "status": "available", "latitude": 38.9072, "longitude": -77.0369, "location_name": "Washington DC HQ"},
        {"name": "Water Purification Units", "resource_type": "Water", "description": "Portable water purification systems, 10,000L/day capacity each", "quantity": 15, "unit": "units", "status": "available", "latitude": 40.7128, "longitude": -74.0060, "location_name": "New York Warehouse"},
        {"name": "Emergency Shelters", "resource_type": "Shelter", "description": "Pop-up emergency shelters, capacity 50 people each", "quantity": 30, "unit": "shelters", "status": "available", "latitude": 34.0522, "longitude": -118.2437, "location_name": "LA Distribution Center"},
        {"name": "Search & Rescue Drones", "resource_type": "Equipment", "description": "DJI Matrice 300 RTK drones with thermal imaging", "quantity": 8, "unit": "drones", "status": "deployed", "latitude": 37.7749, "longitude": -122.4194, "location_name": "San Francisco Field"},
        {"name": "Emergency Food Supplies", "resource_type": "Food", "description": "MRE packs, sufficient for 500 people for 3 days", "quantity": 1500, "unit": "packs", "status": "available", "latitude": 29.7604, "longitude": -95.3698, "location_name": "Houston Depot"},
        {"name": "Communication Equipment", "resource_type": "Equipment", "description": "Satellite phones and portable radio stations", "quantity": 25, "unit": "sets", "status": "available", "latitude": 25.7617, "longitude": -80.1918, "location_name": "Miami Emergency Center"},
        {"name": "Rescue Boats", "resource_type": "Vehicle", "description": "Inflatable rescue boats for flood response", "quantity": 12, "unit": "boats", "status": "deployed", "latitude": 19.0760, "longitude": 72.8777, "location_name": "Mumbai Flood Response"},
        {"name": "Generator Units", "resource_type": "Power", "description": "Diesel generators, 50kW capacity each", "quantity": 20, "unit": "generators", "status": "maintenance", "latitude": 38.9072, "longitude": -77.0369, "location_name": "DC Maintenance Facility"},
        {"name": "Ambulance Fleet", "resource_type": "Vehicle", "description": "Fully equipped emergency ambulances", "quantity": 10, "unit": "vehicles", "status": "available", "latitude": 40.7128, "longitude": -74.0060, "location_name": "NY Medical Center"},
        {"name": "Hazmat Suits", "resource_type": "Safety", "description": "Level A hazmat protection suits", "quantity": 50, "unit": "suits", "status": "available", "latitude": 34.0522, "longitude": -118.2437, "location_name": "LA Safety Depot"},
    ]
    supabase.table(RESOURCES_TABLE).insert(resources).execute()

    # ─── Create Disaster Zones ───────────────────────
    zones = [
        {"name": "Mumbai Flood Zone", "disaster_type": "flood", "risk_level": 0.85, "latitude": 19.0760, "longitude": 72.8777, "radius_km": 25, "population_affected": 500000, "description": "Recurring monsoon flooding zone", "is_active": True},
        {"name": "San Andreas Fault Zone", "disaster_type": "earthquake", "risk_level": 0.90, "latitude": 37.7749, "longitude": -122.4194, "radius_km": 50, "population_affected": 2000000, "description": "Major tectonic fault line", "is_active": True},
        {"name": "Florida Hurricane Corridor", "disaster_type": "hurricane", "risk_level": 0.80, "latitude": 25.7617, "longitude": -80.1918, "radius_km": 100, "population_affected": 3000000, "description": "Atlantic hurricane landfall zone", "is_active": True},
        {"name": "Australian Bushfire Region", "disaster_type": "wildfire", "risk_level": 0.70, "latitude": -33.8688, "longitude": 151.2093, "radius_km": 80, "population_affected": 800000, "description": "Recurring wildfire prone area", "is_active": True},
        {"name": "Pacific Ring of Fire - Philippines", "disaster_type": "earthquake", "risk_level": 0.85, "latitude": 14.5995, "longitude": 120.9842, "radius_km": 60, "population_affected": 5000000, "description": "Active volcanic and seismic zone", "is_active": True},
        {"name": "Bangladesh Flood Plain", "disaster_type": "flood", "risk_level": 0.92, "latitude": 23.8103, "longitude": 90.4125, "radius_km": 100, "population_affected": 10000000, "description": "Annual monsoon flooding area", "is_active": True},
        {"name": "Tokyo Earthquake Zone", "disaster_type": "earthquake", "risk_level": 0.88, "latitude": 35.6762, "longitude": 139.6503, "radius_km": 40, "population_affected": 9000000, "description": "Kanto-Tokai earthquake risk zone", "is_active": True},
        {"name": "Houston Flood Zone", "disaster_type": "flood", "risk_level": 0.72, "latitude": 29.7604, "longitude": -95.3698, "radius_km": 30, "population_affected": 1500000, "description": "Hurricane and flood risk area", "is_active": True},
    ]
    supabase.table(DISASTER_ZONES_TABLE).insert(zones).execute()

    # ─── Create Disaster Events ──────────────────────
    events = [
        {
            "event_type": "earthquake",
            "title": "Nepal Earthquake 2015",
            "description": "7.8 magnitude earthquake devastated Nepal, causing widespread destruction.",
            "latitude": 28.2380,
            "longitude": 84.7314,
            "magnitude": 7.8,
            "affected_area_km2": 50000,
            "casualties": 8964,
            "injuries": 21952,
            "displaced": 3500000,
            "economic_damage_usd": 10000000000,
            "source": "USGS",
        },
        {
            "event_type": "flood",
            "title": "Kerala Floods 2018",
            "description": "Worst flooding in Kerala in nearly a century.",
            "latitude": 10.8505,
            "longitude": 76.2711,
            "affected_area_km2": 38863,
            "casualties": 483,
            "injuries": 1200,
            "displaced": 1400000,
            "economic_damage_usd": 5700000000,
            "source": "India Met Department",
        },
        {
            "event_type": "hurricane",
            "title": "Hurricane Katrina 2005",
            "description": "Category 5 hurricane that devastated the Gulf Coast.",
            "latitude": 29.9511,
            "longitude": -90.0715,
            "magnitude": 5.0,
            "affected_area_km2": 233000,
            "casualties": 1833,
            "injuries": 5000,
            "displaced": 1000000,
            "economic_damage_usd": 125000000000,
            "source": "NOAA",
        },
        {
            "event_type": "tsunami",
            "title": "Indian Ocean Tsunami 2004",
            "description": "Devastating tsunami triggered by 9.1 magnitude undersea earthquake.",
            "latitude": 3.316,
            "longitude": 95.854,
            "magnitude": 9.1,
            "affected_area_km2": 500000,
            "casualties": 227898,
            "injuries": 125000,
            "displaced": 1700000,
            "economic_damage_usd": 15000000000,
            "source": "USGS",
        },
        {
            "event_type": "wildfire",
            "title": "Australian Black Summer 2019-2020",
            "description": "Catastrophic bushfire season across Australia.",
            "latitude": -33.8688,
            "longitude": 151.2093,
            "affected_area_km2": 186000,
            "casualties": 34,
            "injuries": 417,
            "displaced": 65000,
            "economic_damage_usd": 100000000000,
            "source": "Bureau of Meteorology",
        },
        {
            "event_type": "earthquake",
            "title": "Turkey-Syria Earthquake 2023",
            "description": "7.8 magnitude earthquake causing massive devastation.",
            "latitude": 37.174,
            "longitude": 37.032,
            "magnitude": 7.8,
            "affected_area_km2": 350000,
            "casualties": 59259,
            "injuries": 121000,
            "displaced": 9100000,
            "economic_damage_usd": 34000000000,
            "source": "USGS",
        },
    ]
    supabase.table(DISASTER_EVENTS_TABLE).insert(events).execute()

    print("✅ Database seeded successfully!")
    print(f"   - {len(users)} users created")
    print(f"   - {len(alerts)} alerts created")
    print(f"   - {len(resources)} resources created")
    print(f"   - {len(zones)} disaster zones created")
    print(f"   - {len(events)} disaster events created")


if __name__ == "__main__":
    print("\n🌱 Seeding Supabase database...\n")
    try:
        seed_database()
        print("\n✅ Seeding complete!\n")
    except Exception as e:
        print(f"\n❌ Error seeding database: {e}\n")
        raise

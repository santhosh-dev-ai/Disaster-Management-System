-- =========================================================
-- Disaster Management System - Supabase Schema
-- =========================================================
-- Run this SQL in your Supabase Dashboard → SQL Editor
-- to create all required tables.
-- =========================================================

-- ─── Users Table ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'citizen' NOT NULL,
    phone VARCHAR(20),
    location VARCHAR(255),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- ─── Admins Table (separate, isolated from users) ────────────
-- Admin accounts are inserted MANUALLY via the Supabase SQL Editor.
-- They NEVER register through the public /api/auth/register endpoint.
--
-- To insert the first admin, run in the Supabase SQL Editor:
--
--   Step 1 – Generate a bcrypt hash in Python:
--     from passlib.context import CryptContext
--     print(CryptContext(schemes=["bcrypt"]).hash("YourPassword"))
--
--   Step 2 – Insert the admin row:
--     INSERT INTO admins (email, username, hashed_password)
--     VALUES ('admin@example.com', 'superadmin', '<paste_bcrypt_hash>');
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admins (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast login lookups
CREATE UNIQUE INDEX IF NOT EXISTS admins_email_idx ON admins (email);


-- ─── Alerts Table ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alerts (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(300) NOT NULL,
    description TEXT,
    disaster_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) DEFAULT 'medium',
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    radius_km DOUBLE PRECISION DEFAULT 10.0,
    location_name VARCHAR(300),
    is_active BOOLEAN DEFAULT TRUE,
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ
);

-- ─── Resources Table ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS resources (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    description TEXT,
    quantity INTEGER DEFAULT 0,
    unit VARCHAR(50),
    status VARCHAR(20) DEFAULT 'available',
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    location_name VARCHAR(300),
    assigned_to_alert BIGINT REFERENCES alerts(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- ─── Disaster Zones Table ──────────────────────────────────
CREATE TABLE IF NOT EXISTS disaster_zones (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    disaster_type VARCHAR(50) NOT NULL,
    risk_level DOUBLE PRECISION DEFAULT 0.0,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    radius_km DOUBLE PRECISION DEFAULT 5.0,
    population_affected INTEGER DEFAULT 0,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- ─── Disaster Events Table ─────────────────────────────────
CREATE TABLE IF NOT EXISTS disaster_events (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    title VARCHAR(300) NOT NULL,
    description TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    magnitude DOUBLE PRECISION,
    affected_area_km2 DOUBLE PRECISION,
    casualties INTEGER DEFAULT 0,
    injuries INTEGER DEFAULT 0,
    displaced INTEGER DEFAULT 0,
    economic_damage_usd DOUBLE PRECISION DEFAULT 0,
    source VARCHAR(200),
    data JSONB,
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Indexes ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_alerts_disaster_type ON alerts(disaster_type);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_is_active ON alerts(is_active);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_resources_status ON resources(status);
CREATE INDEX IF NOT EXISTS idx_resources_type ON resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_disaster_zones_type ON disaster_zones(disaster_type);
CREATE INDEX IF NOT EXISTS idx_disaster_zones_active ON disaster_zones(is_active);
CREATE INDEX IF NOT EXISTS idx_disaster_events_type ON disaster_events(event_type);
CREATE INDEX IF NOT EXISTS idx_disaster_events_created ON disaster_events(created_at);

-- ─── Auto-update updated_at trigger ────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_alerts_updated_at
    BEFORE UPDATE ON alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_resources_updated_at
    BEFORE UPDATE ON resources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_disaster_zones_updated_at
    BEFORE UPDATE ON disaster_zones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Row Level Security (RLS) ──────────────────────────────
-- Enable RLS on all tables (required for Supabase)
-- Using the service_role key or setting policies to allow
-- our backend (which uses the anon key) to perform operations.

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE disaster_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE disaster_events ENABLE ROW LEVEL SECURITY;

-- Allow full access via anon key (our FastAPI backend handles auth)
CREATE POLICY "Allow full access" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access" ON alerts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access" ON resources FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access" ON disaster_zones FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access" ON disaster_events FOR ALL USING (true) WITH CHECK (true);

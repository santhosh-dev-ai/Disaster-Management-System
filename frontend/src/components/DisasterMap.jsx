/**
 * DisasterMap – Real-Time Global Disaster Monitoring Map
 *
 * Displays live earthquake data (and future disaster layers) on an interactive
 * Leaflet map fetched from the DisasterGuard AI FastAPI backend.
 *
 * Colour coding (by magnitude):
 *   Green  → < 3   (minor)
 *   Orange → 3–5   (moderate)
 *   Red    → > 5   (major / critical)
 *
 * Auto-refreshes every 60 seconds.
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, LayerGroup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// ─── Constants ───────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL || '';
const REFRESH_INTERVAL_MS = 60_000; // 60 s

const SEVERITY_ORDER = ['Critical', 'High', 'Medium', 'Low'];

const MAG_COLOR = (mag) => {
    if (mag > 5) return '#ef4444';   // red
    if (mag >= 3) return '#f59e0b';  // orange
    return '#22c55e';                // green
};

const MAG_RADIUS = (mag) => {
    if (mag > 7) return 18;
    if (mag > 5) return 14;
    if (mag > 3) return 9;
    return 6;
};

const SEVERITY_BADGE_STYLE = {
    Critical: { background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.4)' },
    High:     { background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.4)' },
    Medium:   { background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.4)' },
    Low:      { background: 'rgba(34,197,94,0.15)',  color: '#22c55e', border: '1px solid rgba(34,197,94,0.4)' },
};

// ─── Sub-components ──────────────────────────────────────────────────────────

/** Forces the map to invalidate its size when the parent container resizes. */
function MapResizer() {
    const map = useMap();
    useEffect(() => {
        setTimeout(() => map.invalidateSize(), 200);
    }, [map]);
    return null;
}

// ─── Main Component ──────────────────────────────────────────────────────────

/**
 * @param {Object}   props
 * @param {boolean}  [props.showFloods=false]     – future: flood alert layer
 * @param {boolean}  [props.showWildfires=false]  – future: wildfire layer
 * @param {boolean}  [props.showZones=false]       – future: disaster zones layer
 * @param {boolean}  [props.showResources=false]  – future: emergency resources layer
 */
export default function DisasterMap({
    showFloods = false,
    showWildfires = false,
    showZones = false,
    showResources = false,
}) {
    const [earthquakes, setEarthquakes]   = useState([]);
    const [loading, setLoading]           = useState(true);
    const [error, setError]               = useState(null);
    const [lastUpdated, setLastUpdated]   = useState(null);
    const [riskLevel, setRiskLevel]       = useState(null);
    const [severityBreakdown, setSeverityBreakdown] = useState({});
    const [activeFilter, setActiveFilter] = useState('All');
    const intervalRef                     = useRef(null);

    // ── Fetch earthquake data ────────────────────────────────────────────────
    const fetchEarthquakes = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE}/api/earthquakes?min_magnitude=2.5`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setEarthquakes(data.earthquakes || []);
            setRiskLevel(data.risk_next_24h ?? null);
            setSeverityBreakdown(data.severity_breakdown || {});
            setLastUpdated(new Date());
        } catch (err) {
            setError('Failed to fetch earthquake data. Retrying in 60 s…');
            console.error('[DisasterMap] fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // ── Initial load + auto-refresh ──────────────────────────────────────────
    useEffect(() => {
        fetchEarthquakes();
        intervalRef.current = setInterval(() => fetchEarthquakes(true), REFRESH_INTERVAL_MS);
        return () => clearInterval(intervalRef.current);
    }, [fetchEarthquakes]);

    // ── Derived: filtered earthquakes ────────────────────────────────────────
    const filtered = activeFilter === 'All'
        ? earthquakes
        : earthquakes.filter((q) => q.severity === activeFilter);

    // ── Styles (inline – compatible with global glass-card CSS vars) ─────────
    const s = {
        wrapper: {
            display: 'flex',
            flexDirection: 'column',
            gap: '0',
        },
        header: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '16px',
        },
        title: {
            fontSize: '15px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--text-primary, #f1f5f9)',
        },
        meta: {
            fontSize: '11px',
            color: 'var(--text-muted, #64748b)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap',
        },
        refreshBtn: {
            background: 'rgba(99,102,241,0.15)',
            border: '1px solid rgba(99,102,241,0.3)',
            color: '#818cf8',
            borderRadius: '6px',
            padding: '4px 10px',
            fontSize: '12px',
            cursor: 'pointer',
            transition: 'background 0.2s',
        },
        statsRow: {
            display: 'flex',
            gap: '10px',
            marginBottom: '14px',
            flexWrap: 'wrap',
        },
        statPill: (color) => ({
            background: `${color}18`,
            border: `1px solid ${color}40`,
            color,
            borderRadius: '20px',
            padding: '4px 12px',
            fontSize: '12px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
        }),
        filterRow: {
            display: 'flex',
            gap: '8px',
            marginBottom: '14px',
            flexWrap: 'wrap',
            alignItems: 'center',
        },
        filterLabel: {
            fontSize: '12px',
            color: 'var(--text-muted, #64748b)',
        },
        filterBtn: (active) => ({
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: active ? 700 : 400,
            cursor: 'pointer',
            border: active
                ? '1px solid rgba(99,102,241,0.6)'
                : '1px solid rgba(99,102,241,0.2)',
            background: active
                ? 'rgba(99,102,241,0.25)'
                : 'rgba(99,102,241,0.07)',
            color: active ? '#a5b4fc' : 'var(--text-secondary, #94a3b8)',
            transition: 'all 0.15s',
        }),
        mapContainer: {
            height: '500px',
            width: '100%',
            borderRadius: '10px',
            overflow: 'hidden',
            border: '1px solid rgba(99,102,241,0.15)',
            position: 'relative',
        },
        overlay: {
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(10,14,26,0.75)',
            zIndex: 1000,
            borderRadius: '10px',
        },
        legend: {
            display: 'flex',
            gap: '20px',
            marginTop: '12px',
            flexWrap: 'wrap',
        },
        legendItem: (color) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: 'var(--text-secondary, #94a3b8)',
        }),
        dot: (color, size = 10) => ({
            width: size,
            height: size,
            borderRadius: '50%',
            background: color,
            flexShrink: 0,
        }),
        riskBadge: (risk) => {
            const high = risk > 0.6;
            const med  = risk > 0.3;
            return {
                background: high ? 'rgba(239,68,68,0.15)' : med ? 'rgba(245,158,11,0.15)' : 'rgba(34,197,94,0.15)',
                color:      high ? '#ef4444' : med ? '#f59e0b' : '#22c55e',
                border: `1px solid ${high ? 'rgba(239,68,68,0.4)' : med ? 'rgba(245,158,11,0.4)' : 'rgba(34,197,94,0.4)'}`,
                borderRadius: '20px',
                padding: '3px 10px',
                fontSize: '12px',
                fontWeight: 700,
            };
        },
    };

    const formatTime = (iso) => {
        try {
            return new Date(iso).toLocaleString(undefined, {
                month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit',
                timeZoneName: 'short',
            });
        } catch {
            return iso;
        }
    };

    return (
        <div style={s.wrapper}>
            {/* ── Header ── */}
            <div style={s.header}>
                <div style={s.title}>
                    🌍 Global Disaster Monitoring
                    {riskLevel !== null && (
                        <span style={s.riskBadge(riskLevel)}>
                            24h Risk: {Math.round(riskLevel * 100)}%
                        </span>
                    )}
                </div>
                <div style={s.meta}>
                    {lastUpdated && (
                        <span>Updated {lastUpdated.toLocaleTimeString()}</span>
                    )}
                    <span>Auto-refresh: 60 s</span>
                    <button
                        style={s.refreshBtn}
                        onClick={() => fetchEarthquakes()}
                        title="Refresh now"
                    >
                        ↻ Refresh
                    </button>
                </div>
            </div>

            {/* ── Severity stats row ── */}
            {!loading && !error && (
                <div style={s.statsRow}>
                    <span style={s.statPill('#f1f5f9')}>
                        📍 {earthquakes.length} events
                    </span>
                    {SEVERITY_ORDER.map((sev) =>
                        severityBreakdown[sev] > 0 ? (
                            <span key={sev} style={s.statPill(SEVERITY_BADGE_STYLE[sev]?.color || '#94a3b8')}>
                                {sev}: {severityBreakdown[sev]}
                            </span>
                        ) : null
                    )}
                </div>
            )}

            {/* ── Severity filter ── */}
            <div style={s.filterRow}>
                <span style={s.filterLabel}>Filter:</span>
                {['All', ...SEVERITY_ORDER].map((f) => (
                    <button
                        key={f}
                        style={s.filterBtn(activeFilter === f)}
                        onClick={() => setActiveFilter(f)}
                    >
                        {f}
                    </button>
                ))}
            </div>

            {/* ── Map ── */}
            <div style={s.mapContainer}>
                {/* Loading / Error overlay */}
                {(loading || error) && (
                    <div style={s.overlay}>
                        {loading && (
                            <div style={{ textAlign: 'center', color: '#f1f5f9' }}>
                                <div style={{ fontSize: '36px', marginBottom: '10px', animation: 'float 1.8s ease-in-out infinite' }}>🌍</div>
                                <div style={{ fontSize: '13px', color: '#94a3b8' }}>Fetching live earthquake data…</div>
                            </div>
                        )}
                        {error && !loading && (
                            <div style={{ textAlign: 'center', color: '#ef4444', maxWidth: '280px' }}>
                                <div style={{ fontSize: '32px', marginBottom: '10px' }}>⚠️</div>
                                <div style={{ fontSize: '13px' }}>{error}</div>
                                <button style={{ ...s.refreshBtn, marginTop: '12px' }} onClick={() => fetchEarthquakes()}>
                                    Retry
                                </button>
                            </div>
                        )}
                    </div>
                )}

                <MapContainer
                    center={[20, 0]}
                    zoom={2}
                    minZoom={1}
                    style={{ height: '100%', width: '100%', background: '#0d1117' }}
                    worldCopyJump
                    attributionControl={false}
                >
                    <MapResizer />

                    {/* OpenStreetMap tiles */}
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        maxZoom={19}
                    />

                    {/* ── Earthquake layer ── */}
                    <LayerGroup>
                        {filtered.map((quake, idx) => {
                            const [lat, lon] = quake.coordinates;
                            const color     = MAG_COLOR(quake.magnitude);
                            const radius    = MAG_RADIUS(quake.magnitude);
                            const badgeStyle = SEVERITY_BADGE_STYLE[quake.severity] || SEVERITY_BADGE_STYLE.Low;
                            return (
                                <CircleMarker
                                    key={`quake-${idx}`}
                                    center={[lat, lon]}
                                    radius={radius}
                                    pathOptions={{
                                        color,
                                        fillColor: color,
                                        fillOpacity: 0.75,
                                        weight: 1.5,
                                    }}
                                >
                                    <Popup
                                        maxWidth={260}
                                        className="disaster-popup"
                                    >
                                        <div style={{
                                            fontFamily: 'system-ui, -apple-system, sans-serif',
                                            padding: '4px 2px',
                                            minWidth: '220px',
                                        }}>
                                            {/* Title bar */}
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                marginBottom: '10px',
                                            }}>
                                                <span style={{ fontSize: '18px' }}>🌋</span>
                                                <span style={{ fontWeight: 700, fontSize: '14px' }}>Earthquake</span>
                                                <span style={{
                                                    ...badgeStyle,
                                                    borderRadius: '20px',
                                                    padding: '2px 8px',
                                                    fontSize: '11px',
                                                    fontWeight: 700,
                                                    marginLeft: 'auto',
                                                }}>
                                                    {quake.severity}
                                                </span>
                                            </div>

                                            {/* Details */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                <div style={{ fontSize: '12px', display: 'flex', gap: '6px' }}>
                                                    <span style={{ color: '#64748b', minWidth: '72px' }}>📍 Location</span>
                                                    <span style={{ fontWeight: 600, wordBreak: 'break-word' }}>{quake.location}</span>
                                                </div>
                                                <div style={{ fontSize: '12px', display: 'flex', gap: '6px' }}>
                                                    <span style={{ color: '#64748b', minWidth: '72px' }}>📊 Magnitude</span>
                                                    <span style={{ fontWeight: 700, color, fontSize: '13px' }}>
                                                        M {quake.magnitude.toFixed(1)}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '12px', display: 'flex', gap: '6px' }}>
                                                    <span style={{ color: '#64748b', minWidth: '72px' }}>🕐 Time</span>
                                                    <span style={{ fontWeight: 500 }}>{formatTime(quake.time)}</span>
                                                </div>
                                                <div style={{ fontSize: '12px', display: 'flex', gap: '6px' }}>
                                                    <span style={{ color: '#64748b', minWidth: '72px' }}>📌 Coords</span>
                                                    <span style={{ fontFamily: 'monospace', fontSize: '11px' }}>
                                                        {lat.toFixed(3)}, {lon.toFixed(3)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* External link */}
                                            {quake.url && (
                                                <a
                                                    href={quake.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        display: 'inline-block',
                                                        marginTop: '10px',
                                                        fontSize: '11px',
                                                        color: '#818cf8',
                                                        textDecoration: 'none',
                                                    }}
                                                >
                                                    View on USGS ↗
                                                </a>
                                            )}
                                        </div>
                                    </Popup>
                                </CircleMarker>
                            );
                        })}
                    </LayerGroup>

                    {/* ── Future layer stubs ── */}
                    {/* showFloods    → flood alert CircleMarkers (blue)   */}
                    {/* showWildfires → wildfire CircleMarkers (orange-red) */}
                    {/* showZones     → Polygons from /api/disasters         */}
                    {/* showResources → Markers from /api/resources          */}
                </MapContainer>
            </div>

            {/* ── Legend ── */}
            <div style={s.legend}>
                <div style={s.legendItem('#22c55e')}>
                    <div style={s.dot('#22c55e')} />
                    Magnitude &lt; 3 (Minor)
                </div>
                <div style={s.legendItem('#f59e0b')}>
                    <div style={s.dot('#f59e0b')} />
                    Magnitude 3 – 5 (Moderate)
                </div>
                <div style={s.legendItem('#ef4444')}>
                    <div style={s.dot('#ef4444', 14)} />
                    Magnitude &gt; 5 (Major)
                </div>
                <div style={{ ...s.legendItem('#64748b'), marginLeft: 'auto' }}>
                    Source: USGS real-time feed
                </div>
            </div>
        </div>
    );
}

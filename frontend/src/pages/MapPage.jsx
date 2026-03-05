import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Circle, Marker, Popup, useMap } from 'react-leaflet';
import { alertsAPI, disastersAPI, earthquakeAPI } from '../services/api';
import L from 'leaflet';

const SEV_COLOR = { Critical: '#ef4444', High: '#f59e0b', Medium: '#6366f1', Low: '#10b981' };
const SEVERITY_COLORS = {
    critical: '#ef4444',
    high: '#f59e0b',
    medium: '#6366f1',
    low: '#10b981',
};

const RISK_COLORS = (level) => {
    if (level >= 0.8) return '#ef4444';
    if (level >= 0.6) return '#f59e0b';
    if (level >= 0.4) return '#6366f1';
    return '#10b981';
};

// Custom marker icons
const createIcon = (color) =>
    new L.DivIcon({
        className: '',
        html: `<div style="
      width: 24px; height: 24px; border-radius: 50%;
      background: ${color}; border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    "></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
    });

const createQuakeIcon = (magnitude, severity) => {
    const color = SEV_COLOR[severity] || '#6366f1';
    const size = Math.max(18, Math.min(44, magnitude * 4.5));
    return new L.DivIcon({
        className: '',
        html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color}33;border:2px solid ${color};display:flex;align-items:center;justify-content:center;font-size:${Math.max(8,Math.floor(size*0.32))}px;font-weight:800;color:${color};font-family:Inter,sans-serif;">M${magnitude}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
    });
};

const formatRelTime = (iso) => {
    try {
        return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
};

function MapBoundsUpdater({ positions }) {
    const map = useMap();
    useEffect(() => {
        if (positions.length > 0) {
            const bounds = L.latLngBounds(positions.map((p) => [p.lat, p.lon]));
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 5 });
        }
    }, [positions, map]);
    return null;
}

export default function MapPage() {
    const [alerts, setAlerts] = useState([]);
    const [zones, setZones] = useState([]);
    const [earthquakes, setEarthquakes] = useState([]);
    const [risk24h, setRisk24h] = useState('Low');
    const [breakdown, setBreakdown] = useState({});
    const [lastUpdate, setLastUpdate] = useState(null);
    const [showAlerts, setShowAlerts] = useState(true);
    const [showZones, setShowZones] = useState(true);
    const [showEarthquakes, setShowEarthquakes] = useState(true);
    const [loading, setLoading] = useState(true);
    const [selectedFilter, setSelectedFilter] = useState('all');
    const [activePanel, setActivePanel] = useState('earthquakes');
    const [minMag, setMinMag] = useState(2.5);

    const loadEarthquakes = useCallback(async () => {
        try {
            const res = await earthquakeAPI.getAll(minMag);
            setEarthquakes(res.data.earthquakes || []);
            setRisk24h(res.data.risk_next_24h || 'Low');
            setBreakdown(res.data.severity_breakdown || {});
            setLastUpdate(new Date().toLocaleTimeString());
        } catch { }
    }, [minMag]);

    const loadMapData = useCallback(async () => {
        try {
            const [alertsRes, zonesRes] = await Promise.all([
                alertsAPI.getAll({ is_active: true }),
                disastersAPI.getZones({ is_active: true }),
            ]);
            setAlerts(alertsRes.data || []);
            setZones(zonesRes.data || []);
        } catch (err) {
            console.error('Map data error:', err);
        }
    }, []);

    useEffect(() => {
        Promise.all([loadEarthquakes(), loadMapData()]).finally(() => setLoading(false));
        const interval = setInterval(loadEarthquakes, 30000);
        return () => clearInterval(interval);
    }, [loadEarthquakes, loadMapData]);

    const riskBadgeColor = { Critical: '#ef4444', High: '#f59e0b', Medium: '#6366f1', Low: '#10b981' };

    const allPositions = [
        ...earthquakes.map((q) => ({ lat: q.coordinates[0], lon: q.coordinates[1] })),
        ...alerts.map((a) => ({ lat: a.latitude, lon: a.longitude })),
        ...zones.map((z) => ({ lat: z.latitude, lon: z.longitude })),
    ];

    const filteredEarthquakes = (selectedFilter === 'all' || selectedFilter === 'earthquake') ? earthquakes : [];
    const filteredAlerts = selectedFilter === 'all'
        ? alerts
        : alerts.filter((a) => a.disaster_type === selectedFilter);

    const filteredZones = selectedFilter === 'all'
        ? zones
        : zones.filter((z) => z.disaster_type === selectedFilter);

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 style={{ fontSize: '22px', fontWeight: 800 }}>ðŸŒ Real-Time Risk Map</h1>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Live USGS earthquake feed + AI severity &bull; Auto-refreshes every 30s
                        {lastUpdate && <span style={{ color: 'var(--accent-green)', marginLeft: '8px' }}>âœ“ {lastUpdate}</span>}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{
                        padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
                        background: `${riskBadgeColor[risk24h]}22`, border: `1px solid ${riskBadgeColor[risk24h]}44`,
                        color: riskBadgeColor[risk24h],
                    }}>24h Risk: {risk24h}</div>
                    <select className="select-field" value={minMag}
                        onChange={(e) => setMinMag(parseFloat(e.target.value))}
                        style={{ width: '140px', padding: '8px 12px', fontSize: '13px' }}>
                        <option value={1.0}>Mag â‰¥ 1.0</option>
                        <option value={2.5}>Mag â‰¥ 2.5</option>
                        <option value={4.0}>Mag â‰¥ 4.0</option>
                        <option value={5.0}>Mag â‰¥ 5.0</option>
                    </select>
                    <select className="select-field" value={selectedFilter}
                        onChange={(e) => setSelectedFilter(e.target.value)}
                        style={{ width: '140px', padding: '8px 12px', fontSize: '13px' }}>
                        <option value="all">All Types</option>
                        <option value="earthquake">ðŸŒ Earthquake</option>
                        <option value="flood">ðŸŒŠ Flood</option>
                        <option value="hurricane">ðŸŒ€ Hurricane</option>
                        <option value="wildfire">ðŸ”¥ Wildfire</option>
                    </select>
                    <button className="btn-outline" onClick={() => { loadEarthquakes(); loadMapData(); }}
                        style={{ padding: '8px 16px', fontSize: '13px' }}>ðŸ”„ Refresh</button>
                </div>
            </div>

            {/* Severity Stats */}
            <div style={{ display: 'flex', gap: '10px', padding: '0 24px 12px', flexShrink: 0 }}>
                {Object.entries(SEV_COLOR).map(([sev, color]) => (
                    <div key={sev} style={{
                        flex: 1, padding: '8px 14px', borderRadius: '10px',
                        background: `${color}15`, border: `1px solid ${color}33`,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{sev}</span>
                        <span style={{ fontSize: '18px', fontWeight: 800, color }}>{breakdown[sev] || 0}</span>
                    </div>
                ))}
                <div style={{
                    flex: 1, padding: '8px 14px', borderRadius: '10px',
                    background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Total</span>
                    <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent-primary)' }}>{earthquakes.length}</span>
                </div>
            </div>

            <div style={{ display: 'flex', height: 'calc(100vh - 200px)' }}>
                {/* Map */}
                <div style={{ flex: 1, position: 'relative' }}>
                    <MapContainer center={[20, 0]} zoom={2} style={{ height: '100%', width: '100%' }} zoomControl={true}>
                        <TileLayer
                            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        />
                        {allPositions.length > 0 && <MapBoundsUpdater positions={allPositions} />}

                        {/* USGS Earthquake Markers */}
                        {showEarthquakes && filteredEarthquakes.map((q, idx) => (
                            <Marker key={`eq-${idx}`}
                                position={[q.coordinates[0], q.coordinates[1]]}
                                icon={createQuakeIcon(q.magnitude, q.severity)}>
                                <Popup>
                                    <div style={{ minWidth: '220px', fontFamily: 'Inter,sans-serif' }}>
                                        <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '6px', color: SEV_COLOR[q.severity] }}>
                                            ðŸŒ M{q.magnitude} â€” {q.severity}
                                        </div>
                                        <div style={{ fontSize: '12px', lineHeight: 1.8 }}>
                                            <div>ðŸ“ {q.location}</div>
                                            <div>ðŸ• {formatRelTime(q.time)}</div>
                                            {q.url && <a href={q.url} target="_blank" rel="noreferrer"
                                                style={{ color: '#818cf8', fontSize: '11px' }}>ðŸ“Š View USGS â†’</a>}
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}

                        {/* Risk Zones as Circles */}
                        {showZones && filteredZones.map((zone) => (
                            <Circle key={`zone-${zone.id}`}
                                center={[zone.latitude, zone.longitude]}
                                radius={zone.radius_km * 1000}
                                pathOptions={{
                                    color: RISK_COLORS(zone.risk_level), fillColor: RISK_COLORS(zone.risk_level),
                                    fillOpacity: 0.15, weight: 2, dashArray: '5, 5',
                                }}>
                                <Popup>
                                    <div style={{ minWidth: '200px', fontFamily: 'Inter,sans-serif' }}>
                                        <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '8px' }}>{zone.name}</div>
                                        <div style={{ fontSize: '12px', lineHeight: 1.6 }}>
                                            <div>ðŸ·ï¸ {zone.disaster_type}</div>
                                            <div>ðŸ“Š Risk: {(zone.risk_level * 100).toFixed(0)}%</div>
                                            <div>ðŸ“ {zone.radius_km} km radius</div>
                                        </div>
                                    </div>
                                </Popup>
                            </Circle>
                        ))}

                        {/* Alert Markers */}
                        {showAlerts && filteredAlerts.map((alert) => (
                            <Marker key={`alert-${alert.id}`}
                                position={[alert.latitude, alert.longitude]}
                                icon={createIcon(SEVERITY_COLORS[alert.severity] || '#6366f1')}>
                                <Popup>
                                    <div style={{ minWidth: '220px', fontFamily: 'Inter,sans-serif' }}>
                                        <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '6px' }}>{alert.title}</div>
                                        <div style={{ fontSize: '12px', lineHeight: 1.6 }}>
                                            <div>ðŸ“ {alert.location_name || `${alert.latitude?.toFixed(3)}, ${alert.longitude?.toFixed(3)}`}</div>
                                            <div>âš ï¸ <strong style={{ color: SEVERITY_COLORS[alert.severity] }}>{alert.severity}</strong></div>
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>

                    {/* Legend */}
                    <div className="glass-card" style={{
                        position: 'absolute', bottom: '20px', left: '20px',
                        zIndex: 1000, padding: '14px 18px', minWidth: '180px',
                    }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Legend</div>
                        {[{ label: 'Critical', color: '#ef4444' }, { label: 'High', color: '#f59e0b' },
                          { label: 'Medium', color: '#6366f1' }, { label: 'Low', color: '#10b981' }].map(item => (
                            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.color }} />
                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{item.label}</span>
                            </div>
                        ))}
                        <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '8px', paddingTop: '8px' }}>
                            {[{ label: 'Earthquakes', val: showEarthquakes, set: setShowEarthquakes },
                              { label: 'DB Alerts', val: showAlerts, set: setShowAlerts },
                              { label: 'Risk Zones', val: showZones, set: setShowZones }].map(({ label, val, set }) => (
                                <label key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', cursor: 'pointer', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                                    <input type="checkbox" checked={val} onChange={() => set(!val)} /> {label}
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Side Panel */}
                <div style={{ width: '320px', borderLeft: '1px solid var(--border-color)', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', flexShrink: 0 }}>
                        {[{ id: 'earthquakes', label: `ðŸŒ Quakes (${earthquakes.length})` },
                          { id: 'alerts', label: `ðŸš¨ Alerts (${alerts.length})` }].map((tab) => (
                            <button key={tab.id} onClick={() => setActivePanel(tab.id)}
                                style={{
                                    flex: 1, padding: '11px 6px', fontSize: '12px', fontWeight: 600, fontFamily: 'Inter',
                                    background: activePanel === tab.id ? 'rgba(99,102,241,0.1)' : 'transparent',
                                    border: 'none', borderBottom: activePanel === tab.id ? '2px solid var(--accent-primary)' : '2px solid transparent',
                                    color: activePanel === tab.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                    cursor: 'pointer',
                                }}>{tab.label}</button>
                        ))}
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
                        {activePanel === 'earthquakes' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {filteredEarthquakes.length === 0 ? (
                                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', marginTop: '40px' }}>No earthquakes for current filter</p>
                                ) : filteredEarthquakes.slice(0, 60).map((q, i) => (
                                    <div key={i} className="glass-card" style={{ padding: '9px 11px', borderLeft: `3px solid ${SEV_COLOR[q.severity] || '#6366f1'}` }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div style={{ fontSize: '12px', fontWeight: 700, flex: 1, marginRight: '6px' }}>M{q.magnitude} â€” {q.location}</div>
                                            <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '10px', fontWeight: 700, background: `${SEV_COLOR[q.severity]}22`, color: SEV_COLOR[q.severity], whiteSpace: 'nowrap' }}>{q.severity}</span>
                                        </div>
                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{formatRelTime(q.time)}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {activePanel === 'alerts' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {alerts.length === 0 ? (
                                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', marginTop: '40px' }}>No active alerts in database</p>
                                ) : alerts.map((alert) => (
                                    <div key={alert.id} className="glass-card" style={{ padding: '9px 11px', borderLeft: `3px solid ${SEVERITY_COLORS[alert.severity] || '#6366f1'}` }}>
                                        <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '3px' }}>{alert.title}</div>
                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>ðŸ“ {alert.location_name}</div>
                                        <div style={{ display: 'flex', gap: '5px', marginTop: '4px' }}>
                                            <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '10px', background: `${SEVERITY_COLORS[alert.severity]}22`, color: SEVERITY_COLORS[alert.severity] }}>{alert.severity}</span>
                                            <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '10px', background: 'rgba(99,102,241,0.15)', color: '#a5b4fc' }}>{alert.disaster_type}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

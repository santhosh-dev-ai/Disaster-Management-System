import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Circle, Marker, Popup, useMap } from 'react-leaflet';
import { alertsAPI, disastersAPI } from '../services/api';
import L from 'leaflet';

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
    const [showAlerts, setShowAlerts] = useState(true);
    const [showZones, setShowZones] = useState(true);
    const [loading, setLoading] = useState(true);
    const [selectedFilter, setSelectedFilter] = useState('all');

    useEffect(() => {
        loadMapData();
    }, []);

    const loadMapData = async () => {
        try {
            const [alertsRes, zonesRes] = await Promise.all([
                alertsAPI.getAll({ is_active: true }),
                disastersAPI.getZones({ is_active: true }),
            ]);
            setAlerts(alertsRes.data);
            setZones(zonesRes.data);
        } catch (err) {
            console.error('Map data error:', err);
        } finally {
            setLoading(false);
        }
    };

    const allPositions = [
        ...alerts.map((a) => ({ lat: a.latitude, lon: a.longitude })),
        ...zones.map((z) => ({ lat: z.latitude, lon: z.longitude })),
    ];

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
                    <h1 style={{ fontSize: '22px', fontWeight: 800 }}>🗺️ Interactive Risk Map</h1>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Real-time disaster zones and alert visualization
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <select
                        className="select-field"
                        value={selectedFilter}
                        onChange={(e) => setSelectedFilter(e.target.value)}
                        style={{ width: '160px', padding: '8px 12px', fontSize: '13px' }}
                    >
                        <option value="all">All Types</option>
                        <option value="earthquake">🌍 Earthquake</option>
                        <option value="flood">🌊 Flood</option>
                        <option value="hurricane">🌀 Hurricane</option>
                        <option value="wildfire">🔥 Wildfire</option>
                        <option value="tsunami">🌊 Tsunami</option>
                        <option value="tornado">🌪️ Tornado</option>
                    </select>
                </div>
            </div>

            <div style={{ display: 'flex', height: 'calc(100vh - 73px)' }}>
                {/* Map */}
                <div style={{ flex: 1, position: 'relative' }}>
                    <MapContainer
                        center={[20, 0]}
                        zoom={2}
                        style={{ height: '100%', width: '100%' }}
                        zoomControl={true}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        />

                        {allPositions.length > 0 && <MapBoundsUpdater positions={allPositions} />}

                        {/* Risk Zones as Circles */}
                        {showZones &&
                            filteredZones.map((zone) => (
                                <Circle
                                    key={`zone-${zone.id}`}
                                    center={[zone.latitude, zone.longitude]}
                                    radius={zone.radius_km * 1000}
                                    pathOptions={{
                                        color: RISK_COLORS(zone.risk_level),
                                        fillColor: RISK_COLORS(zone.risk_level),
                                        fillOpacity: 0.15,
                                        weight: 2,
                                        dashArray: '5, 5',
                                    }}
                                >
                                    <Popup>
                                        <div style={{ minWidth: '200px' }}>
                                            <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '8px' }}>
                                                {zone.name}
                                            </div>
                                            <div style={{ fontSize: '12px', lineHeight: 1.6 }}>
                                                <div>🏷️ Type: <strong style={{ textTransform: 'capitalize' }}>{zone.disaster_type}</strong></div>
                                                <div>📊 Risk Level: <strong>{(zone.risk_level * 100).toFixed(0)}%</strong></div>
                                                <div>📏 Radius: <strong>{zone.radius_km} km</strong></div>
                                                <div>👥 Population: <strong>{zone.population_affected?.toLocaleString()}</strong></div>
                                            </div>
                                        </div>
                                    </Popup>
                                </Circle>
                            ))}

                        {/* Alert Markers */}
                        {showAlerts &&
                            filteredAlerts.map((alert) => (
                                <Marker
                                    key={`alert-${alert.id}`}
                                    position={[alert.latitude, alert.longitude]}
                                    icon={createIcon(SEVERITY_COLORS[alert.severity] || '#6366f1')}
                                >
                                    <Popup>
                                        <div style={{ minWidth: '220px' }}>
                                            <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '6px' }}>
                                                {alert.title}
                                            </div>
                                            <div style={{ fontSize: '12px', lineHeight: 1.6 }}>
                                                <div>🏷️ Type: <strong style={{ textTransform: 'capitalize' }}>{alert.disaster_type}</strong></div>
                                                <div>⚠️ Severity: <strong style={{ textTransform: 'capitalize', color: SEVERITY_COLORS[alert.severity] }}>{alert.severity}</strong></div>
                                                <div>📍 {alert.location_name || `${alert.latitude.toFixed(4)}, ${alert.longitude.toFixed(4)}`}</div>
                                                {alert.description && (
                                                    <div style={{ marginTop: '6px', color: '#94a3b8', fontSize: '11px' }}>
                                                        {alert.description.substring(0, 120)}...
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </Popup>
                                </Marker>
                            ))}
                    </MapContainer>

                    {/* Legend */}
                    <div
                        className="glass-card"
                        style={{
                            position: 'absolute',
                            bottom: '20px',
                            left: '20px',
                            zIndex: 1000,
                            padding: '16px 20px',
                            minWidth: '180px',
                        }}
                    >
                        <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Legend
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {[
                                { label: 'Critical', color: '#ef4444' },
                                { label: 'High Risk', color: '#f59e0b' },
                                { label: 'Medium Risk', color: '#6366f1' },
                                { label: 'Low Risk', color: '#10b981' },
                            ].map((item) => (
                                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: item.color }} />
                                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{item.label}</span>
                                </div>
                            ))}
                        </div>

                        {/* Layer Toggles */}
                        <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '10px', paddingTop: '10px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                                <input type="checkbox" checked={showAlerts} onChange={() => setShowAlerts(!showAlerts)} /> Alerts
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                                <input type="checkbox" checked={showZones} onChange={() => setShowZones(!showZones)} /> Risk Zones
                            </label>
                        </div>
                    </div>
                </div>

                {/* Side Panel */}
                <div
                    style={{
                        width: '320px',
                        borderLeft: '1px solid var(--border-color)',
                        background: 'var(--bg-secondary)',
                        overflowY: 'auto',
                        padding: '16px',
                    }}
                >
                    <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>
                        🚨 Active Alerts ({filteredAlerts.length})
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {filteredAlerts.map((alert) => (
                            <div
                                key={alert.id}
                                className="glass-card"
                                style={{
                                    padding: '12px 14px',
                                    borderLeft: `3px solid ${SEVERITY_COLORS[alert.severity]}`,
                                    cursor: 'pointer',
                                }}
                            >
                                <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>{alert.title}</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                                    📍 {alert.location_name || 'Unknown Location'}
                                </div>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <span className={`badge badge-${alert.severity}`} style={{ fontSize: '10px', padding: '2px 8px' }}>
                                        {alert.severity}
                                    </span>
                                    <span className="badge badge-medium" style={{ fontSize: '10px', padding: '2px 8px', textTransform: 'capitalize' }}>
                                        {alert.disaster_type}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '20px 0 12px' }}>
                        ⚠️ Risk Zones ({filteredZones.length})
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {filteredZones.map((zone) => (
                            <div
                                key={zone.id}
                                className="glass-card"
                                style={{
                                    padding: '12px 14px',
                                    borderLeft: `3px solid ${RISK_COLORS(zone.risk_level)}`,
                                }}
                            >
                                <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>{zone.name}</div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                                        {zone.disaster_type}
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <div
                                            style={{
                                                width: '60px',
                                                height: '6px',
                                                borderRadius: '3px',
                                                background: 'var(--bg-primary)',
                                                overflow: 'hidden',
                                            }}
                                        >
                                            <div
                                                style={{
                                                    width: `${zone.risk_level * 100}%`,
                                                    height: '100%',
                                                    borderRadius: '3px',
                                                    background: RISK_COLORS(zone.risk_level),
                                                }}
                                            />
                                        </div>
                                        <span style={{ fontSize: '11px', fontWeight: 700, color: RISK_COLORS(zone.risk_level) }}>
                                            {(zone.risk_level * 100).toFixed(0)}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

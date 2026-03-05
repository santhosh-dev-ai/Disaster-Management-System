import { useState, useEffect } from 'react';
import { alertsAPI, earthquakeAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const SEVERITY_COLORS = {
    critical: '#ef4444',
    high: '#f59e0b',
    medium: '#6366f1',
    low: '#10b981',
};

const DISASTER_ICONS = {
    earthquake: '🌍',
    flood: '🌊',
    hurricane: '🌀',
    wildfire: '🔥',
    tsunami: '🌊',
    tornado: '🌪️',
    volcanic: '🌋',
    landslide: '⛰️',
    drought: '☀️',
    other: '⚠️',
};

export default function AlertsPage() {
    const { isAdmin, isResponder } = useAuth();
    const canManage = isAdmin || isResponder;
    const [alerts, setAlerts] = useState([]);
    const [earthquakes, setEarthquakes] = useState([]);
    const [eqBreakdown, setEqBreakdown] = useState({});
    const [risk24h, setRisk24h] = useState('Low');
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('live');
    const [showForm, setShowForm] = useState(false);
    const [filterSeverity, setFilterSeverity] = useState('');
    const [filterType, setFilterType] = useState('');
    const [form, setForm] = useState({
        title: '',
        description: '',
        disaster_type: 'earthquake',
        severity: 'medium',
        latitude: '',
        longitude: '',
        radius_km: 10,
        location_name: '',
    });

    useEffect(() => {
        loadAlerts();
        loadEarthquakes();
        const interval = setInterval(loadEarthquakes, 30000);
        return () => clearInterval(interval);
    }, [filterSeverity, filterType]);

    const loadEarthquakes = async () => {
        try {
            const res = await earthquakeAPI.getAll(4.0);
            setEarthquakes(res.data.earthquakes || []);
            setEqBreakdown(res.data.severity_breakdown || {});
            setRisk24h(res.data.risk_next_24h || 'Low');
        } catch { }
    };

    const loadAlerts = async () => {
        try {
            const params = { is_active: true };
            if (filterSeverity) params.severity = filterSeverity;
            if (filterType) params.disaster_type = filterType;
            const res = await alertsAPI.getAll(params);
            setAlerts(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await alertsAPI.create({
                ...form,
                latitude: parseFloat(form.latitude),
                longitude: parseFloat(form.longitude),
                radius_km: parseFloat(form.radius_km),
            });
            toast.success('Alert created successfully!');
            setShowForm(false);
            setForm({ title: '', description: '', disaster_type: 'earthquake', severity: 'medium', latitude: '', longitude: '', radius_km: 10, location_name: '' });
            loadAlerts();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to create alert');
        }
    };

    const handleDeactivate = async (id) => {
        try {
            await alertsAPI.update(id, { is_active: false });
            toast.success('Alert deactivated');
            loadAlerts();
        } catch (err) {
            toast.error('Failed to deactivate');
        }
    };

    const riskColor = { Critical: '#ef4444', High: '#f59e0b', Medium: '#6366f1', Low: '#10b981' };
    const SEV_COLOR = { Critical: '#ef4444', High: '#f59e0b', Medium: '#6366f1', Low: '#10b981' };

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 style={{ fontSize: '22px', fontWeight: 800 }}>🚨 Alert Center</h1>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Live USGS earthquake feed + managed disaster alerts
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {activeTab === 'db' && (
                        <>
                            <select className="select-field" value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)} style={{ width: '140px', padding: '8px 12px', fontSize: '13px' }}>
                                <option value="">All Severity</option>
                                <option value="critical">🔴 Critical</option>
                                <option value="high">🟠 High</option>
                                <option value="medium">🔵 Medium</option>
                                <option value="low">🟢 Low</option>
                            </select>
                            <select className="select-field" value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ width: '150px', padding: '8px 12px', fontSize: '13px' }}>
                                <option value="">All Types</option>
                                <option value="earthquake">🌍 Earthquake</option>
                                <option value="flood">🌊 Flood</option>
                                <option value="hurricane">🌀 Hurricane</option>
                                <option value="wildfire">🔥 Wildfire</option>
                            </select>
                        </>
                    )}
                    {canManage && (
                        <button className="btn-primary" onClick={() => { setActiveTab('db'); setShowForm(!showForm); }}>
                            {showForm ? '✕ Cancel' : '+ New Alert'}
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border-color)', marginBottom: '20px', padding: '0 24px' }}>
                {[
                    { id: 'live', label: `🌍 Live USGS Feed (${earthquakes.length})` },
                    { id: 'db', label: `📊 Managed Alerts (${alerts.length})` },
                ].map((tab) => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        style={{
                            padding: '10px 20px', fontSize: '13px', fontWeight: 600, fontFamily: 'Inter',
                            background: 'transparent', border: 'none',
                            borderBottom: activeTab === tab.id ? '2px solid var(--accent-primary)' : '2px solid transparent',
                            color: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                            cursor: 'pointer',
                        }}>{tab.label}</button>
                ))}
            </div>

            <div className="page-content">
                {/* Live USGS Feed */}
                {activeTab === 'live' && (
                    <div>
                        {/* Risk Summary Row */}
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                            <div className="glass-card" style={{ padding: '14px 20px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>24h Risk Forecast</span>
                                <span style={{ fontSize: '16px', fontWeight: 800, color: riskColor[risk24h] }}>{risk24h}</span>
                            </div>
                            {Object.entries(SEV_COLOR).map(([sev, color]) => (
                                <div key={sev} className="glass-card" style={{ padding: '14px 20px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderLeft: `3px solid ${color}` }}>
                                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{sev}</span>
                                    <span style={{ fontSize: '18px', fontWeight: 800, color }}>{eqBreakdown[sev] || 0}</span>
                                </div>
                            ))}
                        </div>

                        {earthquakes.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                                <div style={{ fontSize: '40px', marginBottom: '12px' }}>⏳</div>
                                <div style={{ fontWeight: 600 }}>Loading live earthquake data...</div>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '14px' }}>
                                {earthquakes.map((q, i) => (
                                    <div key={i} className="glass-card animate-slide-in"
                                        style={{ padding: '18px', borderLeft: `4px solid ${SEV_COLOR[q.severity]}`, animationDelay: `${i * 0.03}s` }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span style={{ fontSize: '24px' }}>🌍</span>
                                                <div>
                                                    <div style={{ fontSize: '14px', fontWeight: 700 }}>M{q.magnitude} Earthquake</div>
                                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>📍 {q.location}</div>
                                                </div>
                                            </div>
                                            <span style={{
                                                padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700,
                                                background: `${SEV_COLOR[q.severity]}22`, color: SEV_COLOR[q.severity],
                                            }}>{q.severity}</span>
                                        </div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                            <span>🕐 {new Date(q.time).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                            <span>📍 {q.coordinates[0].toFixed(2)}°, {q.coordinates[1].toFixed(2)}°</span>
                                        </div>
                                        {q.url && (
                                            <a href={q.url} target="_blank" rel="noreferrer"
                                                style={{ fontSize: '11px', color: '#818cf8', display: 'block', marginTop: '8px' }}>
                                                📊 View USGS report →
                                            </a>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* DB Alerts Tab */}
                {activeTab === 'db' && (
                    <div>
                {/* Create Alert Form */}
                {showForm && (
                    <div className="glass-card animate-fade-in" style={{ padding: '24px', marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px' }}>📝 Create New Alert</h3>
                        <form onSubmit={handleCreate}>
                            <div className="form-row" style={{ marginBottom: '16px' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>Alert Title</label>
                                    <input className="input-field" placeholder="e.g. Severe Flooding in Region X" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>Location Name</label>
                                    <input className="input-field" placeholder="e.g. Mumbai, Maharashtra" value={form.location_name} onChange={(e) => setForm({ ...form, location_name: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <textarea className="input-field" rows={3} placeholder="Describe the alert..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ resize: 'vertical' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>Disaster Type</label>
                                    <select className="select-field" value={form.disaster_type} onChange={(e) => setForm({ ...form, disaster_type: e.target.value })}>
                                        <option value="earthquake">Earthquake</option>
                                        <option value="flood">Flood</option>
                                        <option value="hurricane">Hurricane</option>
                                        <option value="wildfire">Wildfire</option>
                                        <option value="tsunami">Tsunami</option>
                                        <option value="tornado">Tornado</option>
                                    </select>
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>Severity</label>
                                    <select className="select-field" value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                        <option value="critical">Critical</option>
                                    </select>
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>Latitude</label>
                                    <input className="input-field" type="number" step="any" placeholder="e.g. 19.076" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} required />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>Longitude</label>
                                    <input className="input-field" type="number" step="any" placeholder="e.g. 72.877" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} required />
                                </div>
                            </div>
                            <button type="submit" className="btn-primary">🚨 Publish Alert</button>
                        </form>
                    </div>
                )}

                {/* Alerts Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
                    {alerts.map((alert, i) => (
                        <div
                            key={alert.id}
                            className="glass-card animate-slide-in"
                            style={{
                                padding: '20px',
                                borderLeft: `4px solid ${SEVERITY_COLORS[alert.severity]}`,
                                animationDelay: `${i * 0.05}s`,
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '24px' }}>{DISASTER_ICONS[alert.disaster_type] || '⚠️'}</span>
                                    <div>
                                        <div style={{ fontSize: '14px', fontWeight: 700 }}>{alert.title}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                            📍 {alert.location_name || `${alert.latitude.toFixed(2)}, ${alert.longitude.toFixed(2)}`}
                                        </div>
                                    </div>
                                </div>
                                <span className={`badge badge-${alert.severity}`}>{alert.severity}</span>
                            </div>
                            {alert.description && (
                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '12px' }}>
                                    {alert.description.substring(0, 150)}{alert.description.length > 150 ? '...' : ''}
                                </p>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                    📏 Radius: {alert.radius_km} km
                                </div>
                                {canManage && (
                                    <button
                                        onClick={() => handleDeactivate(alert.id)}
                                        style={{
                                            padding: '5px 12px',
                                            fontSize: '11px',
                                            background: 'rgba(239,68,68,0.1)',
                                            border: '1px solid rgba(239,68,68,0.2)',
                                            borderRadius: '6px',
                                            color: '#fca5a5',
                                            cursor: 'pointer',
                                            fontFamily: 'Inter',
                                            fontWeight: 600,
                                        }}
                                    >
                                        Deactivate
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {alerts.length === 0 && !loading && (
                    <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
                        <div style={{ fontSize: '16px', fontWeight: 600 }}>No active alerts</div>
                        <p style={{ fontSize: '13px', marginTop: '4px' }}>All clear! No disaster alerts currently active.</p>
                    </div>
                )}
                    </div>
                )}
            </div>
        </div>
    );
}

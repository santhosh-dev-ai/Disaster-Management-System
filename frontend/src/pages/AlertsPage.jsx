import { useState, useEffect } from 'react';
import { alertsAPI } from '../services/api';
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
    const [loading, setLoading] = useState(true);
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
    }, [filterSeverity, filterType]);

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

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 style={{ fontSize: '22px', fontWeight: 800 }}>🚨 Alert Management</h1>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Monitor and manage disaster alerts
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
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
                        <option value="tsunami">🌊 Tsunami</option>
                    </select>
                    {canManage && (
                        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
                            {showForm ? '✕ Cancel' : '+ New Alert'}
                        </button>
                    )}
                </div>
            </div>

            <div className="page-content">
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
        </div>
    );
}

import { useState, useEffect } from 'react';
import { disastersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const TYPE_ICONS = {
    earthquake: '🌍', flood: '🌊', hurricane: '🌀', wildfire: '🔥',
    tsunami: '🌊', tornado: '🌪️', volcanic: '🌋', landslide: '⛰️',
    drought: '☀️', other: '⚠️',
};

export default function EventsPage() {
    const { isAdmin, isResponder } = useAuth();
    const canManage = isAdmin || isResponder;
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [typeFilter, setTypeFilter] = useState('');
    const [form, setForm] = useState({
        event_type: 'earthquake', title: '', description: '',
        latitude: '', longitude: '', magnitude: '',
        affected_area_km2: '', casualties: 0, injuries: 0,
        displaced: 0, economic_damage_usd: 0, source: '',
    });

    useEffect(() => { loadEvents(); }, [typeFilter]);

    const loadEvents = async () => {
        try {
            const params = {};
            if (typeFilter) params.event_type = typeFilter;
            const res = await disastersAPI.getEvents(params);
            setEvents(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await disastersAPI.createEvent({
                ...form,
                latitude: parseFloat(form.latitude),
                longitude: parseFloat(form.longitude),
                magnitude: form.magnitude ? parseFloat(form.magnitude) : null,
                affected_area_km2: form.affected_area_km2 ? parseFloat(form.affected_area_km2) : null,
                casualties: parseInt(form.casualties) || 0,
                injuries: parseInt(form.injuries) || 0,
                displaced: parseInt(form.displaced) || 0,
                economic_damage_usd: parseFloat(form.economic_damage_usd) || 0,
            });
            toast.success('Event logged!');
            setShowForm(false);
            loadEvents();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to log event');
        }
    };

    const formatNum = (n) => {
        if (!n) return '0';
        if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
        if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
        if (n >= 1e3) return n.toLocaleString();
        return n.toString();
    };

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 style={{ fontSize: '22px', fontWeight: 800 }}>📋 Disaster Events</h1>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Historical disaster event records
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <select className="select-field" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ width: '150px', padding: '8px 12px', fontSize: '13px' }}>
                        <option value="">All Types</option>
                        <option value="earthquake">🌍 Earthquake</option>
                        <option value="flood">🌊 Flood</option>
                        <option value="hurricane">🌀 Hurricane</option>
                        <option value="wildfire">🔥 Wildfire</option>
                        <option value="tsunami">🌊 Tsunami</option>
                    </select>
                    {canManage && (
                        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
                            {showForm ? '✕ Cancel' : '+ Log Event'}
                        </button>
                    )}
                </div>
            </div>

            <div className="page-content">
                {showForm && (
                    <div className="glass-card animate-fade-in" style={{ padding: '24px', marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px' }}>📝 Log Disaster Event</h3>
                        <form onSubmit={handleCreate}>
                            <div className="form-row" style={{ marginBottom: '16px' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>Event Title</label>
                                    <input className="input-field" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>Event Type</label>
                                    <select className="select-field" value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })}>
                                        {Object.entries(TYPE_ICONS).map(([k, v]) => <option key={k} value={k}>{v} {k}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <textarea className="input-field" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ resize: 'vertical' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}><label>Latitude</label><input className="input-field" type="number" step="any" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} required /></div>
                                <div className="form-group" style={{ marginBottom: 0 }}><label>Longitude</label><input className="input-field" type="number" step="any" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} required /></div>
                                <div className="form-group" style={{ marginBottom: 0 }}><label>Magnitude</label><input className="input-field" type="number" step="any" value={form.magnitude} onChange={(e) => setForm({ ...form, magnitude: e.target.value })} /></div>
                                <div className="form-group" style={{ marginBottom: 0 }}><label>Source</label><input className="input-field" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} /></div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}><label>Casualties</label><input className="input-field" type="number" value={form.casualties} onChange={(e) => setForm({ ...form, casualties: e.target.value })} /></div>
                                <div className="form-group" style={{ marginBottom: 0 }}><label>Injuries</label><input className="input-field" type="number" value={form.injuries} onChange={(e) => setForm({ ...form, injuries: e.target.value })} /></div>
                                <div className="form-group" style={{ marginBottom: 0 }}><label>Displaced</label><input className="input-field" type="number" value={form.displaced} onChange={(e) => setForm({ ...form, displaced: e.target.value })} /></div>
                                <div className="form-group" style={{ marginBottom: 0 }}><label>Damage (USD)</label><input className="input-field" type="number" value={form.economic_damage_usd} onChange={(e) => setForm({ ...form, economic_damage_usd: e.target.value })} /></div>
                            </div>
                            <button type="submit" className="btn-primary">📋 Log Event</button>
                        </form>
                    </div>
                )}

                {/* Events Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '16px' }}>
                    {events.map((event, i) => (
                        <div key={event.id} className="glass-card animate-slide-in" style={{ padding: '24px', animationDelay: `${i * 0.05}s` }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '14px' }}>
                                <div style={{ fontSize: '32px' }}>{TYPE_ICONS[event.event_type] || '⚠️'}</div>
                                <div style={{ flex: 1 }}>
                                    <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>{event.title}</h3>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                                        {event.event_type} {event.magnitude ? `• Magnitude: ${event.magnitude}` : ''}
                                        {event.source ? ` • Source: ${event.source}` : ''}
                                    </div>
                                </div>
                            </div>
                            {event.description && (
                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '16px' }}>
                                    {event.description.substring(0, 180)}{event.description.length > 180 ? '...' : ''}
                                </p>
                            )}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                                <div style={{ textAlign: 'center', padding: '10px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#ef4444' }}>{event.casualties?.toLocaleString() || 0}</div>
                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>Casualties</div>
                                </div>
                                <div style={{ textAlign: 'center', padding: '10px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#f59e0b' }}>{event.injuries?.toLocaleString() || 0}</div>
                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>Injuries</div>
                                </div>
                                <div style={{ textAlign: 'center', padding: '10px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#6366f1' }}>{event.displaced?.toLocaleString() || 0}</div>
                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>Displaced</div>
                                </div>
                                <div style={{ textAlign: 'center', padding: '10px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#10b981' }}>{formatNum(event.economic_damage_usd)}</div>
                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>Damage</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {events.length === 0 && !loading && (
                    <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: '48px', marginBottom: '12px' }}>📋</div>
                        <div style={{ fontSize: '16px', fontWeight: 600 }}>No events recorded</div>
                    </div>
                )}
            </div>
        </div>
    );
}

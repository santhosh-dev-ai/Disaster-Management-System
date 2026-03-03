import { useState, useEffect } from 'react';
import { resourcesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
    available: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', label: 'Available', icon: '✅' },
    deployed: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'Deployed', icon: '🚀' },
    maintenance: { color: '#6366f1', bg: 'rgba(99,102,241,0.12)', label: 'Maintenance', icon: '🔧' },
    unavailable: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', label: 'Unavailable', icon: '❌' },
};

const TYPE_ICONS = {
    Medical: '🏥', Water: '💧', Shelter: '🏠', Equipment: '⚙️',
    Food: '🍞', Vehicle: '🚗', Power: '⚡', Safety: '🦺',
};

export default function ResourcesPage() {
    const { isAdmin, isResponder } = useAuth();
    const canManage = isAdmin || isResponder;
    const [resources, setResources] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [statusFilter, setStatusFilter] = useState('');
    const [form, setForm] = useState({
        name: '', resource_type: 'Medical', description: '',
        quantity: 1, unit: 'units', status: 'available',
        latitude: '', longitude: '', location_name: '',
    });

    useEffect(() => { loadResources(); }, [statusFilter]);

    const loadResources = async () => {
        try {
            const params = {};
            if (statusFilter) params.status = statusFilter;
            const [resData, statsData] = await Promise.all([
                resourcesAPI.getAll(params),
                resourcesAPI.getStats(),
            ]);
            setResources(resData.data);
            setStats(statsData.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await resourcesAPI.create({
                ...form,
                quantity: parseInt(form.quantity),
                latitude: form.latitude ? parseFloat(form.latitude) : null,
                longitude: form.longitude ? parseFloat(form.longitude) : null,
            });
            toast.success('Resource added!');
            setShowForm(false);
            setForm({ name: '', resource_type: 'Medical', description: '', quantity: 1, unit: 'units', status: 'available', latitude: '', longitude: '', location_name: '' });
            loadResources();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to add resource');
        }
    };

    const handleStatusChange = async (id, newStatus) => {
        try {
            await resourcesAPI.update(id, { status: newStatus });
            toast.success('Status updated');
            loadResources();
        } catch (err) {
            toast.error('Update failed');
        }
    };

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 style={{ fontSize: '22px', fontWeight: 800 }}>📦 Resource Management</h1>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Track and deploy emergency resources
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <select className="select-field" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: '150px', padding: '8px 12px', fontSize: '13px' }}>
                        <option value="">All Status</option>
                        <option value="available">✅ Available</option>
                        <option value="deployed">🚀 Deployed</option>
                        <option value="maintenance">🔧 Maintenance</option>
                    </select>
                    {isAdmin && (
                        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
                            {showForm ? '✕ Cancel' : '+ Add Resource'}
                        </button>
                    )}
                </div>
            </div>

            <div className="page-content">
                {/* Stats */}
                {stats && (
                    <div className="stat-grid">
                        <div className="glass-card stat-card blue">
                            <div className="stat-icon">📦</div>
                            <div className="stat-value">{stats.total}</div>
                            <div className="stat-label">Total Resources</div>
                        </div>
                        <div className="glass-card stat-card green">
                            <div className="stat-icon">✅</div>
                            <div className="stat-value">{stats.available}</div>
                            <div className="stat-label">Available</div>
                        </div>
                        <div className="glass-card stat-card amber">
                            <div className="stat-icon">🚀</div>
                            <div className="stat-value">{stats.deployed}</div>
                            <div className="stat-label">Deployed</div>
                        </div>
                        <div className="glass-card stat-card red">
                            <div className="stat-icon">📈</div>
                            <div className="stat-value">{stats.utilization_rate}%</div>
                            <div className="stat-label">Utilization</div>
                        </div>
                    </div>
                )}

                {/* Create Form */}
                {showForm && (
                    <div className="glass-card animate-fade-in" style={{ padding: '24px', marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px' }}>➕ Add New Resource</h3>
                        <form onSubmit={handleCreate}>
                            <div className="form-row" style={{ marginBottom: '16px' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>Resource Name</label>
                                    <input className="input-field" placeholder="e.g. Emergency Medical Kit" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>Type</label>
                                    <select className="select-field" value={form.resource_type} onChange={(e) => setForm({ ...form, resource_type: e.target.value })}>
                                        {Object.keys(TYPE_ICONS).map((t) => <option key={t} value={t}>{TYPE_ICONS[t]} {t}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <input className="input-field" placeholder="Brief description..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>Quantity</label>
                                    <input className="input-field" type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>Unit</label>
                                    <input className="input-field" placeholder="e.g. units, kits" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>Latitude</label>
                                    <input className="input-field" type="number" step="any" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} placeholder="Optional" />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>Longitude</label>
                                    <input className="input-field" type="number" step="any" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} placeholder="Optional" />
                                </div>
                            </div>
                            <button type="submit" className="btn-primary">📦 Add Resource</button>
                        </form>
                    </div>
                )}

                {/* Resource Table */}
                <div className="glass-card" style={{ overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Resource</th>
                                    <th>Type</th>
                                    <th>Quantity</th>
                                    <th>Location</th>
                                    <th>Status</th>
                                    {canManage && <th>Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {resources.map((r) => {
                                    const statusConf = STATUS_CONFIG[r.status] || STATUS_CONFIG.available;
                                    return (
                                        <tr key={r.id}>
                                            <td>
                                                <div style={{ fontWeight: 600, fontSize: '13px' }}>{r.name}</div>
                                                {r.description && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{r.description.substring(0, 60)}</div>}
                                            </td>
                                            <td>
                                                <span style={{ fontSize: '13px' }}>
                                                    {TYPE_ICONS[r.resource_type] || '📦'} {r.resource_type}
                                                </span>
                                            </td>
                                            <td style={{ fontWeight: 700, fontSize: '14px' }}>
                                                {r.quantity} <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>{r.unit}</span>
                                            </td>
                                            <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                {r.location_name || '—'}
                                            </td>
                                            <td>
                                                <span
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        padding: '4px 10px',
                                                        borderRadius: '9999px',
                                                        fontSize: '11px',
                                                        fontWeight: 600,
                                                        background: statusConf.bg,
                                                        color: statusConf.color,
                                                    }}
                                                >
                                                    {statusConf.icon} {statusConf.label}
                                                </span>
                                            </td>
                                            {canManage && (
                                                <td>
                                                    <select
                                                        className="select-field"
                                                        value={r.status}
                                                        onChange={(e) => handleStatusChange(r.id, e.target.value)}
                                                        style={{ padding: '6px 10px', fontSize: '11px', width: '130px' }}
                                                    >
                                                        <option value="available">Available</option>
                                                        <option value="deployed">Deployed</option>
                                                        <option value="maintenance">Maintenance</option>
                                                        <option value="unavailable">Unavailable</option>
                                                    </select>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {resources.length === 0 && !loading && (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                            No resources found
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

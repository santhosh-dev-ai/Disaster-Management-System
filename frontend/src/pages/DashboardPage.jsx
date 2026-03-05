import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { alertsAPI, resourcesAPI, disastersAPI } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import DisasterMap from '../components/DisasterMap';

const SEVERITY_COLORS = {
    critical: '#ef4444',
    high: '#f59e0b',
    medium: '#6366f1',
    low: '#10b981',
};

export default function DashboardPage() {
    const { user } = useAuth();
    const [alerts, setAlerts] = useState([]);
    const [resourceStats, setResourceStats] = useState(null);
    const [disasterStats, setDisasterStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            const [alertsRes, resourceRes, disasterRes] = await Promise.all([
                alertsAPI.getAll({ is_active: true }),
                resourcesAPI.getStats(),
                disastersAPI.getStats(),
            ]);
            setAlerts(alertsRes.data);
            setResourceStats(resourceRes.data);
            setDisasterStats(disasterRes.data);
        } catch (err) {
            console.error('Dashboard data error:', err);
        } finally {
            setLoading(false);
        }
    };

    const severityCounts = alerts.reduce((acc, a) => {
        acc[a.severity] = (acc[a.severity] || 0) + 1;
        return acc;
    }, {});

    const pieData = Object.entries(severityCounts).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        color: SEVERITY_COLORS[name] || '#6366f1',
    }));

    const typeCounts = alerts.reduce((acc, a) => {
        acc[a.disaster_type] = (acc[a.disaster_type] || 0) + 1;
        return acc;
    }, {});

    const barData = Object.entries(typeCounts).map(([name, count]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        count,
    }));

    const trendData = [
        { month: 'Sep', alerts: 12, resolved: 10 },
        { month: 'Oct', alerts: 18, resolved: 15 },
        { month: 'Nov', alerts: 8, resolved: 7 },
        { month: 'Dec', alerts: 25, resolved: 20 },
        { month: 'Jan', alerts: 15, resolved: 12 },
        { month: 'Feb', alerts: alerts.length, resolved: Math.floor(alerts.length * 0.7) },
    ];

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px', animation: 'float 2s ease-in-out infinite' }}>🛡️</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Loading dashboard...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 style={{ fontSize: '22px', fontWeight: 800 }}>
                        Command Center
                    </h1>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Welcome back, <span style={{ color: 'var(--accent-blue-light)' }}>{user?.full_name}</span>
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className={`badge badge-${alerts.filter(a => a.severity === 'critical').length > 0 ? 'critical' : 'low'}`}>
                        {alerts.filter(a => a.severity === 'critical').length > 0 ? '🔴 Critical Alerts Active' : '🟢 All Clear'}
                    </div>
                </div>
            </div>

            <div className="page-content">
                {/* Stat Cards */}
                <div className="stat-grid">
                    <div className="glass-card stat-card red">
                        <div className="stat-icon">🚨</div>
                        <div className="stat-value">{alerts.length}</div>
                        <div className="stat-label">Active Alerts</div>
                    </div>
                    <div className="glass-card stat-card amber">
                        <div className="stat-icon">⚠️</div>
                        <div className="stat-value">{disasterStats?.active_zones || 0}</div>
                        <div className="stat-label">Risk Zones</div>
                    </div>
                    <div className="glass-card stat-card green">
                        <div className="stat-icon">📦</div>
                        <div className="stat-value">{resourceStats?.available || 0}</div>
                        <div className="stat-label">Resources Available</div>
                    </div>
                    <div className="glass-card stat-card blue">
                        <div className="stat-icon">📈</div>
                        <div className="stat-value">{resourceStats?.utilization_rate || 0}%</div>
                        <div className="stat-label">Utilization Rate</div>
                    </div>
                </div>

                {/* Charts Row */}
                <div className="content-grid" style={{ marginBottom: '24px' }}>
                    {/* Alert Trend Chart */}
                    <div className="glass-card" style={{ padding: '24px' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            📈 Alert Trend (6 Months)
                        </h3>
                        <ResponsiveContainer width="100%" height={220}>
                            <AreaChart data={trendData}>
                                <defs>
                                    <linearGradient id="alertGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="resolvedGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.1)" />
                                <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                                <YAxis stroke="#64748b" fontSize={12} />
                                <Tooltip
                                    contentStyle={{
                                        background: '#1a1f35',
                                        border: '1px solid rgba(99,102,241,0.2)',
                                        borderRadius: '8px',
                                        color: '#f1f5f9',
                                        fontSize: '13px',
                                    }}
                                />
                                <Area type="monotone" dataKey="alerts" stroke="#6366f1" fill="url(#alertGrad)" strokeWidth={2} name="Total Alerts" />
                                <Area type="monotone" dataKey="resolved" stroke="#10b981" fill="url(#resolvedGrad)" strokeWidth={2} name="Resolved" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Severity Distribution */}
                    <div className="glass-card" style={{ padding: '24px' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            🎯 Severity Distribution
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                            <ResponsiveContainer width="50%" height={220}>
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={80}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={index} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            background: '#1a1f35',
                                            border: '1px solid rgba(99,102,241,0.2)',
                                            borderRadius: '8px',
                                            color: '#f1f5f9',
                                            fontSize: '13px',
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div style={{ flex: 1 }}>
                                {pieData.map((item) => (
                                    <div
                                        key={item.name}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '8px 0',
                                            borderBottom: '1px solid rgba(99,102,241,0.07)',
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div
                                                style={{
                                                    width: 10,
                                                    height: 10,
                                                    borderRadius: '50%',
                                                    background: item.color,
                                                }}
                                            />
                                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{item.name}</span>
                                        </div>
                                        <span style={{ fontSize: '14px', fontWeight: 700 }}>{item.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Disaster Types Chart & Recent Alerts */}
                <div className="content-grid">
                    <div className="glass-card" style={{ padding: '24px' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            🌍 Alerts by Disaster Type
                        </h3>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={barData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.1)" />
                                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                                <YAxis stroke="#64748b" fontSize={12} />
                                <Tooltip
                                    contentStyle={{
                                        background: '#1a1f35',
                                        border: '1px solid rgba(99,102,241,0.2)',
                                        borderRadius: '8px',
                                        color: '#f1f5f9',
                                        fontSize: '13px',
                                    }}
                                />
                                <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} name="Count" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Recent Alerts List */}
                    <div className="glass-card" style={{ padding: '24px' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            🚨 Recent Active Alerts
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '280px', overflowY: 'auto' }}>
                            {alerts.slice(0, 6).map((alert, i) => (
                                <div
                                    key={alert.id}
                                    className="animate-slide-in"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '14px',
                                        padding: '14px 16px',
                                        background: 'var(--bg-secondary)',
                                        borderRadius: 'var(--radius-sm)',
                                        borderLeft: `3px solid ${SEVERITY_COLORS[alert.severity] || '#6366f1'}`,
                                        animationDelay: `${i * 0.08}s`,
                                    }}
                                >
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '3px' }}>{alert.title}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                            📍 {alert.location_name || `${alert.latitude.toFixed(2)}, ${alert.longitude.toFixed(2)}`}
                                        </div>
                                    </div>
                                    <span className={`badge badge-${alert.severity}`}>{alert.severity}</span>
                                </div>
                            ))}
                            {alerts.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                                    <div style={{ fontSize: '36px', marginBottom: '8px' }}>✅</div>
                                    No active alerts
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Global Disaster Monitoring Map ── */}
                <div className="glass-card" style={{ padding: '24px', marginTop: '24px' }}>
                    <DisasterMap />
                </div>
            </div>
        </div>
    );
}

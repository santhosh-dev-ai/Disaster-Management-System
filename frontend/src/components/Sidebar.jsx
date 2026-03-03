import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';

const navItems = [
    {
        path: '/dashboard',
        label: 'Dashboard',
        icon: '📊',
        roles: ['admin', 'responder', 'citizen'],
    },
    {
        path: '/map',
        label: 'Risk Map',
        icon: '🗺️',
        roles: ['admin', 'responder', 'citizen'],
    },
    {
        path: '/alerts',
        label: 'Alerts',
        icon: '🚨',
        roles: ['admin', 'responder', 'citizen'],
    },
    {
        path: '/resources',
        label: 'Resources',
        icon: '📦',
        roles: ['admin', 'responder'],
    },
    {
        path: '/predict',
        label: 'AI Prediction',
        icon: '🤖',
        roles: ['admin', 'responder', 'citizen'],
    },
    {
        path: '/events',
        label: 'Disaster Events',
        icon: '📋',
        roles: ['admin', 'responder'],
    },
    {
        path: '/profile',
        label: 'My Profile',
        icon: '👤',
        roles: ['admin', 'responder', 'citizen'],
    },
    {
        path: '/users',
        label: 'User Management',
        icon: '👥',
        roles: ['admin'],
    },
];

export default function Sidebar() {
    const { user, logout, isAdmin } = useAuth();
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const { notifications, unreadCount, connected, markAllRead, clearAll } = useWebSocket(!!isAuthenticated);
    const [showNotifications, setShowNotifications] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const filteredNav = navItems.filter((item) =>
        item.roles.includes(user?.role)
    );

    const toggleNotifications = () => {
        if (!showNotifications) markAllRead();
        setShowNotifications((v) => !v);
    };

    const SEVERITY_COLORS = {
        critical: '#ef4444', high: '#f59e0b', medium: '#6366f1', low: '#10b981',
    };

    return (
        <aside className="sidebar">
            {/* Logo */}
            <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 'var(--radius-md)',
                                background: 'var(--gradient-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '20px',
                            }}
                        >
                            🛡️
                        </div>
                        <div>
                            <div style={{ fontSize: '16px', fontWeight: 800, lineHeight: 1.2 }}>
                                <span className="gradient-text">DisasterGuard</span>
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>
                                AI-Powered Protection
                            </div>
                        </div>
                    </div>

                    {/* Notification Bell */}
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={toggleNotifications}
                            title={connected ? 'Live — click to view notifications' : 'Connecting...'}
                            style={{
                                background: showNotifications ? 'rgba(99,102,241,0.15)' : 'transparent',
                                border: '1px solid rgba(99,102,241,0.2)',
                                borderRadius: '8px',
                                padding: '6px 8px',
                                cursor: 'pointer',
                                fontSize: '16px',
                                position: 'relative',
                                color: 'var(--text-secondary)',
                                transition: 'all 0.2s',
                            }}
                        >
                            🔔
                            {unreadCount > 0 && (
                                <span style={{
                                    position: 'absolute', top: '-6px', right: '-6px',
                                    background: '#ef4444', color: 'white',
                                    borderRadius: '50%', width: '18px', height: '18px',
                                    fontSize: '10px', fontWeight: 700,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    lineHeight: 1,
                                }}>
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </button>

                        {/* Notification Dropdown */}
                        {showNotifications && (
                            <div style={{
                                position: 'fixed',
                                top: '70px',
                                left: '240px',
                                width: '320px',
                                background: 'var(--bg-card)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '12px',
                                boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
                                zIndex: 1000,
                                overflow: 'hidden',
                            }}>
                                <div style={{
                                    padding: '12px 16px',
                                    borderBottom: '1px solid var(--border-color)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                }}>
                                    <span style={{ fontSize: '13px', fontWeight: 700 }}>
                                        🔔 Live Alerts
                                        <span style={{
                                            marginLeft: '8px', fontSize: '10px', fontWeight: 500,
                                            color: connected ? '#10b981' : '#f59e0b',
                                        }}>
                                            {connected ? '● Live' : '○ Connecting'}
                                        </span>
                                    </span>
                                    {notifications.length > 0 && (
                                        <button
                                            onClick={clearAll}
                                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '11px', cursor: 'pointer' }}
                                        >
                                            Clear all
                                        </button>
                                    )}
                                </div>

                                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                    {notifications.length === 0 ? (
                                        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                                            No notifications yet.{'\n'}New alerts will appear here in real-time.
                                        </div>
                                    ) : (
                                        notifications.map((n) => (
                                            <div key={n.id} style={{
                                                padding: '12px 16px',
                                                borderBottom: '1px solid var(--border-color)',
                                                borderLeft: `3px solid ${SEVERITY_COLORS[n.severity] || '#6366f1'}`,
                                            }}>
                                                <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '2px' }}>
                                                    {n.title}
                                                </div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                    {n.location_name && `📍 ${n.location_name} · `}
                                                    {new Date(n.timestamp).toLocaleTimeString()}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
                <div
                    style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        padding: '8px 12px',
                        marginBottom: '4px',
                    }}
                >
                    Navigation
                </div>
                {filteredNav.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        style={({ isActive }) => ({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '11px 16px',
                            borderRadius: 'var(--radius-sm)',
                            textDecoration: 'none',
                            fontSize: '14px',
                            fontWeight: isActive ? 600 : 500,
                            color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                            background: isActive ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                            borderLeft: isActive ? '3px solid var(--accent-blue)' : '3px solid transparent',
                            marginBottom: '4px',
                            transition: 'all 0.2s ease',
                        })}
                    >
                        <span style={{ fontSize: '18px' }}>{item.icon}</span>
                        {item.label}
                    </NavLink>
                ))}
            </nav>

            {/* User Profile */}
            <div
                style={{
                    padding: '16px 16px',
                    borderTop: '1px solid var(--border-color)',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '12px',
                    }}
                >
                    <div
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            background: 'var(--gradient-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            fontWeight: 700,
                            color: 'white',
                            flexShrink: 0,
                        }}
                    >
                        {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                        <div
                            style={{
                                fontSize: '13px',
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }}
                        >
                            {user?.full_name}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                            {user?.role}
                        </div>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    style={{
                        width: '100%',
                        padding: '9px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        borderRadius: 'var(--radius-sm)',
                        color: '#fca5a5',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        fontFamily: 'Inter, sans-serif',
                    }}
                    onMouseOver={(e) => (e.target.style.background = 'rgba(239, 68, 68, 0.2)')}
                    onMouseOut={(e) => (e.target.style.background = 'rgba(239, 68, 68, 0.1)')}
                >
                    🚪 Sign Out
                </button>
            </div>
        </aside>
    );
}

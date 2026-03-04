import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI, geoAPI } from '../services/api';
import toast from 'react-hot-toast';

const ROLE_CONFIG = {
    admin: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', icon: '🛡️' },
    responder: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: '🚨' },
    citizen: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: '👤' },
};

export default function ProfilePage() {
    const { user, setUser } = useAuth();

    const [profileForm, setProfileForm] = useState({
        full_name: user?.full_name || '',
        phone: user?.phone || '',
        location: user?.location || '',
        latitude: user?.latitude?.toString() || '',
        longitude: user?.longitude?.toString() || '',
    });

    const [passwordForm, setPasswordForm] = useState({
        current_password: '',
        new_password: '',
        confirm_password: '',
    });

    const [saving, setSaving] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [detectingLoc, setDetectingLoc] = useState(false);

    const detectLocation = () => {
        if (!navigator.geolocation) { toast.error('Geolocation not supported'); return; }
        setDetectingLoc(true);
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude, longitude } = pos.coords;
                try {
                    const res = await geoAPI.reverse(latitude, longitude);
                    const name = res.data?.display_name || res.data?.name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
                    setProfileForm((f) => ({ ...f, location: name, latitude: latitude.toString(), longitude: longitude.toString() }));
                    toast.success('Location detected!');
                } catch {
                    setProfileForm((f) => ({ ...f, latitude: latitude.toString(), longitude: longitude.toString() }));
                    toast.success('Coordinates captured');
                } finally {
                    setDetectingLoc(false);
                }
            },
            () => { toast.error('Could not get location'); setDetectingLoc(false); }
        );
    };

    const role = user?.role || 'citizen';
    const roleStyle = ROLE_CONFIG[role] || ROLE_CONFIG.citizen;

    const handleProfileSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                full_name: profileForm.full_name,
                phone: profileForm.phone || null,
                location: profileForm.location || null,
                latitude: profileForm.latitude ? parseFloat(profileForm.latitude) : null,
                longitude: profileForm.longitude ? parseFloat(profileForm.longitude) : null,
            };
            const res = await authAPI.updateMe(payload);
            // Update the stored user in context/localStorage
            if (setUser) setUser(res.data);
            const stored = JSON.parse(localStorage.getItem('user') || '{}');
            localStorage.setItem('user', JSON.stringify({ ...stored, ...res.data }));
            toast.success('Profile updated successfully');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (passwordForm.new_password !== passwordForm.confirm_password) {
            toast.error('New passwords do not match');
            return;
        }
        setChangingPassword(true);
        try {
            await authAPI.updateMe({
                current_password: passwordForm.current_password,
                new_password: passwordForm.new_password,
            });
            setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
            toast.success('Password changed successfully');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to change password');
        } finally {
            setChangingPassword(false);
        }
    };

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">My Profile</h1>
                    <p className="page-subtitle">Manage your account information and security settings</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px', alignItems: 'start' }}>

                {/* ─── Identity Card ─────────────────── */}
                <div className="card" style={{ textAlign: 'center', padding: '32px 24px' }}>
                    <div style={{
                        width: 80, height: 80, borderRadius: '50%',
                        background: 'var(--gradient-primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '32px', fontWeight: 800, color: 'white',
                        margin: '0 auto 16px',
                    }}>
                        {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>

                    <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>
                        {user?.full_name}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                        @{user?.username}
                    </div>

                    <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        padding: '6px 14px', borderRadius: '20px',
                        background: roleStyle.bg, color: roleStyle.color,
                        fontSize: '13px', fontWeight: 600, marginBottom: '24px',
                    }}>
                        {roleStyle.icon} {role.charAt(0).toUpperCase() + role.slice(1)}
                    </span>

                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', textAlign: 'left' }}>
                        {[
                            { label: 'Email', value: user?.email, icon: '✉️' },
                            { label: 'Phone', value: user?.phone || '—', icon: '📞' },
                            { label: 'Location', value: user?.location || '—', icon: '📍' },
                            { label: 'Status', value: user?.is_active ? 'Active' : 'Inactive', icon: '🟢' },
                        ].map(({ label, value, icon }) => (
                            <div key={label} style={{ marginBottom: '14px' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
                                    {icon} {label}
                                </div>
                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                                    {value}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Edit / Cancel toggle */}
                    <button
                        onClick={() => setIsEditing((v) => !v)}
                        className={isEditing ? 'btn-outline' : 'btn-primary'}
                        style={{ width: '100%', justifyContent: 'center', padding: '10px', marginTop: '8px' }}
                    >
                        {isEditing ? '✕ Cancel' : '✏️ Edit Profile'}
                    </button>
                </div>

                {/* ─── Edit Forms ────────────────────── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {!isEditing && (
                    <div className="card" style={{ padding: '24px', color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center', borderStyle: 'dashed', opacity: 0.7 }}>
                        Click <strong>Edit Profile</strong> on the left to update your information.
                    </div>
                )}
                {isEditing && (
                    <>
                    {/* Profile Info */}
                    <div className="card">
                        <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                            ✏️ Edit Profile Information
                        </h2>
                        <form onSubmit={handleProfileSave}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                <div>
                                    <label className="form-label">Full Name *</label>
                                    <input
                                        className="form-input"
                                        value={profileForm.full_name}
                                        onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                                        required
                                        minLength={2}
                                    />
                                </div>
                                <div>
                                    <label className="form-label">Phone</label>
                                    <input
                                        className="form-input"
                                        value={profileForm.phone}
                                        onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                                        placeholder="+1-555-0000"
                                    />
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label className="form-label">Location</label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <input
                                            className="form-input"
                                            style={{ flex: 1 }}
                                            value={profileForm.location}
                                            onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })}
                                            placeholder="City, Country"
                                        />
                                        <button
                                            type="button"
                                            onClick={detectLocation}
                                            disabled={detectingLoc}
                                            className="btn-outline"
                                            style={{ whiteSpace: 'nowrap', padding: '0 14px', fontSize: '12px' }}
                                            title="Auto-detect your location"
                                        >
                                            {detectingLoc ? '⏳' : '📍 Auto-detect'}
                                        </button>
                                    </div>
                                    {profileForm.latitude && profileForm.longitude && (
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                            Coordinates: {parseFloat(profileForm.latitude).toFixed(5)}, {parseFloat(profileForm.longitude).toFixed(5)}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={saving}
                                style={{ minWidth: '140px' }}
                            >
                                {saving ? '⏳ Saving...' : '💾 Save Changes'}
                            </button>
                        </form>
                    </div>

                    {/* Change Password */}
                    <div className="card">
                        <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                            🔒 Change Password
                        </h2>
                        <form onSubmit={handlePasswordChange}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginBottom: '16px', maxWidth: '400px' }}>
                                <div>
                                    <label className="form-label">Current Password *</label>
                                    <input
                                        className="form-input"
                                        type="password"
                                        value={passwordForm.current_password}
                                        onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="form-label">New Password *</label>
                                    <input
                                        className="form-input"
                                        type="password"
                                        value={passwordForm.new_password}
                                        onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                                        required
                                        minLength={6}
                                        placeholder="At least 6 characters"
                                    />
                                </div>
                                <div>
                                    <label className="form-label">Confirm New Password *</label>
                                    <input
                                        className="form-input"
                                        type="password"
                                        value={passwordForm.confirm_password}
                                        onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                                        required
                                        minLength={6}
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={changingPassword}
                                style={{ minWidth: '160px' }}
                            >
                                {changingPassword ? '⏳ Updating...' : '🔑 Change Password'}
                            </button>
                        </form>
                    </div>

                    </>
                )}
                </div>
            </div>
        </div>
    );
}

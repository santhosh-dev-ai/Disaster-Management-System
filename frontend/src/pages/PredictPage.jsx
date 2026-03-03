import { useState } from 'react';
import { disastersAPI } from '../services/api';
import toast from 'react-hot-toast';

const RISK_COLORS = {
    Critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
    High: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    Medium: { color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
    Low: { color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    Minimal: { color: '#22d3ee', bg: 'rgba(34,211,238,0.12)' },
};

const PRESETS = [
    { name: 'Mumbai, India', lat: 19.076, lon: 72.877 },
    { name: 'San Francisco, USA', lat: 37.774, lon: -122.419 },
    { name: 'Tokyo, Japan', lat: 35.676, lon: 139.650 },
    { name: 'Miami, USA', lat: 25.761, lon: -80.191 },
    { name: 'Manila, Philippines', lat: 14.599, lon: 120.984 },
    { name: 'Dhaka, Bangladesh', lat: 23.810, lon: 90.412 },
    { name: 'Istanbul, Turkey', lat: 41.008, lon: 28.978 },
    { name: 'Sydney, Australia', lat: -33.868, lon: 151.209 },
];

export default function PredictPage() {
    const [latitude, setLatitude] = useState('');
    const [longitude, setLongitude] = useState('');
    const [disasterType, setDisasterType] = useState('');
    const [prediction, setPrediction] = useState(null);
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState([]);

    const handlePredict = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
            };
            if (disasterType) payload.disaster_type = disasterType;
            const res = await disastersAPI.predict(payload);
            setPrediction(res.data);
            setHistory((prev) => [res.data, ...prev.slice(0, 4)]);
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Prediction failed');
        } finally {
            setLoading(false);
        }
    };

    const selectPreset = (preset) => {
        setLatitude(preset.lat.toString());
        setLongitude(preset.lon.toString());
    };

    const riskStyle = prediction ? RISK_COLORS[prediction.risk_level] || RISK_COLORS.Medium : null;

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 style={{ fontSize: '22px', fontWeight: 800 }}>🤖 AI Risk Prediction</h1>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        AI-powered location-based disaster risk assessment
                    </p>
                </div>
            </div>

            <div className="page-content">
                <div className="content-grid">
                    {/* Input Panel */}
                    <div>
                        <div className="glass-card" style={{ padding: '24px', marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>📍 Location Input</h3>
                            <form onSubmit={handlePredict}>
                                <div className="form-row" style={{ marginBottom: '16px' }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label>Latitude</label>
                                        <input className="input-field" type="number" step="any" value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="e.g. 19.076" required />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label>Longitude</label>
                                        <input className="input-field" type="number" step="any" value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="e.g. 72.877" required />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Disaster Type (Optional)</label>
                                    <select className="select-field" value={disasterType} onChange={(e) => setDisasterType(e.target.value)}>
                                        <option value="">Auto-detect</option>
                                        <option value="earthquake">🌍 Earthquake</option>
                                        <option value="flood">🌊 Flood</option>
                                        <option value="hurricane">🌀 Hurricane</option>
                                        <option value="wildfire">🔥 Wildfire</option>
                                        <option value="tsunami">🌊 Tsunami</option>
                                        <option value="tornado">🌪️ Tornado</option>
                                    </select>
                                </div>
                                <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '14px' }}>
                                    {loading ? '⏳ Analyzing...' : '🔮 Predict Risk'}
                                </button>
                            </form>
                        </div>

                        {/* Quick Presets */}
                        <div className="glass-card" style={{ padding: '20px' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>⚡ Quick Locations</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                {PRESETS.map((p) => (
                                    <button
                                        key={p.name}
                                        onClick={() => selectPreset(p)}
                                        className="btn-outline"
                                        style={{ padding: '8px', fontSize: '12px', textAlign: 'left' }}
                                    >
                                        📍 {p.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Results Panel */}
                    <div>
                        {prediction ? (
                            <div className="glass-card animate-fade-in" style={{ padding: '28px' }}>
                                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                                    <div
                                        style={{
                                            width: '120px',
                                            height: '120px',
                                            borderRadius: '50%',
                                            background: riskStyle.bg,
                                            border: `3px solid ${riskStyle.color}`,
                                            display: 'inline-flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginBottom: '16px',
                                        }}
                                    >
                                        <div style={{ fontSize: '28px', fontWeight: 900, color: riskStyle.color }}>
                                            {(prediction.risk_score * 100).toFixed(0)}%
                                        </div>
                                        <div style={{ fontSize: '11px', fontWeight: 600, color: riskStyle.color, textTransform: 'uppercase' }}>
                                            Risk
                                        </div>
                                    </div>
                                    <h2 style={{ fontSize: '22px', fontWeight: 800, color: riskStyle.color }}>
                                        {prediction.risk_level} Risk
                                    </h2>
                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', textTransform: 'capitalize' }}>
                                        🏷️ {prediction.disaster_type} • 🎯 {(prediction.confidence * 100).toFixed(0)}% confidence
                                    </div>
                                </div>

                                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', marginBottom: '20px' }}>
                                    <h4 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>
                                        ⚠️ Contributing Factors
                                    </h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        {prediction.contributing_factors.map((f, i) => (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: riskStyle.color, flexShrink: 0 }} />
                                                {f}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                                    <h4 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>
                                        💡 Recommendations
                                    </h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {prediction.recommendations.map((r, i) => (
                                            <div
                                                key={i}
                                                style={{
                                                    padding: '10px 14px',
                                                    background: 'var(--bg-secondary)',
                                                    borderRadius: 'var(--radius-sm)',
                                                    fontSize: '13px',
                                                    color: 'var(--text-secondary)',
                                                    borderLeft: '3px solid var(--accent-emerald)',
                                                }}
                                            >
                                                {r}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="glass-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
                                <div style={{ fontSize: '64px', marginBottom: '16px', animation: 'float 3s ease-in-out infinite' }}>🤖</div>
                                <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>AI Risk Analysis</h3>
                                <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '300px', margin: '0 auto' }}>
                                    Enter coordinates or select a preset location to analyze disaster risk using our AI prediction engine.
                                </p>
                            </div>
                        )}

                        {/* History */}
                        {history.length > 1 && (
                            <div className="glass-card" style={{ padding: '20px', marginTop: '16px' }}>
                                <h4 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px' }}>📜 Recent Predictions</h4>
                                {history.slice(1).map((h, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(99,102,241,0.07)' }}>
                                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                            📍 {h.latitude.toFixed(3)}, {h.longitude.toFixed(3)}
                                        </span>
                                        <span style={{ fontSize: '12px', fontWeight: 700, color: (RISK_COLORS[h.risk_level] || RISK_COLORS.Medium).color }}>
                                            {h.risk_level} ({(h.risk_score * 100).toFixed(0)}%)
                                        </span>
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

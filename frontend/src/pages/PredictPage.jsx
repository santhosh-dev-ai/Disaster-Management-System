import { useState, useEffect, useRef } from 'react';
import { disastersAPI, geoAPI } from '../services/api';
import toast from 'react-hot-toast';

const RISK_COLORS = {
    Critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
    High: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    Medium: { color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
    Low: { color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    Minimal: { color: '#22d3ee', bg: 'rgba(34,211,238,0.12)' },
};

export default function PredictPage() {
    const [locationQuery, setLocationQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [latitude, setLatitude] = useState('');
    const [longitude, setLongitude] = useState('');
    const [disasterType, setDisasterType] = useState('');
    const [prediction, setPrediction] = useState(null);
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState([]);
    const [hotspots, setHotspots] = useState([]);
    const [hotspotsLoading, setHotspotsLoading] = useState(true);
    const debounceRef = useRef(null);

    // Load live hotspots on mount
    useEffect(() => {
        geoAPI.hotspots()
            .then((res) => setHotspots(res.data || []))
            .catch(() => {})
            .finally(() => setHotspotsLoading(false));
    }, []);

    // Debounced geocode search
    useEffect(() => {
        if (!locationQuery || locationQuery.length < 2) {
            setSuggestions([]);
            return;
        }
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            try {
                const res = await geoAPI.search(locationQuery);
                setSuggestions(res.data || []);
                setShowSuggestions(true);
            } catch { }
        }, 400);
    }, [locationQuery]);

    const selectSuggestion = (s) => {
        setSelectedLocation(s);
        setLocationQuery(s.name);
        setLatitude(s.latitude.toString());
        setLongitude(s.longitude.toString());
        setSuggestions([]);
        setShowSuggestions(false);
    };

    const selectHotspot = (h) => {
        setSelectedLocation(h);
        setLocationQuery(h.name);
        setLatitude(h.latitude.toString());
        setLongitude(h.longitude.toString());
    };

    const handlePredict = async (e) => {
        e.preventDefault();
        if (!latitude || !longitude) {
            toast.error('Please select a location first');
            return;
        }
        setLoading(true);
        try {
            const payload = {
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
            };
            if (disasterType) payload.disaster_type = disasterType;
            const res = await disastersAPI.predict(payload);
            const result = { ...res.data, locationName: selectedLocation?.name || locationQuery };
            setPrediction(result);
            setHistory((prev) => [result, ...prev.slice(0, 4)]);
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Prediction failed');
        } finally {
            setLoading(false);
        }
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
                            <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>📍 Location Search</h3>
                            <form onSubmit={handlePredict}>
                                {/* Location Name Search */}
                                <div className="form-group" style={{ marginBottom: '16px', position: 'relative' }}>
                                    <label>Search Location</label>
                                    <input
                                        className="input-field"
                                        type="text"
                                        value={locationQuery}
                                        onChange={(e) => { setLocationQuery(e.target.value); setSelectedLocation(null); }}
                                        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                        placeholder="Type a city, region or country..."
                                        autoComplete="off"
                                    />
                                    {showSuggestions && suggestions.length > 0 && (
                                        <div style={{
                                            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                                            background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                                            borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                                            overflow: 'hidden', marginTop: '4px',
                                        }}>
                                            {suggestions.map((s, i) => (
                                                <div key={i}
                                                    onClick={() => selectSuggestion(s)}
                                                    style={{
                                                        padding: '10px 14px', cursor: 'pointer', fontSize: '13px',
                                                        color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)',
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(99,102,241,0.1)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                >
                                                    <div style={{ fontWeight: 600 }}>{s.name}</div>
                                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.display_name}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Coords preview */}
                                {selectedLocation && (
                                    <div style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', marginBottom: '14px', fontSize: '12px', color: '#6ee7b7' }}>
                                        ✓ {selectedLocation.name} &bull; {parseFloat(latitude).toFixed(4)}°, {parseFloat(longitude).toFixed(4)}°
                                    </div>
                                )}

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
                                <button type="submit" className="btn-primary" disabled={loading || !latitude}
                                    style={{ width: '100%', justifyContent: 'center', padding: '14px' }}>
                                    {loading ? '⏳ Analyzing...' : '🔮 Predict Risk'}
                                </button>
                            </form>
                        </div>

                        {/* Live Hotspots */}
                        <div className="glass-card" style={{ padding: '20px' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>⚡ Live Hotspots <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-muted)' }}>(from USGS)</span></h3>
                            {hotspotsLoading ? (
                                <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>⏳ Loading live data...</p>
                            ) : hotspots.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>No major events right now</p>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                                    {hotspots.map((h, i) => (
                                        <button key={i} onClick={() => selectHotspot(h)}
                                            className="btn-outline"
                                            style={{ padding: '7px 10px', fontSize: '11px', textAlign: 'left', lineHeight: 1.3 }}>
                                            <div style={{ fontWeight: 700, color: h.severity === 'Critical' ? '#ef4444' : h.severity === 'High' ? '#f59e0b' : 'var(--accent-primary)' }}>M{h.magnitude} {h.severity}</div>
                                            <div style={{ color: 'var(--text-muted)', fontSize: '10px', marginTop: '2px' }}>📍 {h.name}</div>
                                        </button>
                                    ))}
                                </div>
                            )}
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
                                            📍 {h.locationName || `${h.latitude?.toFixed(2)}°, ${h.longitude?.toFixed(2)}°`}
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

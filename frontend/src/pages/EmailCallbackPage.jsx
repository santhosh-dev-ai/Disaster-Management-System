import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export default function EmailCallbackPage() {
    const [type, setType] = useState(null);

    useEffect(() => {
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.replace('#', '?'));
        const t = params.get('type') || 'signup';
        setType(t);
        // Clean the hash from the URL
        window.history.replaceState(null, '', window.location.pathname);
    }, []);

    const messages = {
        signup: {
            icon: '✅',
            title: 'Email Verified!',
            body: 'Your account has been confirmed. You can now sign in.',
        },
        recovery: {
            icon: '🔑',
            title: 'Password Reset Link',
            body: 'Follow the instructions in the email to reset your password.',
        },
        email_change: {
            icon: '📧',
            title: 'Email Updated!',
            body: 'Your email address has been successfully changed.',
        },
    };

    const msg = messages[type] || messages.signup;

    return (
        <div className="auth-container">
            <div className="auth-card glass-card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>{msg.icon}</div>
                <h1 className="gradient-text">{msg.title}</h1>
                <p style={{ color: 'var(--text-secondary)', margin: '12px 0 28px', lineHeight: 1.7 }}>
                    {msg.body}
                </p>
                <Link
                    to="/login"
                    className="btn-primary"
                    style={{ display: 'inline-flex', justifyContent: 'center', padding: '12px 36px', fontSize: '15px' }}
                >
                    🔐 Sign In Now
                </Link>
            </div>
        </div>
    );
}

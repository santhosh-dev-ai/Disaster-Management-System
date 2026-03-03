/**
 * useWebSocket - Real-time alert notifications via WebSocket.
 * Connects to /ws/alerts, auto-reconnects on disconnect,
 * and tracks an unread notification list.
 */
import { useEffect, useRef, useState, useCallback } from 'react';

const RECONNECT_DELAY_MS = 3000;
const MAX_NOTIFICATIONS = 20;

export function useWebSocket(enabled = true) {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [connected, setConnected] = useState(false);
    const wsRef = useRef(null);
    const timeoutRef = useRef(null);
    const mountedRef = useRef(true);

    const connect = useCallback(() => {
        if (!mountedRef.current || !enabled) return;

        try {
            const url = `ws://${window.location.host}/ws/alerts`;
            const ws = new WebSocket(url);
            wsRef.current = ws;

            ws.onopen = () => {
                if (mountedRef.current) setConnected(true);
            };

            ws.onmessage = (event) => {
                if (!mountedRef.current) return;
                try {
                    const msg = JSON.parse(event.data);
                    if (msg.type === 'new_alert' && msg.data) {
                        const notification = {
                            id: Date.now(),
                            read: false,
                            timestamp: new Date().toISOString(),
                            title: msg.data.title || 'New Alert',
                            severity: msg.data.severity || 'medium',
                            disaster_type: msg.data.disaster_type || 'other',
                            location_name: msg.data.location_name || '',
                        };
                        setNotifications((prev) => [notification, ...prev].slice(0, MAX_NOTIFICATIONS));
                        setUnreadCount((c) => c + 1);
                    }
                } catch {
                    // Non-JSON message, ignore
                }
            };

            ws.onclose = () => {
                if (!mountedRef.current) return;
                setConnected(false);
                // Auto-reconnect
                timeoutRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
            };

            ws.onerror = () => {
                ws.close();
            };
        } catch {
            // WS not available (e.g. SSR), silently skip
        }
    }, [enabled]);

    useEffect(() => {
        mountedRef.current = true;
        if (enabled) connect();

        return () => {
            mountedRef.current = false;
            clearTimeout(timeoutRef.current);
            wsRef.current?.close();
        };
    }, [connect, enabled]);

    const markAllRead = useCallback(() => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
    }, []);

    const clearAll = useCallback(() => {
        setNotifications([]);
        setUnreadCount(0);
    }, []);

    return { notifications, unreadCount, connected, markAllRead, clearAll };
}

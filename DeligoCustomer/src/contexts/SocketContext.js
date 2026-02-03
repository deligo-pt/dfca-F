import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import io from 'socket.io-client';
import { API_CONFIG } from '../constants/config';
import StorageService from '../utils/storage';

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef(null);

    // Initialize socket connection using the BASE_URL (root, not /api/v1)
    const connect = useCallback(async () => {
        if (socketRef.current?.connected) {
            console.debug('[Socket] Already connected');
            return;
        }

        try {
            // Get token for auth
            let token = await StorageService.getAccessToken();
            if (token && typeof token === 'object') {
                token = token.accessToken || token.token || token.value;
            }

            const BASE_URL = API_CONFIG.BASE_URL;

            console.debug('[Socket] Connecting to:', BASE_URL);

            const newSocket = io(BASE_URL, {
                auth: { token },

                // Allow both transports to maximize compatibility
                transports: ['polling', 'websocket'],
                upgrade: true,

                path: '/socket.io',

                reconnection: true,
                reconnectionAttempts: 20,
                reconnectionDelay: 2000,
                timeout: 30000,

                forceNew: true,
                autoConnect: true,
            });

            newSocket.on('connect', () => {
                console.log('[Socket] Connected:', newSocket.id);
                setIsConnected(true);
            });

            newSocket.on('disconnect', (reason) => {
                console.log('[Socket] Disconnected:', reason);
                setIsConnected(false);
            });

            newSocket.on('connect_error', (err) => {
                // Important: socket.io errors often include useful fields like description/context
                console.warn('[Socket] Connection Error:', {
                    message: err?.message,
                    description: err?.description,
                    context: err?.context,
                    type: err?.type,
                });
                setIsConnected(false);
            });

            // Extra diagnostics
            newSocket.io.on('reconnect_attempt', (attempt) => console.debug('[Socket] reconnect_attempt:', attempt));
            newSocket.io.on('reconnect_error', (err) => console.debug('[Socket] reconnect_error:', err?.message || err));
            newSocket.io.on('reconnect_failed', () => console.debug('[Socket] reconnect_failed'));

            socketRef.current = newSocket;
            setSocket(newSocket);
        } catch (e) {
            console.error('[Socket] Init failed:', e);
        }
    }, []);

    const disconnect = useCallback(() => {
        if (socketRef.current) {
            console.debug('[Socket] Disconnecting...');
            socketRef.current.disconnect();
            socketRef.current = null;
            setSocket(null);
            setIsConnected(false);
        }
    }, []);

    // Helper to emit an event (optionally with ack)
    const emit = useCallback((eventName, payload, ack) => {
        if (socketRef.current && socketRef.current.connected) {
            console.debug('[Socket] Emit:', eventName, payload);
            if (typeof ack === 'function') socketRef.current.emit(eventName, payload, ack);
            else socketRef.current.emit(eventName, payload);
        } else {
            console.warn('[Socket] Cannot emit, socket not connected:', eventName);
        }
    }, []);

    // Helper to join a specific room
    const joinRoom = useCallback((eventName, payload, ack) => {
        emit(eventName, payload, ack);
    }, [emit]);

    // Helper to leave a room
    const leaveRoom = useCallback((eventName, payload, ack) => {
        emit(eventName, payload, ack);
    }, [emit]);

    // Initialize on mount
    useEffect(() => {
        connect();
        return () => {
            disconnect();
        };
    }, [connect, disconnect]);

    return (
        <SocketContext.Provider value={{ socket, isConnected, connect, disconnect, emit, joinRoom, leaveRoom }}>
            {children}
        </SocketContext.Provider>
    );
};

export default SocketProvider;

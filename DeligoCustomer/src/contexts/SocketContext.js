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

            // CRITICAL: Vercel required configuration
            // 1. Define your URL (Must match Vendor App's active env)
            const BASE_URL = 'https://deligo-food-backend.vercel.app';

            console.debug('[Socket] Connecting to:', BASE_URL);

            const newSocket = io(BASE_URL, {
                auth: { token },
                transports: ['polling'], // CRITICAL: Vercel does not support websockets initially, must use polling
                reconnection: true,
                reconnectionAttempts: 10,
                reconnectionDelay: 1000,
                forceNew: true,
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
                console.warn('[Socket] Connection Error:', err.message);
                setIsConnected(false);
            });

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

    // Helper to join a specific room (e.g. order tracking)
    const joinRoom = useCallback((eventName, payload) => {
        if (socketRef.current && socketRef.current.connected) {
            console.debug('[Socket] Joining room:', eventName, payload);
            socketRef.current.emit(eventName, payload);
        } else {
            console.warn('[Socket] Cannot join room, socket not connected');
        }
    }, []);

    // Helper to leave a room (if backend supports explicit leave, or just for cleanup logic)
    const leaveRoom = useCallback((eventName, payload) => {
        if (socketRef.current && socketRef.current.connected) {
            // Note: Standard socket.io logic usually handles leave via specific events too
            // If your backend expects a 'leave-conversation' or similar, use that.
            // Only emit if the backend documentation specifies a leave event.
            if (eventName) {
                socketRef.current.emit(eventName, payload);
            }
        }
    }, []);

    // Initialize on mount
    useEffect(() => {
        connect();
        return () => {
            disconnect();
        };
    }, [connect, disconnect]);

    // Re-connect on focus or network change could be added here

    return (
        <SocketContext.Provider value={{ socket, isConnected, connect, disconnect, joinRoom, leaveRoom }}>
            {children}
        </SocketContext.Provider>
    );
};

export default SocketProvider;

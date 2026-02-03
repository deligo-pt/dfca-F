import io from 'socket.io-client';
import { customerApi } from '../utils/api';
import { API_CONFIG } from '../constants/config';
import AuthService from '../utils/auth';

class ChatService {
    constructor() {
        this.socket = null;
        this.listeners = new Map();
    }

    // Accept token as argument, but default to fetching from AuthService
    async initializeSocket(explicitToken = null) {
        if (this.socket && this.socket.connected) return;

        console.log('ChatService: Initializing socket...');
        let token = explicitToken;

        // Strategy 1: AuthService (Reliable Source)
        if (!token) {
            console.log('ChatService: No explicit token, trying AuthService.getAccessToken()...');
            token = await AuthService.getAccessToken();
        }

        // Strategy 2: API Client Headers (Fallback)
        if (!token && customerApi.defaults.headers.common['Authorization']) {
            const authHeader = customerApi.defaults.headers.common['Authorization'];
            console.log('ChatService: API Headers Auth:', authHeader);
            token = authHeader.replace('Bearer ', '');
        }

        if (!token) {
            console.warn('ChatService: CRITICAL - No token found via AuthService or headers. Cannot connect socket.');
            return;
        }

        // Ensure we are using the base URL without /api/v1 suffix if possible, 
        // as socket.io usually mounts on root. API_CONFIG.BASE_URL is the root.
        const socketUrl = API_CONFIG.BASE_URL;
        console.log('ChatService: Connecting to socket at', socketUrl);

        this.socket = io(socketUrl, {
            auth: {
                token: token, // Common: socket.handshake.auth.token
            },
            query: {
                token: token, // Common: socket.handshake.query.token
            },
            // Allow websocket upgrade if supported, but start with polling for Vercel compatibility
            transports: ['polling', 'websocket'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            timeout: 20000, // Increased timeout
            extraHeaders: {
                Authorization: `Bearer ${token}`,
                'x-auth-token': token,
            },
            jsonp: false,
            forceNew: true,
        });

        this.socket.on('connect', () => {
            console.log('ChatService: Socket connected', this.socket.id);
            this.listeners.forEach((callback, event) => {
                this.socket.on(event, callback);
            });
        });

        this.socket.on('disconnect', (reason) => {
            console.log('ChatService: Socket disconnected:', reason);
        });

        this.socket.on('connect_error', (error) => {
            console.error('ChatService: Connection error:', error);
        });

        this.listeners.forEach((callback, event) => {
            this.socket.on(event, callback);
        });
    }

    on(event, callback) {
        this.listeners.set(event, callback);
        if (this.socket) {
            this.socket.on(event, callback);
        }
    }

    off(event) {
        this.listeners.delete(event);
        if (this.socket) {
            this.socket.off(event);
        }
    }

    emit(event, data) {
        if (this.socket) {
            this.socket.emit(event, data);
        } else {
            console.warn('ChatService: Socket instance is null, cannot emit', event);
        }
    }

    // Socket Emitters
    joinConversation(room) {
        this.emit('join-conversation', { room });
    }

    leaveConversation(room) {
        this.emit('leave-conversation', { room });
    }

    sendMessageSocket(room, message, attachments = [], replyTo = null) {
        this.emit('send-message', { room, message, attachments, replyTo });
    }

    sendTyping(room, isTyping) {
        this.emit('typing', { room, isTyping });
    }

    markReadSocket(room) {
        this.emit('mark-read', { room });
    }

    closeConversationSocket(room) {
        this.emit('close-conversation', { room });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.listeners.clear();
    }

    // REST API Methods
    async initiateConversation() {
        return customerApi.post('/support/conversation');
    }

    async getConversations() {
        return customerApi.get('/support/conversations');
    }

    async getMessages(room, page = 1, limit = 50) {
        return customerApi.get(`/support/conversations/${room}/messages?page=${page}&limit=${limit}`);
    }

    async markRead(room) {
        return customerApi.patch(`/support/conversations/${room}/read`);
    }

    async closeConversation(room) {
        return customerApi.patch(`/support/conversations/${room}/close`);
    }

    async uploadAttachment(file) {
        const formData = new FormData();
        formData.append('file', {
            uri: file.uri,
            name: file.name || 'attachment.jpg',
            type: file.mimeType || file.type || 'image/jpeg',
        });

        // Use direct fetch for multipart/form-data to avoid axios transform issues
        const token = await AuthService.getAccessToken();

        // We need the full API URL for the fetch call (e.g. including /api/v1 if that's where the upload endpoint is)
        // Usually file uploads are under /api/v1/support/upload based on the original code
        // We can reconstruct it from API_CONFIG
        const uploadUrl = API_CONFIG.BASE_URL + '/api/v1/support/upload';

        const response = await fetch(uploadUrl, {
            method: 'POST',
            body: formData,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'multipart/form-data',
            },
        });

        const data = await response.json();
        return data;
    }
}

export default new ChatService();

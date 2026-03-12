import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Image,
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

// Use Theme and Language Contexts from the Customer App structure
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../utils/LanguageContext';
import { useProfile } from '../contexts/ProfileContext';
import { useSocket } from '../contexts/SocketContext';

// Import our new service
import ChatService from '../services/ChatService';
import AuthService from '../utils/auth';

// Document Picker for attachments
import * as DocumentPicker from 'expo-document-picker';

// Safely import NetInfo with fallback
let NetInfo = null;
try {
    NetInfo = require('@react-native-community/netinfo').default;
} catch (error) {
    console.warn('[LiveChatScreen] NetInfo native module not available:', error.message);
}

const { width } = Dimensions.get('window');

const LiveChatScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { colors } = useTheme();
    const { t } = useLanguage();
    const { user: profile } = useProfile(); // Customer app uses 'user' in context
    const insets = useSafeAreaInsets();

    const { orderId, transactionId, issueType } = route.params || {};

    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState(issueType || '');
    const [isTyping, setIsTyping] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [isInternetReachable, setIsInternetReachable] = useState(true);
    const [roomId, setRoomId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [agentName, setAgentName] = useState(null);
    const [chatStatus, setChatStatus] = useState('OPEN');

    const flatListRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    // Animations
    const sendButtonScale = useRef(new Animated.Value(0)).current;
    const offlineBannerHeight = useRef(new Animated.Value(0)).current;

    // Use global socket context
    const { socket, isConnected: socketConnected, joinRoom, leaveRoom } = useSocket();

    useEffect(() => {
        setIsConnected(socketConnected);
    }, [socketConnected]);

    const setupChat = async () => {
        console.log('[LiveChat] setupChat STARTED');
        setIsLoading(true);
        setHasError(false);
        try {
            const token = await AuthService.getAccessToken();
            if (!token) {
                Alert.alert(t('sessionExpired') || 'Session Expired', t('pleaseLoginAgain') || 'Please login again to access support chat.');
                setIsLoading(false);
                return;
            }

            // Note: Socket is already initialized by SocketContext

            // Initiate or get active conversation
            console.log('[LiveChat] calling ChatService.initiateConversation()...');
            const response = await ChatService.initiateConversation();
            const responseBody = response.data || response;
            const roomData = responseBody.data || responseBody;

            // Normalize room ID location in response
            console.log('[LiveChat] Parsing Room Data:', JSON.stringify(roomData, null, 2));
            const room = roomData.room || roomData._id || (roomData.conversation ? roomData.conversation.room : null);
            console.log('[LiveChat] Resolved Room:', room);

            if (room) {
                setRoomId(room);
                const status = roomData.status || roomData.conversation?.status || 'OPEN';
                const handledBy = roomData.handledBy || roomData.conversation?.handledBy;

                setChatStatus(status);
                if (handledBy) {
                    const agentName = typeof handledBy === 'string' ? 'Agent' : (handledBy.name?.firstName || handledBy.firstName || 'Agent');
                    setAgentName(agentName);
                }

                // Join the socket room using Context method
                console.log('[LiveChat] Joining room via SocketContext:', room);
                joinRoom('join-conversation', { room });

                // Load history
                console.log('[LiveChat] Fetching history for room:', room);
                const historyResponse = await ChatService.getMessages(room);
                if (historyResponse) {
                    const historyBody = historyResponse.data || historyResponse;
                    const historyData = historyBody.data || historyBody;
                    const history = Array.isArray(historyData) ? historyData : (historyData.messages || historyData.data || []);

                    if (Array.isArray(history)) {
                        setMessages(history.reverse());
                    }
                }
            } else {
                console.error("[LiveChat] CRITICAL: No room ID found in response.");
                setHasError(true);
            }
        } catch (error) {
            console.error('[LiveChat] Error setting up chat:', error);
            if (error.response) {
                console.error('[LiveChat] HTTP Status:', error.response.status);
                console.error('[LiveChat] HTTP Data:', JSON.stringify(error.response.data, null, 2));
            }
            setHasError(true);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        Animated.spring(sendButtonScale, {
            toValue: inputText.trim() ? 1 : 0,
            useNativeDriver: true,
            friction: 5,
        }).start();
    }, [inputText]);

    // Offline Banner Animation
    useEffect(() => {
        Animated.timing(offlineBannerHeight, {
            toValue: isInternetReachable ? 0 : 40,
            duration: 300,
            useNativeDriver: false,
        }).start();
    }, [isInternetReachable]);

    useEffect(() => {
        let mounted = true;

        // Subscribe to network state
        let unsubscribeNetInfo = () => { };
        try {
            if (NetInfo && typeof NetInfo.addEventListener === 'function') {
                unsubscribeNetInfo = NetInfo.addEventListener(state => {
                    setIsInternetReachable(state.isConnected && state.isInternetReachable !== false);
                });
            }
        } catch (error) {
            console.warn('Failed to initialize NetInfo:', error);
        }

        setupChat();

        // Socket Listeners (Using global socket)
        if (socket) {
            const handleNewMessage = (data) => {
                console.log('[LiveChat] Raw new-message data:', JSON.stringify(data, null, 2));

                // Properly normalize the message object
                // data could be: { message: "text" }, { message: { text: "..." } }, or the full message object itself
                let message;
                if (typeof data === 'string') {
                    message = { message: data, text: data };
                } else if (typeof data.message === 'string') {
                    // data.message is the text content directly
                    message = { ...data, text: data.message };
                } else if (data.message && typeof data.message === 'object') {
                    // data.message is the full message object
                    message = data.message;
                } else {
                    // data itself is the message object
                    message = data;
                }

                console.log('[LiveChat] Normalized message:', JSON.stringify(message, null, 2));
                setMessages((prev) => {
                    if (message._id && prev.some(m => m._id === message._id)) return prev;
                    return [...prev, message];
                });
                if (roomId) socket.emit('mark-read', { room: roomId });
            };

            const handleTyping = (data) => {
                const myId = profile?.userId || profile?._id || profile?.id;
                if (data.userId !== myId) {
                    setIsTyping(data.isTyping);
                }
            };

            const handleError = (error) => {
                console.warn('[LiveChat] Socket Error:', error);
            };

            // Register listeners
            socket.on('new-message', handleNewMessage);
            socket.on('user-typing', handleTyping);
            socket.on('chat-error', handleError);

            // Cleanup listeners
            return () => {
                mounted = false;
                if (roomId) leaveRoom('leave-conversation', { room: roomId });
                socket.off('new-message', handleNewMessage);
                socket.off('user-typing', handleTyping);
                socket.off('chat-error', handleError);
                try { unsubscribeNetInfo(); } catch (e) { }
            };
        }

        return () => {
            mounted = false;
            try { unsubscribeNetInfo(); } catch (e) { }
        };
    }, [socket, roomId]);

    // Re-attempt setup if internet comes back
    useEffect(() => {
        if (isInternetReachable && hasError) {
            setupChat();
        }
    }, [isInternetReachable]);

    // Re-join room if socket connects (handled by Context mostly, but good to ensure) & Re-fetch messages
    useEffect(() => {
        if (socketConnected && roomId && joinRoom) {
            console.log('[LiveChat] Socket reconnected, re-joining room:', roomId);
            joinRoom('join-conversation', { room: roomId });

            // Refetch messages to ensure nothing was missed while disconnected
            const fetchMessages = async () => {
                try {
                    console.log('[LiveChat] Re-fetching messages on reconnect...');
                    const historyResponse = await ChatService.getMessages(roomId);
                    if (historyResponse) {
                        const historyBody = historyResponse.data || historyResponse;
                        const historyData = historyBody.data || historyBody;
                        const history = Array.isArray(historyData) ? historyData : (historyData.messages || historyData.data || []);

                        if (Array.isArray(history)) {
                            setMessages(history.reverse());
                        }
                    }
                } catch (error) {
                    console.warn('[LiveChat] Failed to re-fetch messages:', error);
                }
            };
            fetchMessages();
        }
    }, [socketConnected, roomId, joinRoom]);

    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const handleInputChange = (text) => {
        setInputText(text);
        if (roomId && socketConnected && socket) {
            socket.emit('typing', { room: roomId, isTyping: text.length > 0 });

            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
                socket.emit('typing', { room: roomId, isTyping: false });
            }, 3000);
        }
    };

    const handleAttachment = async () => {
        if (!isInternetReachable) {
            Alert.alert(t('offline') || "Offline", t('checkInternet') || "Please check your internet connection.");
            return;
        }
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['image/*', 'application/pdf'],
                copyToCacheDirectory: true,
            });

            if (result.canceled) return;

            const file = result.assets ? result.assets[0] : result;

            const uploadResponse = await ChatService.uploadAttachment(file);

            if (uploadResponse && (uploadResponse.parsedUrl || uploadResponse.url)) {
                if (socket) {
                    socket.emit('send-message', {
                        room: roomId,
                        message: '',
                        attachments: [uploadResponse.parsedUrl || uploadResponse.url],
                        replyTo: null
                    });
                }
            } else {
                Alert.alert(t('error') || "Error", t('uploadFailed') || "Failed to upload file.");
            }
        } catch (err) {
            console.error("Attachment error:", err);
            Alert.alert(t('error') || "Error", t('filePickError') || "Could not pick file.");
        }
    };

    const sendMessage = () => {
        if (inputText.trim() === '' || !roomId || !socket) return;

        if (!isInternetReachable) {
            Alert.alert(t('offline') || "Offline", t('messageOfflineError') || "Message will be sent when you are back online.");
            return;
        }

        // Send message
        socket.emit('send-message', { room: roomId, message: inputText, attachments: [], replyTo: null });
        setInputText('');
        socket.emit('typing', { room: roomId, isTyping: false });
    };

    const renderMessage = ({ item, index }) => {
        const myId = profile?.userId || profile?._id || profile?.id;

        // Determine if this message is from ME
        const isUser = item.sender === myId || item.senderId === myId || item.sender === 'user' || item.role === 'customer';

        const isFollowUp = index > 0 && (
            messages[index - 1].sender === item.sender ||
            messages[index - 1].senderId === item.senderId
        );

        // Date separator logic can be added here if needed

        return (
            <View style={[
                styles.messageRow,
                isUser ? styles.userMessageRow : styles.agentMessageRow,
                isFollowUp ? { marginTop: 4 } : { marginTop: 16 }
            ]}>
                {!isUser && (
                    <View style={[styles.avatarContainer, { opacity: isFollowUp ? 0 : 1 }]}>
                        {/* Show avatar only for first message in chain, but keep space */}
                        <LinearGradient
                            colors={['#FF9A9E', colors.primary]}
                            style={styles.avatarGradient}
                        >
                            <Text style={styles.avatarText}>
                                {agentName ? agentName.charAt(0).toUpperCase() : 'S'}
                            </Text>
                        </LinearGradient>
                    </View>
                )}

                <View style={[
                    styles.bubbleContainer,
                    isUser ? styles.userBubbleContainer : styles.agentBubbleContainer
                ]}>
                    {isUser ? (
                        <LinearGradient
                            colors={[colors.primary, '#FF6B9D']} // Modern gradient
                            start={{ x: 0.2, y: 0 }}
                            end={{ x: 0.8, y: 1 }}
                            style={[
                                styles.bubble,
                                styles.userBubble,
                                isFollowUp && styles.userBubbleFollowUp
                            ]}
                        >
                            {renderBubbleContent(item, true)}
                        </LinearGradient>
                    ) : (
                        <View style={[
                            styles.bubble,
                            styles.agentBubble,
                            { backgroundColor: colors.isDarkMode ? '#2C2C2C' : '#FFFFFF' }, // Clean white for agents
                            isFollowUp && styles.agentBubbleFollowUp
                        ]}>
                            {renderBubbleContent(item, false)}
                        </View>
                    )}
                </View>
            </View>
        );
    };

    const renderBubbleContent = (item, isUser) => (
        <View style={styles.bubbleContent}>
            {item.attachments && item.attachments.length > 0 && (
                <View style={styles.attachmentsContainer}>
                    {item.attachments.map((url, i) => (
                        <TouchableOpacity
                            key={i}
                            style={styles.attachmentWrapper}
                            onPress={() => {/* Handle image view */ }}
                        >
                            {url.endsWith('.pdf') ? (
                                <View style={[styles.pdfAttachment, { borderColor: isUser ? 'rgba(255,255,255,0.3)' : colors.border }]}>
                                    <Ionicons name="document-text" size={24} color={isUser ? '#FFF' : colors.primary} />
                                    <Text style={[styles.pdfText, { color: isUser ? '#FFF' : colors.text.primary }]} numberOfLines={1}>
                                        Document
                                    </Text>
                                </View>
                            ) : (
                                <Image source={{ uri: url }} style={styles.attachmentImage} />
                            )}
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {(item.text || item.content || item.message) ? (
                <Text style={[
                    styles.messageText,
                    isUser ? styles.userMessageText : { color: colors.text.primary }
                ]}>
                    {item.text || item.content || item.message}
                </Text>
            ) : null}

            <View style={styles.metaContainer}>
                <Text style={[
                    styles.timeStamp,
                    isUser ? styles.userTimeStamp : { color: colors.text.secondary || '#999' }
                ]}>
                    {formatTime(item.timestamp || item.createdAt)}
                    {isUser && (
                        <Ionicons
                            name="checkmark-done"
                            size={14}
                            color="rgba(255,255,255,0.7)"
                            style={{ marginLeft: 4 }}
                        />
                    )}
                </Text>
            </View>
        </View>
    );

    const getStatusText = () => {
        if (!isInternetReachable) return t('waitingForNetwork') || 'Waiting for network...';
        if (isConnected) return t('activeNow') || 'Active now';
        return t('connecting') || 'Connecting...';
    };

    const getStatusColor = () => {
        if (!isInternetReachable) return colors.error || '#F44336';
        if (isConnected) return '#4CAF50';
        return '#B0BEC5';
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
            {/* Main Background Color - distinct from chat bubbles */}
            <View style={{ height: insets.top, backgroundColor: colors.surface }} />

            {/* Header - Raised Card Style */}
            <View style={[styles.header, { backgroundColor: colors.surface, shadowColor: colors.shadow }]}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
                </TouchableOpacity>

                <View style={styles.headerContent}>
                    <View style={styles.headerAvatarContainer}>
                        <LinearGradient
                            colors={['#FF9A9E', colors.primary]}
                            style={styles.headerAvatar}
                        >
                            <Text style={styles.headerAvatarText}>
                                {agentName ? agentName.charAt(0).toUpperCase() : 'S'}
                            </Text>
                            {isConnected && <View style={styles.headerOnlineBadge} />}
                        </LinearGradient>
                    </View>

                    <View>
                        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
                            {agentName || t('supportTeam') || 'Support Team'}
                        </Text>
                        <Text style={[styles.statusText, { color: isConnected ? colors.success : colors.text.secondary }]}>
                            {getStatusText()}
                        </Text>
                    </View>
                </View>

                <TouchableOpacity style={styles.menuButton}>
                    <Ionicons name="ellipsis-vertical" size={24} color={colors.text.primary} />
                </TouchableOpacity>
            </View>

            {/* Context Banner - Floating Card */}
            {(orderId || transactionId) && (
                <View style={styles.bannerWrapper}>
                    <View style={[styles.contextBanner, { backgroundColor: colors.surface, shadowColor: colors.shadow }]}>
                        <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <View style={[styles.iconBox, { backgroundColor: colors.primary + '15' }]}>
                                    <Ionicons name={orderId ? "receipt" : "card"} size={14} color={colors.primary} />
                                </View>
                                <Text style={[styles.contextText, { color: colors.text.primary }]}>
                                    {orderId
                                        ? <>{t('order') || 'Order'} <Text style={{ fontFamily: 'Poppins-SemiBold' }}>#{String(orderId).slice(-6)}</Text></>
                                        : <>{t('transaction') || 'Tx'} <Text style={{ fontFamily: 'Poppins-SemiBold' }}>#{String(transactionId)}</Text></>
                                    }
                                </Text>
                            </View>
                        </View>
                        <View style={[styles.priorityBadge, { backgroundColor: '#FFF0F3', borderColor: '#FFB8C6', borderWidth: 1 }]}>
                            <Text style={[styles.priorityText, { color: colors.primary }]}>{t('help') || 'HELP'}</Text>
                        </View>
                    </View>
                </View>
            )}

            {/* Offline Banner */}
            <Animated.View style={[styles.offlineBanner, { height: offlineBannerHeight, backgroundColor: '#344955' }]}>
                <Ionicons name="cloud-offline-outline" size={14} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.offlineText}>{t('noInternet') || 'No internet connection'}</Text>
            </Animated.View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                {/* Content Area */}
                <View style={[styles.contentContainer, { backgroundColor: colors.background }]}>
                    {isLoading ? (
                        <View style={styles.centerContainer}>
                            <ActivityIndicator size="large" color={colors.primary} />
                        </View>
                    ) : hasError && !isLoading ? (
                        <View style={styles.centerContainer}>
                            <View style={[styles.errorIconCircle, { backgroundColor: '#FFEBEE' }]}>
                                <Ionicons name="cloud-offline" size={32} color={colors.error || '#F44336'} />
                            </View>
                            <Text style={[styles.errorTitle, { color: colors.text.primary }]}>
                                {t('connectionFailed') || 'Connection Failed'}
                            </Text>
                            <Text style={[styles.errorText, { color: colors.text.secondary }]}>
                                {t('connFailedDesc') || "We couldn't connect to the support chat."}
                            </Text>
                            <TouchableOpacity
                                style={[styles.retryButton, { backgroundColor: colors.primary }]}
                                onPress={setupChat}
                            >
                                <Text style={styles.retryButtonText}>{t('tryAgain') || 'Retry'}</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <FlatList
                            ref={flatListRef}
                            data={messages}
                            renderItem={renderMessage}
                            keyExtractor={(item) => item._id || item.id || Math.random().toString()}
                            contentContainerStyle={styles.listContent}
                            showsVerticalScrollIndicator={false}
                            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                            ListEmptyComponent={
                                <View style={styles.centerContainer}>
                                    <Image
                                        source={require('../assets/icon.png')}
                                        style={{ width: 60, height: 60, opacity: 0.2, marginBottom: 20 }}
                                        resizeMode="contain"
                                    />
                                    <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
                                        {t('howCanWeHelp') || "Hi! How can we help you today?"}
                                    </Text>
                                </View>
                            }
                            ListFooterComponent={
                                isTyping ? (
                                    <View style={styles.typingRow}>
                                        <View style={styles.avatarContainer}>
                                            <View style={[styles.avatarGradient, { backgroundColor: '#EEE' }]}>
                                                <Text style={{ fontSize: 10 }}>...</Text>
                                            </View>
                                        </View>
                                        <View style={[styles.typingBubble, { backgroundColor: colors.surface }]}>
                                            <View style={styles.typingDot} />
                                            <View style={[styles.typingDot, { animationDelay: '0.2s' }]} />
                                            <View style={[styles.typingDot, { animationDelay: '0.4s' }]} />
                                        </View>
                                    </View>
                                ) : <View style={{ height: 10 }} />
                            }
                        />
                    )}
                </View>

                {/* Input Area - Clean & Modern */}
                {chatStatus === 'CLOSED' ? (
                    <View style={[styles.closedBanner, { backgroundColor: colors.surface }]}>
                        <Ionicons name="lock-closed-outline" size={18} color={colors.text.secondary} />
                        <Text style={{ color: colors.text.secondary, marginLeft: 8, fontFamily: 'Poppins-Medium' }}>
                            {t('chatClosed') || "This conversation has ended."}
                        </Text>
                    </View>
                ) : (
                    <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
                        <TouchableOpacity
                            style={styles.attachButton}
                            onPress={handleAttachment}
                            disabled={!isInternetReachable}
                        >
                            <Ionicons name="add-circle-outline" size={28} color={isInternetReachable ? colors.primary : colors.text.secondary} />
                        </TouchableOpacity>

                        <View style={[styles.inputFieldContainer, { backgroundColor: colors.background }]}>
                            <TextInput
                                style={[styles.input, { color: colors.text.primary }]}
                                placeholder={isInternetReachable ? (t('typeMessage') || "Type a message...") : (t('waitingNetwork') || "Waiting for network...")}
                                placeholderTextColor={colors.text.secondary}
                                value={inputText}
                                onChangeText={handleInputChange}
                                multiline
                                maxLength={1000}
                                editable={isInternetReachable}
                            />
                        </View>

                        <Animated.View style={{ transform: [{ scale: sendButtonScale }] }}>
                            <TouchableOpacity
                                style={[
                                    styles.sendButton,
                                    { backgroundColor: isInternetReachable ? colors.primary : '#E0E0E0' }
                                ]}
                                onPress={sendMessage}
                                disabled={!inputText.trim() || !isInternetReachable}
                            >
                                <Ionicons name="arrow-up" size={20} color="#FFF" />
                            </TouchableOpacity>
                        </Animated.View>
                    </View>
                )}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        elevation: 4,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        zIndex: 10,
    },
    backButton: {
        padding: 4,
        marginRight: 8,
    },
    headerContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerAvatarContainer: {
        marginRight: 12,
        position: 'relative',
    },
    headerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerAvatarText: {
        color: '#FFF',
        fontSize: 18,
        fontFamily: 'Poppins-Bold',
    },
    headerOnlineBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#4CAF50',
        borderWidth: 2,
        borderColor: '#FFF',
    },
    headerTitle: {
        fontSize: 16,
        fontFamily: 'Poppins-SemiBold',
        marginBottom: 0,
    },
    statusText: {
        fontSize: 12,
        fontFamily: 'Poppins-Regular',
        marginTop: -2,
    },
    menuButton: {
        padding: 8,
    },
    bannerWrapper: {
        zIndex: 5,
        backgroundColor: 'transparent',
    },
    contextBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 10,
        marginHorizontal: 16,
        marginTop: 10,
        marginBottom: 5,
        borderRadius: 12,
        elevation: 2,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    iconBox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    contextText: {
        fontSize: 13,
        fontFamily: 'Poppins-Regular',
    },
    priorityBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    priorityText: {
        fontSize: 10,
        fontFamily: 'Poppins-Bold',
    },
    offlineBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        width: '100%',
    },
    offlineText: {
        color: '#FFF',
        fontSize: 12,
        fontFamily: 'Poppins-Medium',
    },
    contentContainer: {
        flex: 1,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingVertical: 20,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    errorIconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyText: {
        fontSize: 16,
        fontFamily: 'Poppins-Medium',
        textAlign: 'center',
        maxWidth: 240,
        lineHeight: 24,
    },
    errorTitle: {
        fontSize: 18,
        fontFamily: 'Poppins-SemiBold',
        marginBottom: 8,
        textAlign: 'center',
    },
    errorText: {
        fontSize: 14,
        fontFamily: 'Poppins-Regular',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },
    retryButton: {
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: 24,
    },
    retryButtonText: {
        color: '#FFF',
        fontFamily: 'Poppins-Medium',
        fontSize: 14,
    },

    // Message Styles
    messageRow: {
        flexDirection: 'row',
        marginBottom: 4,
        alignItems: 'flex-end',
    },
    userMessageRow: {
        justifyContent: 'flex-end',
    },
    agentMessageRow: {
        justifyContent: 'flex-start',
    },
    avatarContainer: {
        marginRight: 8,
        marginBottom: 4,
    },
    avatarGradient: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#FFF',
        fontSize: 12,
        fontFamily: 'Poppins-Bold',
    },
    bubbleContainer: {
        maxWidth: '78%',
    },
    userBubbleContainer: {
        alignItems: 'flex-end',
    },
    agentBubbleContainer: {
        alignItems: 'flex-start',
    },
    bubble: {
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 18,
        minWidth: 60,
    },
    userBubble: {
        borderBottomRightRadius: 2,
    },
    userBubbleFollowUp: {
        borderTopRightRadius: 4,
        borderBottomRightRadius: 2,
    },
    agentBubble: {
        borderBottomLeftRadius: 2,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
    },
    agentBubbleFollowUp: {
        borderTopLeftRadius: 4,
        borderBottomLeftRadius: 2,
    },
    bubbleContent: {
        flexDirection: 'column',
    },
    messageText: {
        fontSize: 15,
        fontFamily: 'Poppins-Regular',
        lineHeight: 21,
    },
    userMessageText: {
        color: '#FFF',
    },
    metaContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginTop: 2,
    },
    timeStamp: {
        fontSize: 10,
        fontFamily: 'Poppins-Regular',
    },
    userTimeStamp: {
        color: 'rgba(255,255,255,0.8)',
    },

    // Attachments
    attachmentsContainer: {
        marginBottom: 6,
    },
    attachmentWrapper: {
        marginBottom: 4,
        borderRadius: 12,
        overflow: 'hidden',
    },
    attachmentImage: {
        width: 180,
        height: 120,
        borderRadius: 12,
        resizeMode: 'cover',
    },
    pdfAttachment: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
        backgroundColor: 'rgba(0,0,0,0.02)',
    },
    pdfText: {
        marginLeft: 8,
        fontSize: 13,
        fontFamily: 'Poppins-Medium',
        maxWidth: 140,
    },

    // Input Area
    closedBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
    },
    inputWrapper: {
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
        flexDirection: 'row',
        alignItems: 'center',
    },
    attachButton: {
        padding: 8,
        marginRight: 4,
    },
    inputFieldContainer: {
        flex: 1,
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: Platform.OS === 'ios' ? 8 : 4,
        marginRight: 8,
        minHeight: 40,
        justifyContent: 'center',
    },
    input: {
        fontFamily: 'Poppins-Regular',
        fontSize: 15,
        maxHeight: 100,
        paddingTop: 0,
        paddingBottom: 0,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
    },

    // Typing
    typingRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginLeft: 8,
        marginBottom: 16,
    },
    typingBubble: {
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderRadius: 18,
        borderBottomLeftRadius: 2,
        flexDirection: 'row',
        alignItems: 'center',
        height: 40,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    typingDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#CCC',
        marginHorizontal: 2,
    },
});

export default LiveChatScreen;

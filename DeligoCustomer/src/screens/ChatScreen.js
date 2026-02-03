import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, KeyboardAvoidingView, Platform, StatusBar, ActivityIndicator, Alert, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLanguage } from '../utils/LanguageContext';
import { useTheme } from '../utils/ThemeContext';
import { useSocket } from '../contexts/SocketContext';
import { customerApi } from '../utils/api';
import StorageService from '../utils/storage';
import { API_ENDPOINTS } from '../constants/config';

/**
 * ChatScreen
 * 
 * Real-time customer support chat integrating Socket.io and REST API.
 * 
 * Features:
 * - Auto-initializes conversation via API.
 * - Real-time socket events: join, send, receive, typing.
 * - Admin typing indicators.
 * - Message history fetching.
 */
const ChatScreen = ({ navigation }) => {
  const { t } = useLanguage();
  const { colors, isDarkMode } = useTheme();
  const { socket, isConnected, joinRoom, leaveRoom } = useSocket();

  // State
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [roomId, setRoomId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [adminTyping, setAdminTyping] = useState(false);
  const [conversationStatus, setConversationStatus] = useState('OPEN'); // OPEN, IN_PROGRESS, CLOSED
  const [currentUser, setCurrentUser] = useState(null);

  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Memoize styles
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, insets), [colors, insets]);

  // 1. Initialize Conversation & User
  useEffect(() => {
    let mounted = true;

    const initChat = async () => {
      try {
        setIsLoading(true);

        // Get user info for ID check
        const user = await StorageService.getUser();
        if (mounted && user) setCurrentUser(user);

        // create or get conversation
        // POST /conversation - Should return { success: true, data: { _id, room, status, ... } }
        const res = await customerApi.post(API_ENDPOINTS.CHAT.INIT);

        if (res.data && res.data.success && res.data.data) {
          const conv = res.data.data;
          const room = conv.room || conv._id; // Use room code or ID

          if (mounted) {
            setRoomId(room);
            setConversationStatus(conv.status || 'OPEN');
            console.log('[Chat] Initialized room:', room);

            // Join via Socket - moved to useEffect to ensure connection
            // joinRoom('join-conversation', { room });

            // Fetch History
            // GET /conversations/:room/messages
            const historyUrl = API_ENDPOINTS.CHAT.MESSAGES.replace(':room', room);
            const historyRes = await customerApi.get(historyUrl);
            if (historyRes.data && historyRes.data.success) {
              // Assuming data.data is array of messages
              // Need to normalize if structure differs
              const msgs = historyRes.data.data || [];
              setMessages(msgs.reverse()); // Reverse because FlatList inverted? No, standard list is usually top-to-bottom.
              // If backend sends newest first, and we scroll to end... let's stick to standard order.
              // Actually, standard chat is: oldest at top, newest at bottom.
            }
          }
        }
      } catch (error) {
        console.error('[Chat] Init failed:', error);

        if (error.response && error.response.status === 404) {
          Alert.alert(t('error'), 'Chat service not available (404). Please contact admin.');
        } else {
          Alert.alert(t('error'), t('chatInitError') || 'Failed to connect to support.');
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    initChat();

    // Cleanup: leave room on unmount
    return () => {
      mounted = false;
      if (roomId) {
        leaveRoom('leave-conversation', { room: roomId }, (ack) => {
          console.log('[Chat] leave-conversation ack:', ack);
        });
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 2. Socket Listeners
  useEffect(() => {
    if (!socket || !roomId) return;

    // Listener: New Message
    const handleNewMessage = (encodedMsg) => {
      const message = encodedMsg;
      console.log('[Chat] New message:', message);

      setMessages(prev => {
        // Deduplication:
        if (prev.some(m => m._id === message._id)) return prev;

        // Optimistic replacement:
        const optimisticIndex = prev.findIndex(m => m.isOptimistic && m.text === (message.message || message.text));
        if (optimisticIndex !== -1) {
          const newArr = [...prev];
          newArr[optimisticIndex] = message;
          return newArr;
        }
        return [...prev, message];
      });
    };

    // Listener: Typing
    const handleTyping = (data) => {
      // { userId, name, isTyping }
      // Check if it's NOT the current user
      if (currentUser && data.userId !== currentUser._id) {
        setAdminTyping(data.isTyping);
      }
    };

    // Listener: Exception/Error
    const handleError = (err) => {
      console.warn('[Chat] Socket Error Event:', err);
    };

    // Listener: Conversation Closed
    const handleClosed = (data) => {
      console.log('[Chat] Conversation closed:', data);
      setConversationStatus('CLOSED');
      Alert.alert(t('chatClosed'), t('chatClosedMessage') || 'This support session has ended.');
    };

    socket.on('new-message', handleNewMessage);
    socket.on('user-typing', handleTyping);
    socket.on('conversation-closed', handleClosed);
    socket.on('error', handleError);

    return () => {
      socket.off('new-message', handleNewMessage);
      socket.off('user-typing', handleTyping);
      socket.off('conversation-closed', handleClosed);
      socket.off('error', handleError);
    };
  }, [socket, roomId, currentUser]); // eslint-disable-line react-hooks/exhaustive-deps

  // 3. Robust Join Logic (Fix race condition)
  // 3. Robust Join Logic (Fix race condition) & Re-fetch messages
  useEffect(() => {
    if (isConnected && roomId && socket) {
      console.log('[Chat] Socket connected, joining room:', roomId);
      joinRoom('join-conversation', { room: roomId }, (ack) => {
        console.log('[Chat] join-conversation ack:', ack);
      });

      // Refetch messages to ensure nothing was missed while disconnected
      const fetchMessages = async () => {
        try {
          console.log('[Chat] Re-fetching messages on reconnect...');
          const historyUrl = API_ENDPOINTS.CHAT.MESSAGES.replace(':room', roomId);
          const historyRes = await customerApi.get(historyUrl);
          if (historyRes.data && historyRes.data.success) {
            const msgs = historyRes.data.data || [];
            // Merge with existing or replace? Replace is safer to ensure consistency
            setMessages(msgs.reverse());
          }
        } catch (error) {
          console.warn('[Chat] Failed to re-fetch messages:', error);
        }
      };

      fetchMessages();
    }
  }, [isConnected, roomId, joinRoom, socket]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current.scrollToEnd({ animated: true });
      }, 200);
    }
  }, [messages, adminTyping]);

  // Handle Send
  const handleSendMessage = async () => {
    if (!inputText.trim() || !roomId) return;

    const textToSend = inputText.trim();
    setInputText('');

    // Optimistic Update
    const tempId = Date.now().toString();
    const optimisticMessage = {
      _id: tempId,
      text: textToSend,
      message: textToSend,
      sender: 'user',
      senderId: currentUser?._id,
      createdAt: new Date().toISOString(),
      isOptimistic: true
    };
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      if (socket && socket.connected) {
        setIsSending(true);
        const payload = {
          room: roomId,
          message: textToSend,
          attachments: [],
          replyTo: null
        };
        console.log('[Chat] Emitting send-message:', JSON.stringify(payload));

        socket.emit('send-message', payload, (ack) => {
          console.log('[Chat] Server Ack:', ack);
          setIsSending(false);
          if (ack && (ack.status === 'error' || ack.error)) {
            Alert.alert('Send Error', ack.message || 'Server rejected message');
          }
        });
        console.log('[Chat] Sent message via socket (waiting for ack)');
      } else {
        console.warn('[Chat] Socket not connected');
        Alert.alert(t('error'), t('connectionError') || 'Not connected.');
        setMessages(prev => prev.filter(m => m._id !== tempId));
        setInputText(textToSend);
      }
    } catch (error) {
      console.error('[Chat] Send error:', error);
      setIsSending(false);
      Alert.alert(t('error'), t('sendMessageError'));
      setMessages(prev => prev.filter(m => m._id !== tempId));
      setInputText(textToSend);
    }
  };



  // Handle Image Selection & Upload
  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await uploadAndSendImage(result.assets[0]);
      }
    } catch (error) {
      console.error('[Chat] Image picker error:', error);
      Alert.alert(t('error'), t('imagePickerError') || 'Failed to pick image');
    }
  };

  const uploadAndSendImage = async (asset) => {
    if (!roomId) return;

    setIsUploading(true);
    try {
      // 1. Prepare FormData
      const formData = new FormData();
      const filename = asset.uri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('file', {
        uri: asset.uri,
        name: filename,
        type: type,
      });

      // 2. Upload to specific endpoint
      // Using fetch directly because axios with FormData can be tricky in RN sometimes,
      // and we need a specific hardcoded URL as per requirements.
      const UPLOAD_URL = 'https://deligo-food-backend.vercel.app/api/v1/support/upload';

      const tokenObj = await StorageService.getAccessToken();
      const token = (tokenObj && typeof tokenObj === 'object') ? (tokenObj.accessToken || tokenObj.token || tokenObj.value) : tokenObj;

      const response = await fetch(UPLOAD_URL, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.message || 'Upload failed');
      }

      const imageUrl = json.url || json.data?.url; // Adjust based on actual response structure if needed, assuming 'url' or 'data.url'

      if (imageUrl) {
        // 3. Send message with attachment
        // Create optimistic message first
        const tempId = Date.now().toString();
        const optimisticMessage = {
          _id: tempId,
          text: '',
          message: '',
          attachments: [imageUrl],
          sender: 'user',
          senderId: currentUser?._id,
          createdAt: new Date().toISOString(),
          isOptimistic: true
        };
        setMessages(prev => [...prev, optimisticMessage]);

        if (socket && socket.connected) {
          socket.emit('send-message', {
            room: roomId,
            message: '',
            attachments: [imageUrl],
            replyTo: null
          });
          console.log('[Chat] Sent image message');
        } else {
          Alert.alert(t('error'), t('connectionError') || 'Socket disconnected');
          setMessages(prev => prev.filter(m => m._id !== tempId));
        }
      } else {
        throw new Error('No URL returned from upload');
      }

    } catch (error) {
      console.error('[Chat] Upload failed:', error);
      Alert.alert(t('error'), t('uploadError') || 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle Typing
  const handleInputChange = (text) => {
    setInputText(text);

    if (roomId && socket) {
      // Debounce typing status
      socket.emit('typing', { room: roomId, isTyping: true });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing', { room: roomId, isTyping: false });
      }, 2000);
    }
  };

  // Render Item
  const renderMessage = ({ item }) => {
    // Determine if message is from user (me) or support
    // Logic: if senderId === myId OR sender === 'user' (legacy)
    const isMe = (currentUser && item.senderId === currentUser._id) || item.sender === 'user';
    const isSystem = item.type === 'system';

    if (isSystem) {
      return (
        <View style={styles.systemMessageContainer}>
          <Text style={styles.systemMessageText}>{item.message || item.text}</Text>
        </View>
      );
    }

    return (
      <View style={[styles.messageContainer, isMe ? styles.userMessageContainer : styles.supportMessageContainer]}>
        <View style={[styles.messageBubble, isMe ? styles.userMessageBubble : styles.supportMessageBubble]}>

          {/* Render Text if present */}
          {(item.message || item.text) ? (
            <Text style={[styles.messageText, isMe ? styles.userMessageText : styles.supportMessageText]}>
              {item.message || item.text}
            </Text>
          ) : null}

          {/* Render Attachments */}
          {item.attachments && item.attachments.map((url, index) => (
            <TouchableOpacity key={index} onPress={() => {/* Maybe view full screen later */ }}>
              <Image
                source={{ uri: url }}
                style={[
                  styles.messageImage,
                  { marginTop: (item.message || item.text) ? 8 : 0 }
                ]}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ))}

        </View>
        <Text style={styles.messageTime}>
          {new Date(item.createdAt || item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent={true}
        animated={true}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{t('liveChat')}</Text>
          <View style={styles.onlineIndicator}>
            <View style={[styles.onlineDot, !isConnected && { backgroundColor: colors.error }]} />
            <Text style={[styles.onlineText, !isConnected && { color: colors.error }]}>
              {isConnected ? t('online') : t('offline')}
            </Text>
          </View>
        </View>
        <View style={styles.backButton} />
      </View>

      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => (item._id || item.id || Math.random()).toString()}
            style={styles.messagesList}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>{t('startConversation') || 'Start a conversation with support.'}</Text>
              </View>
            }
          />
        )}

        {/* Admin Typing Indicator */}
        {adminTyping && (
          <View style={styles.typingIndicator}>
            <View style={styles.typingBubble}>
              <Text style={styles.typingText}>{t('supportTyping') || 'Agent is typing'}</Text>
              <View style={styles.typingDots}>
                <View style={[styles.typingDot, { backgroundColor: colors.text.secondary }]} />
                <View style={[styles.typingDot, { backgroundColor: colors.text.secondary }]} />
                <View style={[styles.typingDot, { backgroundColor: colors.text.secondary }]} />
              </View>
            </View>
          </View>
        )}

        {/* Closed Banner */}
        {conversationStatus === 'CLOSED' && (
          <View style={styles.closedBanner}>
            <Text style={styles.closedText}>{t('chatSessionEnded')}</Text>
          </View>
        )}

        <View style={styles.inputContainer}>
          <TouchableOpacity
            style={styles.attachButton}
            onPress={handlePickImage}
            disabled={isUploading || conversationStatus === 'CLOSED'}
          >
            {isUploading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="images-outline" size={24} color={colors.primary} />
            )}
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder={conversationStatus === 'CLOSED' ? t('chatClosed') : t('typeMessage')}
            value={inputText}
            onChangeText={handleInputChange}
            placeholderTextColor={colors.text.light}
            multiline
            maxLength={500}
            editable={conversationStatus !== 'CLOSED'}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || isSending || conversationStatus === 'CLOSED') && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={!inputText.trim() || isSending || conversationStatus === 'CLOSED'}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Ionicons
                name="send"
                size={20}
                color={inputText.trim() ? colors.background : colors.text.secondary}
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const createStyles = (colors, insets) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    fontFamily: 'Poppins-SemiBold',
  },
  onlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
    marginRight: 6,
  },
  onlineText: {
    fontSize: 12,
    color: colors.success,
    fontFamily: 'Poppins-Medium',
  },
  chatContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    paddingTop: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.text.secondary,
    fontFamily: 'Poppins-Regular',
  },
  messagesList: {
    flex: 1,
    padding: 16,
  },
  messagesContent: {
    paddingBottom: 16,
    flexGrow: 1,
  },
  messageContainer: {
    marginBottom: 16,
    maxWidth: '80%',
  },
  userMessageContainer: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  supportMessageContainer: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  systemMessageContainer: {
    alignSelf: 'center',
    marginVertical: 12,
    backgroundColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  systemMessageText: {
    fontSize: 12,
    color: colors.text.secondary,
    fontFamily: 'Poppins-Regular',
  },
  messageBubble: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxWidth: '100%',
  },
  userMessageBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  supportMessageBubble: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  messageText: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    lineHeight: 22,
  },
  userMessageText: {
    color: colors.background,
  },
  supportMessageText: {
    color: colors.text.primary,
  },
  messageTime: {
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
    marginTop: 4,
    color: colors.text.secondary,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxWidth: '60%',
  },
  typingBubble: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingText: {
    fontSize: 14,
    color: colors.text.secondary,
    fontFamily: 'Poppins-Regular',
    marginRight: 8,
  },
  typingDots: {
    flexDirection: 'row',
  },
  typingDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginHorizontal: 2,
  },
  closedBanner: {
    backgroundColor: colors.surface,
    padding: 8,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  closedText: {
    color: colors.text.secondary,
    fontFamily: 'Poppins-Medium',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'android' ? Math.max(20, insets?.bottom + 12) : Math.max(12, insets?.bottom),
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    color: colors.text.primary,
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    marginRight: 12,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: 100,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachButton: {
    marginRight: 8,
    padding: 8,
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  sendButtonDisabled: {
    backgroundColor: colors.text.light,
  },
});

export default ChatScreen;

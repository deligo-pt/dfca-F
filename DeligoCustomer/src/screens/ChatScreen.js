import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../utils/LanguageContext';
import { useTheme } from '../utils/ThemeContext';

const ChatScreen = ({ navigation }) => {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: t('chatWelcomeMessage'),
      sender: 'support',
      timestamp: new Date(),
      isTyping: false,
    },
  ]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (currentMessage.trim() === '') return;

    const newMessage = {
      id: messages.length + 1,
      text: currentMessage.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prevMessages => [...prevMessages, newMessage]);
    setCurrentMessage('');

    // Simulate support response after a delay
    setIsTyping(true);
    setTimeout(() => {
      const supportResponse = {
        id: messages.length + 2,
        text: getSupportResponse(currentMessage.trim()),
        sender: 'support',
        timestamp: new Date(),
      };
      setMessages(prevMessages => [...prevMessages, supportResponse]);
      setIsTyping(false);
    }, 1500 + Math.random() * 1000); // Random delay between 1.5-2.5 seconds
  };

  const getSupportResponse = (userMessage) => {
    const responses = [
      t('supportResponse1'),
      t('supportResponse2'),
      t('supportResponse3'),
      t('supportResponse4'),
      t('supportResponse5'),
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item }) => (
    <View style={[styles.messageContainer, item.sender === 'user' ? styles.userMessageContainer : styles.supportMessageContainer]}>
      <View style={[styles.messageBubble, item.sender === 'user' ? styles.userMessageBubble : styles.supportMessageBubble]}>
        <Text style={[styles.messageText, item.sender === 'user' ? styles.userMessageText : styles.supportMessageText]}>
          {item.text}
        </Text>
      </View>
      <Text style={styles.messageTime}>{formatTime(item.timestamp)}</Text>
    </View>
  );

  const styles = StyleSheet.create({
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
    headerSubtitle: {
      fontSize: 14,
      color: colors.text.secondary,
      fontFamily: 'Poppins-Regular',
      marginTop: 2,
    },
    onlineIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
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
    messagesList: {
      flex: 1,
      padding: 16,
    },
    messagesContent: {
      paddingBottom: 16,
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
    },
    typingText: {
      fontSize: 14,
      color: colors.text.secondary,
      fontFamily: 'Poppins-Regular',
    },
    typingDots: {
      flexDirection: 'row',
      marginLeft: 8,
    },
    typingDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.text.secondary,
      marginHorizontal: 2,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
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
    sendButtonDisabled: {
      backgroundColor: colors.text.light,
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{t('liveChat')}</Text>
          <View style={styles.onlineIndicator}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>{t('online')}</Text>
          </View>
        </View>

        <View style={styles.backButton} />
      </View>

      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id.toString()}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />

        {isTyping && (
          <View style={styles.typingIndicator}>
            <View style={styles.typingBubble}>
              <Text style={styles.typingText}>{t('supportTyping')}</Text>
              <View style={styles.typingDots}>
                <View style={styles.typingDot} />
                <View style={styles.typingDot} />
                <View style={styles.typingDot} />
              </View>
            </View>
          </View>
        )}

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder={t('typeMessage')}
            value={currentMessage}
            onChangeText={setCurrentMessage}
            placeholderTextColor={colors.text.light}
            multiline
            maxLength={500}
            onSubmitEditing={handleSendMessage}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[styles.sendButton, !currentMessage.trim() && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={!currentMessage.trim()}
          >
            <Ionicons
              name="send"
              size={20}
              color={currentMessage.trim() ? colors.background : colors.text.secondary}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ChatScreen;

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fontSize } from '../theme';
import { useTheme } from '../utils/ThemeContext';

const NotificationsScreen = ({ navigation }) => {
  const { colors } = useTheme();

  const MOCK_NOTIFICATIONS = [
    {
      id: '1',
      type: 'order',
      title: 'Order Delivered',
      message: 'Your order from Burger King has been delivered. Enjoy your meal! 🍔',
      time: '2 mins ago',
      read: false,
      icon: 'cube-outline',
      color: colors.success
    },
    {
      id: '2',
      type: 'promo',
      title: '50% OFF Lunch Deal',
      message: 'Get 50% off on all Asian cuisines today from 12 PM to 3 PM. 🍜',
      time: '2 hours ago',
      read: true,
      icon: 'pricetag-outline',
      color: colors.warning
    },
    {
      id: '3',
      type: 'system',
      title: 'New Feature Available',
      message: 'Check out our new "Glovo Bubbles" for faster category browsing! 🚀',
      time: '1 day ago',
      read: true,
      icon: 'star-outline',
      color: colors.info
    },
    {
      id: '4',
      type: 'order',
      title: 'Order Confirmed',
      message: 'Restaurant "Pizza Hut" has confirmed your order. preparing now...',
      time: '1 day ago',
      read: true,
      icon: 'restaurant-outline',
      color: colors.secondary
    }
  ];

  const NotificationsList = () => (
    <View style={styles.listContainer}>
      {MOCK_NOTIFICATIONS.map((item) => (
        <TouchableOpacity key={item.id} style={[styles.notificationItem, !item.read && styles.unreadItem]}>
          <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
            <Ionicons name={item.icon} size={24} color={item.color} />
          </View>
          <View style={styles.textContainer}>
            <View style={styles.headerRow}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.time}>{item.time}</Text>
            </View>
            <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
          </View>
          {!item.read && <View style={styles.dot} />}
        </TouchableOpacity>
      ))}
    </View>
  );

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="notifications-off-outline" size={64} color={colors.text.light} />
      <Text style={styles.emptyTitle}>No Notifications</Text>
      <Text style={styles.emptyText}>You're all caught up! Check back later for updates.</Text>
    </View>
  );

  const getStyles = (colors) => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      padding: 4,
    },
    headerText: {
      fontSize: fontSize.lg,
      fontFamily: 'Poppins-SemiBold',
      color: colors.text.primary,
    },
    content: {
      padding: spacing.md,
      backgroundColor: colors.background,
    },
    listContainer: {
      gap: spacing.md,
    },
    notificationItem: {
      flexDirection: 'row',
      alignItems: 'start',
      padding: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: 16,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    unreadItem: {
      backgroundColor: colors.primary + '10',
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
    },
    textContainer: {
      flex: 1,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    title: {
      fontSize: fontSize.md,
      fontFamily: 'Poppins-SemiBold',
      color: colors.text.primary,
      flex: 1,
    },
    time: {
      fontSize: 12,
      color: colors.text.secondary,
      fontFamily: 'Poppins-Regular',
      marginLeft: 8,
    },
    message: {
      fontSize: fontSize.sm,
      color: colors.text.secondary,
      fontFamily: 'Poppins-Regular',
      lineHeight: 20,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
      marginTop: 6,
      marginLeft: 6,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 100,
    },
    emptyTitle: {
      fontSize: 18,
      fontFamily: 'Poppins-SemiBold',
      color: colors.text.primary,
      marginTop: 16,
    },
    emptyText: {
      fontSize: 14,
      color: colors.text.secondary,
      textAlign: 'center',
      marginTop: 8,
      width: '70%',
    },
  });

  const styles = getStyles(colors);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerText}>Notifications</Text>
        <TouchableOpacity>
          <Text style={{ color: colors.primary, fontFamily: 'Poppins-Medium', fontSize: 12 }}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {MOCK_NOTIFICATIONS.length > 0 ? <NotificationsList /> : <EmptyState />}
      </ScrollView>
    </SafeAreaView>
  );
};

export default NotificationsScreen;

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing, fontSize } from '../theme';

/**
 * NotificationPopup Component
 *
 * A sophisticated, animated notification toast designed for high-visibility alerts.
 * Features:
 * - Dynamic entrance/exit animations (slide, scale, fade).
 * - Context-aware visual styling (icons, gradients) based on notification type/status.
 * - Auto-dismissal with a visual countdown timer.
 * 
 * @param {Object} props
 * @param {Object} props.notification - Notification payload containing type, title, message, and status.
 * @param {boolean} props.visible - Controls the display state of the popup.
 * @param {Function} props.onPress - Callback triggered on user interaction.
 * @param {Function} props.onDismiss - Callback triggered when the popup closes (auto or manual).
 * @param {Object} props.colors - Theme palette for consistent styling.
 * @param {number} [props.duration=5000] - Display duration in milliseconds before auto-dismissal.
 */
const NotificationPopup = ({
  notification,
  visible,
  onPress,
  onDismiss,
  colors,
  duration = 5000
}) => {
  const slideAnim = useRef(new Animated.Value(-200)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const timerRef = useRef(null);

  useEffect(() => {
    if (visible && notification) {
      // Initialize animation states
      progressAnim.setValue(1);
      scaleAnim.setValue(0.9);
      opacityAnim.setValue(0);

      // Execute entrance sequence
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 10,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 80,
          friction: 10,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Start progress bar countdown
      Animated.timing(progressAnim, {
        toValue: 0,
        duration: duration,
        useNativeDriver: false,
      }).start();

      // Schedule auto-dismissal
      timerRef.current = setTimeout(() => {
        handleDismiss();
      }, duration);

      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
      };
    } else if (!visible) {
      // Execute exit sequence
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -200,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, notification]);

  const handleDismiss = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -200,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onDismiss) onDismiss();
    });
  };

  const handlePress = () => {
    handleDismiss();
    if (onPress) onPress(notification);
  };

  if (!notification) return null;

  /**
   * Determines the visual configuration (icon, color, label) based on notification type and status.
   */
  const getNotificationConfig = () => {
    const type = notification.type?.toUpperCase() || 'ORDER';
    const status = notification.data?.status || notification.data?.orderStatus;

    // Prioritize specific order statuses for tailored feedback
    if (type === 'ORDER' && status) {
      switch (status) {
        case 'ACCEPTED':
          return {
            icon: 'checkmark-circle',
            color: '#4CAF50',
            gradient: ['#4CAF50', '#45a049'],
            label: 'Order Accepted'
          };
        case 'PREPARING':
          return {
            icon: 'restaurant',
            color: '#FF9800',
            gradient: ['#FF9800', '#F57C00'],
            label: 'Preparing'
          };
        case 'READY_FOR_PICKUP':
          return {
            icon: 'bag-checked',
            color: '#2196F3',
            gradient: ['#2196F3', '#1976D2'],
            label: 'Ready',
            library: 'MaterialCommunityIcons'
          };
        case 'PICKED_UP':
          return {
            icon: 'bicycle',
            color: '#9C27B0',
            gradient: ['#9C27B0', '#7B1FA2'],
            label: 'Picked Up',
            library: 'MaterialCommunityIcons'
          };
        case 'ON_THE_WAY':
          return {
            icon: 'motorbike',
            color: '#00BCD4',
            gradient: ['#00BCD4', '#0097A7'],
            label: 'On The Way',
            library: 'MaterialCommunityIcons'
          };
        case 'DELIVERED':
          return {
            icon: 'package-variant-closed-check',
            color: '#4CAF50',
            gradient: ['#4CAF50', '#388E3C'],
            label: 'Delivered',
            library: 'MaterialCommunityIcons'
          };
        default:
          break;
      }
    }

    // Fallback detection based on title keywords if structured status is missing
    const title = notification.title?.toLowerCase() || '';
    if (title.includes('accepted')) {
      return {
        icon: 'checkmark-circle',
        color: '#4CAF50',
        gradient: ['#4CAF50', '#45a049'],
        label: 'Accepted'
      };
    }
    if (title.includes('rejected') || title.includes('canceled')) {
      return {
        icon: 'close-circle',
        color: '#F44336',
        gradient: ['#F44336', '#D32F2F'],
        label: 'Canceled'
      };
    }
    if (title.includes('preparing')) {
      return {
        icon: 'restaurant',
        color: '#FF9800',
        gradient: ['#FF9800', '#F57C00'],
        label: 'Preparing'
      };
    }
    if (title.includes('ready')) {
      return {
        icon: 'bag-checked',
        color: '#2196F3',
        gradient: ['#2196F3', '#1976D2'],
        label: 'Ready',
        library: 'MaterialCommunityIcons'
      };
    }
    if (title.includes('delivered')) {
      return {
        icon: 'package-variant-closed-check',
        color: '#4CAF50',
        gradient: ['#4CAF50', '#388E3C'],
        label: 'Delivered',
        library: 'MaterialCommunityIcons'
      };
    }
    if (title.includes('on the way') || title.includes('on_the_way')) {
      return {
        icon: 'motorbike',
        color: '#00BCD4',
        gradient: ['#00BCD4', '#0097A7'],
        label: 'On The Way',
        library: 'MaterialCommunityIcons'
      };
    }

    // Generic type-based configurations
    switch (type) {
      case 'ORDER':
        return {
          icon: 'cube',
          color: colors.primary,
          gradient: [colors.primary, colors.primaryDark || colors.primary],
          label: 'Order'
        };
      case 'PROMO':
        return {
          icon: 'pricetag',
          color: '#FF6B35',
          gradient: ['#FF6B35', '#E55A2B'],
          label: 'Promo'
        };
      case 'SYSTEM':
        return {
          icon: 'information-circle',
          color: '#607D8B',
          gradient: ['#607D8B', '#455A64'],
          label: 'System'
        };
      case 'ACCOUNT':
        return {
          icon: 'person-circle',
          color: '#3F51B5',
          gradient: ['#3F51B5', '#303F9F'],
          label: 'Account'
        };
      default:
        return {
          icon: 'notifications',
          color: colors.primary,
          gradient: [colors.primary, colors.primaryDark || colors.primary],
          label: 'Notification'
        };
    }
  };

  const config = getNotificationConfig();

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + 10,
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim }
          ],
          opacity: opacityAnim,
        },
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={handlePress}
        style={[styles.popup, { backgroundColor: colors.surface }]}
      >
        {/* Visual Accent Bar */}
        <LinearGradient
          colors={config.gradient}
          style={styles.accentBar}
        />

        {/* Icon Container */}
        <View style={styles.iconWrapper}>
          <LinearGradient
            colors={config.gradient}
            style={styles.iconGradient}
          >
            {config.library === 'MaterialCommunityIcons' ? (
              <MaterialCommunityIcons name={config.icon} size={22} color="#FFFFFF" />
            ) : (
              <Ionicons name={config.icon} size={22} color="#FFFFFF" />
            )}
          </LinearGradient>
          <View style={[styles.pulseRing, { borderColor: config.color + '40' }]} />
        </View>

        {/* Text Content */}
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <Text style={[styles.label, { color: config.color }]}>
              {config.label}
            </Text>
            <Text style={[styles.time, { color: colors.text.light }]}>
              Just now
            </Text>
          </View>
          <Text style={[styles.title, { color: colors.text.primary }]} numberOfLines={1}>
            {notification.title}
          </Text>
          <Text style={[styles.message, { color: colors.text.secondary }]} numberOfLines={2}>
            {notification.message}
          </Text>
        </View>

        {/* Dismissal Control */}
        <TouchableOpacity
          onPress={handleDismiss}
          style={[styles.closeButton, { backgroundColor: colors.background }]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={16} color={colors.text.light} />
        </TouchableOpacity>

        {/* Duration Indicator */}
        <View style={[styles.progressBarContainer, { backgroundColor: colors.border }]}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                width: progressWidth,
                backgroundColor: config.color,
              },
            ]}
          />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: 9999,
    elevation: 999,
  },
  popup: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    paddingLeft: spacing.md + 4,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  iconWrapper: {
    position: 'relative',
    marginRight: spacing.sm + 4,
  },
  iconGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 26,
    borderWidth: 2,
  },
  content: {
    flex: 1,
    marginRight: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  label: {
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  time: {
    fontSize: 10,
    fontFamily: 'Poppins-Regular',
  },
  title: {
    fontSize: fontSize.md,
    fontFamily: 'Poppins-SemiBold',
    marginBottom: 2,
  },
  message: {
    fontSize: fontSize.sm - 1,
    fontFamily: 'Poppins-Regular',
    lineHeight: 16,
  },
  closeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
  },
});

export default NotificationPopup;

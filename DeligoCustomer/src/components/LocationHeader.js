import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, StatusBar, Platform } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { spacing, fontSize } from '../theme';
import { useLanguage } from '../utils/LanguageContext';
import { useTheme } from '../utils/ThemeContext';

const STATUSBAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight : 0;

/**
 * LocationHeader Component
 * 
 * Main header for the home screen.
 * Displays greeting, location selector, notification badge, and search input.
 * 
 * @param {Object} props
 * @param {Object} props.location - Current location data.
 * @param {string} props.area - Display name of current area.
 * @param {boolean} props.loading - Loading state for location.
 * @param {Function} props.onLocationPress - Location selector handler.
 * @param {Function} props.onSearchPress - Search input handler.
 * @param {Array} props.categories - List of categories (optional).
 * @param {Function} props.onCategoryPress - Category press handler.
 * @param {string} [props.userName] - Display name of user.
 * @param {Function} props.onProfilePress - Profile button handler.
 * @param {Function} props.onNotificationPress - Notification button handler.
 * @param {number} [props.paddingTop=0] - Additional top padding.
 */
const LocationHeader = ({
  location,
  area,
  loading,
  onLocationPress,
  onSearchPress,
  categories = [],
  onCategoryPress,
  userName = null,
  onProfilePress,
  onNotificationPress,
  paddingTop = 0,
}) => {
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('goodMorning');
    if (hour < 18) return t('goodAfternoon');
    return t('goodEvening');
  };

  const greeting = userName ? `${getGreeting()}, ${userName} 👋` : `${getGreeting()} 👋`;

  return (
    <View style={styles(colors, isDarkMode).wrapper}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <View
        style={[styles(colors, isDarkMode).container, { backgroundColor: colors.primary, paddingTop: paddingTop }]}
      >
        {/* Header Top Row: Greeting & Profile */}
        <View style={styles(colors, isDarkMode).greetingRow}>
          <Text style={styles(colors, isDarkMode).greetingText}>{greeting}</Text>
          <TouchableOpacity
            style={styles(colors, isDarkMode).profileButton}
            onPress={onProfilePress}
          >
            <Ionicons name="person-circle-outline" size={32} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Header Middle Row: Location Selector & Notifications */}
        <View style={styles(colors, isDarkMode).locationRow}>
          <TouchableOpacity
            style={styles(colors, isDarkMode).locationButton}
            onPress={onLocationPress}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <View style={styles(colors, isDarkMode).locationContent}>
                <Ionicons name="location-sharp" size={14} color="#FFFFFF" />
                <Text style={styles(colors, isDarkMode).locationText} numberOfLines={1}>
                  {area || t('setYourLocation')}
                </Text>
                <Ionicons name="chevron-down" size={12} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles(colors, isDarkMode).notificationButton}
            onPress={onNotificationPress}
          >
            <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
            <View style={styles(colors, isDarkMode).notificationBadge} />
          </TouchableOpacity>
        </View>

        {/* Header Bottom Row: Search Entry Card */}
        <TouchableOpacity
          style={styles(colors, isDarkMode).searchCard}
          activeOpacity={0.9}
          onPress={onSearchPress}
        >
          <View style={styles(colors, isDarkMode).searchIconWrapper}>
            <Ionicons name="search" size={22} color={colors.primary} />
          </View>
          <Text style={styles(colors, isDarkMode).searchPlaceholder}>
            {t('searchPlaceholderHeader')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = (colors, isDarkMode) => StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  container: {
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs - 2,
  },
  greetingText: {
    color: '#FFFFFF',
    fontSize: fontSize.lg,
    fontFamily: 'Poppins-Bold',
    flex: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  profileButton: {
    marginLeft: spacing.sm,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingVertical: spacing.xs - 2,
  },
  locationContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    color: 'rgba(255, 255, 255, 0.95)',
    fontSize: fontSize.sm,
    fontFamily: 'Poppins-Medium',
    marginLeft: spacing.xs - 2,
    marginRight: spacing.xs - 3,
    maxWidth: 200,
  },
  notificationButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFD700',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginBottom: spacing.sm + spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  searchIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: fontSize.md,
    fontFamily: 'Poppins-Medium',
    color: colors.text.secondary,
  },
  categoriesScroll: {
    flexGrow: 0,
  },
  categoriesContent: {
    paddingRight: spacing.md,
  },
  categoryChip: {
    alignItems: 'center',
    marginRight: spacing.md,
    minWidth: 65,
  },
  categoryIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs - 2,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryIcon: {
    fontSize: 28,
  },
  categoryLabel: {
    fontSize: fontSize.xs,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

export default LocationHeader;

import React, { useState } from 'react';
import { Text, StyleSheet, TouchableOpacity, Animated, View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../utils/ThemeContext';
import { useLanguage } from '../../utils/LanguageContext';
import { logoutUser } from '../../utils/auth';

/**
 * LogoutButton Component
 * 
 * Standardized logout trigger with loading state handling.
 * Can be controlled internally or via external props.
 * 
 * @param {Object} props
 * @param {Function} [props.onLogoutPress] - Override default handler.
 * @param {boolean} [props.isLoggingOut] - External loading state.
 * @param {Animated.Value} [props.scaleAnim] - Animation driver.
 * @param {Function} [props.onLogoutSuccess] - Completion callback.
 */
const LogoutButton = ({ onLogoutPress, isLoggingOut: isLoggingOutProp, scaleAnim, onLogoutSuccess }) => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [localLoggingOut, setLocalLoggingOut] = useState(false);

  // Determine if logging out based on prop control or internal state
  const isLoggingOut = typeof isLoggingOutProp === 'boolean' ? isLoggingOutProp : localLoggingOut;

  /**
   * internalLogout
   *
   * Handles the logout process when no external handler is provided.
   * Manages local loading state and calls the auth utility.
   */
  const internalLogout = async () => {
    try {
      setLocalLoggingOut(true);
      const result = await logoutUser();

      if (result && result.success) {
        if (onLogoutSuccess) onLogoutSuccess();
      } else if (result && result.status === 401) {
        // Handle 401 as successful logout (session already expired)
        if (onLogoutSuccess) onLogoutSuccess();
      } else {
        console.warn('[LogoutButton] Logout failed:', result);
      }
    } catch (err) {
      console.error('[LogoutButton] Error during logout:', err);
    } finally {
      setLocalLoggingOut(false);
    }
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[
          styles.logoutButton,
          { backgroundColor: colors.surface, borderColor: colors.border },
          isLoggingOut && { opacity: 0.7 },
        ]}
        onPress={() => {
          // prioritize external handler if available
          if (onLogoutPress) return onLogoutPress();
          return internalLogout();
        }}
        activeOpacity={0.8}
        disabled={isLoggingOut}
      >
        <View style={[styles.logoutIconContainer, { backgroundColor: `${colors.error}15` }]}>
          <Ionicons name="log-out-outline" size={22} color={colors.error} />
        </View>

        {isLoggingOut ? (
          <ActivityIndicator size="small" color={colors.error} style={{ flex: 1 }} />
        ) : (
          <>
            <Text style={[styles.logoutText, { color: colors.error }]}>{t('logout')}</Text>
            <View style={styles.logoutArrow}>
              <Ionicons name="arrow-forward" size={20} color={colors.error} />
            </View>
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  logoutIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  logoutText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
  logoutArrow: {
    opacity: 0.7,
  },
});

export default LogoutButton;

import React from 'react';
import { Text, StyleSheet, TouchableOpacity, Animated, View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../utils/ThemeContext';
import { useLanguage } from '../../utils/LanguageContext';

const LogoutButton = ({ onLogoutPress, isLoggingOut, scaleAnim }) => {
  const { colors } = useTheme();
  const { t } = useLanguage();

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[
          styles.logoutButton,
          { backgroundColor: colors.surface, borderColor: colors.border },
          isLoggingOut && { opacity: 0.7 },
        ]}
        onPress={onLogoutPress}
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

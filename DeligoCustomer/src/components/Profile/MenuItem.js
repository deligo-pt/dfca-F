import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../utils/ThemeContext';

/**
 * MenuItem Component
 * 
 * Standard list item for profile and settings menus.
 * Supports icons, subtitles, and customizable styles.
 * 
 * @param {Object} props
 * @param {string} props.iconName - Ionicons name.
 * @param {string} props.title - Primary text.
 * @param {string} [props.subtitle] - Secondary text.
 * @param {Function} props.onPress - Interaction handler.
 * @param {boolean} [props.showDivider=true] - Toggle bottom separator.
 * @param {string} [props.iconColor] - Custom icon color override.
 */
const MenuItem = ({ iconName, title, subtitle, onPress, showDivider = true, iconColor }) => {
  const { colors, isDarkMode } = useTheme();
  const [pressed, setPressed] = useState(false);

  // Fallback color logic for the chevron icon
  const chevronColor = colors.text?.light || colors.text?.secondary || '#999';

  return (
    <>
      <TouchableOpacity
        style={[{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingVertical: 14,
        }]}
        onPress={onPress}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        activeOpacity={0.8}
      >
        {/* Icon Container with subtle background shape matching order icons */}
        <View style={[{
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 16,
          backgroundColor: pressed ? (isDarkMode ? '#333' : '#F0F0F0') : (isDarkMode ? 'rgba(255,255,255,0.06)' : '#FFF0F5'),
        }]}>
          <Ionicons
            name={iconName}
            size={22}
            color={iconColor || colors.primary}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={[{ fontSize: 16, fontFamily: 'Poppins-SemiBold', color: colors.text.primary }]}>{title}</Text>
          {subtitle && (
            <Text style={[{ fontSize: 13, fontFamily: 'Poppins-Regular', color: colors.text.secondary, marginTop: 2 }]}>{subtitle}</Text>
          )}
        </View>

        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: isDarkMode ? '#2A2A2A' : '#F9F9F9', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="chevron-forward" size={16} color={chevronColor} />
        </View>
      </TouchableOpacity>

      {/* Conditional Divider for list separation */}
      {showDivider && (
        <View style={[{ height: 1, backgroundColor: isDarkMode ? '#333' : '#F0F0F0', marginLeft: 80, marginRight: 20 }]} />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  menuIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 1,
  },
  menuIconContainerPressed: {
    transform: [{ scale: 0.95 }],
  },
  menuTextContainer: {
    flex: 1,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Poppins-Medium',
  },
  menuSubtitle: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    marginTop: 2,
  },
  menuDivider: {
    height: 1,
    marginLeft: 80,
  },
});

export default MenuItem;

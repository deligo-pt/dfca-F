import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../utils/ThemeContext'; // Adjust path as needed

const MenuItem = ({ iconName, title, subtitle, onPress, showDivider = true, iconColor }) => {
  const { colors } = useTheme();
  const [pressed, setPressed] = useState(false);

  const chevronColor = colors.text?.light || colors.text?.secondary || '#999';

  return (
    <>
      <TouchableOpacity
        style={styles.menuItem}
        onPress={onPress}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        activeOpacity={0.8}
      >
        <View style={[
          styles.menuIconContainer,
          { backgroundColor: colors.surface, borderColor: colors.border },
          pressed && [styles.menuIconContainerPressed, { backgroundColor: colors.border }]
        ]}>
          <Ionicons
            name={iconName}
            size={22}
            color={iconColor || colors.primary}
          />
        </View>
        <View style={styles.menuTextContainer}>
          <Text style={[styles.menuText, { color: colors.text.primary }]}>{title}</Text>
          {subtitle && <Text style={[styles.menuSubtitle, { color: colors.text.secondary }]}>{subtitle}</Text>}
        </View>
        <Ionicons name="chevron-forward" size={20} color={chevronColor} />
      </TouchableOpacity>
      {showDivider && <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />}
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

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../utils/ThemeContext';

/**
 * ProfileSection Component
 *
 * A layout container for grouping related profile settings or information.
 * Improved readability by providing a consistent section header and card styling.
 *
 * @param {Object} props - Component props
 * @param {string} props.title - The title of the section
 * @param {React.ReactNode} props.children - The content to display within the section
 * @returns {JSX.Element} The rendered ProfileSection component
 */
const ProfileSection = ({ title, children }) => {
  const { colors, isDarkMode } = useTheme();

  return (
    <View style={[{
      backgroundColor: colors.surface,
      marginHorizontal: 16,
      marginBottom: 16,
      borderRadius: 24,
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 10,
      borderWidth: 1,
      borderColor: '#F0F0F0', // Or dynamically check isDarkMode inside
      paddingVertical: 8,
      overflow: 'hidden'
    }, { borderColor: colors.border }]}>
      <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>{title}</Text>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default ProfileSection;

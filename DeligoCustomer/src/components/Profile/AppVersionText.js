import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTheme } from '../../utils/ThemeContext';
import { useLanguage } from '../../utils/LanguageContext';

/**
 * AppVersionText Component
 * 
 * Displays the current application version.
 * Typically used in settings or profile footers.
 * 
 * @returns {JSX.Element} Rendered text component.
 */
const AppVersionText = () => {
  const { colors } = useTheme();
  const { t } = useLanguage();

  return (
    <Text style={[styles.versionText, { color: colors.text.light }]}>
      {t('version')}
    </Text>
  );
};

const styles = StyleSheet.create({
  versionText: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'Poppins-Regular',
  },
});

export default AppVersionText;

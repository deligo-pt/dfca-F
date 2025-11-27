import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTheme } from '../../utils/ThemeContext';
import { useLanguage } from '../../utils/LanguageContext';

const AppVersionText = () => {
  const { colors } = useTheme();
  const { t } = useLanguage();

  return (
    <Text style={[styles.versionText, { color: colors.text.light }]}>{t('version')}</Text>
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

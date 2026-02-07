import { Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '../../utils/ThemeContext';
import { useLanguage } from '../../utils/LanguageContext';
import firebaseNotificationService from '../../services/firebaseNotificationService';

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

  const handlePress = async () => {
    const token = await firebaseNotificationService.getStoredToken();
    Alert.alert(
      'Debug Info',
      `FCM Token Status:\n${token ? '✅ Present' : '❌ Deleted / None'}\n\n${token ? token.substring(0, 20) + '...' : ''}`
    );
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
      <Text style={[styles.versionText, { color: colors.text.light }]}>
        {t('version')}
      </Text>
    </TouchableOpacity>
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

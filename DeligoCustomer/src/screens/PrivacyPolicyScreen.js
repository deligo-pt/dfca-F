import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../utils/ThemeContext';

const PrivacyPolicyScreen = ({ navigation }) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.primary }]}>Privacy Policy</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <Text style={[styles.closeText, { color: colors.text.primary }]}>✕</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Your Privacy Matters</Text>
        <Text style={[styles.text, { color: colors.text.secondary }]}>We value your privacy and are committed to protecting your personal information.</Text>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>1. Data Collection</Text>
        <Text style={[styles.text, { color: colors.text.secondary }]}>We collect information you provide when you use Deligo, such as your name, email, and order details.</Text>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>2. Data Usage</Text>
        <Text style={[styles.text, { color: colors.text.secondary }]}>Your data is used to provide and improve our services, process orders, and communicate with you.</Text>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>3. Data Sharing</Text>
        <Text style={[styles.text, { color: colors.text.secondary }]}>We do not sell your data. We may share it with partners only to fulfill your orders or comply with the law.</Text>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>4. Security</Text>
        <Text style={[styles.text, { color: colors.text.secondary }]}>We use industry-standard security measures to protect your data.</Text>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>5. Contact Us</Text>
        <Text style={[styles.text, { color: colors.text.secondary }]}>For privacy questions, contact privacy@deligo.com.</Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
    position: 'relative',
  },
  headerTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 22,
    textAlign: 'center',
  },
  closeBtn: {
    position: 'absolute',
    right: 24,
    top: 56,
    padding: 8,
  },
  closeText: {
    fontSize: 22,
    fontFamily: 'Poppins-Bold',
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
    marginTop: 24,
    marginBottom: 8,
  },
  text: {
    fontFamily: 'Poppins-Regular',
    fontSize: 15,
    marginBottom: 8,
    lineHeight: 22,
  },
});

export default PrivacyPolicyScreen;


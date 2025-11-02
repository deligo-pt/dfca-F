import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../utils/ThemeContext';

const TermsOfServiceScreen = ({ navigation }) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.primary }]}>Terms of Service</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <Text style={[styles.closeText, { color: colors.text.primary }]}>✕</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Welcome to Deligo</Text>
        <Text style={[styles.text, { color: colors.text.secondary }]}>By using our app, you agree to the following terms. Please read them carefully.</Text>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>1. Use of Service</Text>
        <Text style={[styles.text, { color: colors.text.secondary }]}>You agree to use Deligo only for lawful purposes and in accordance with these terms.</Text>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>2. User Accounts</Text>
        <Text style={[styles.text, { color: colors.text.secondary }]}>You are responsible for maintaining the confidentiality of your account and password.</Text>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>3. Orders & Payments</Text>
        <Text style={[styles.text, { color: colors.text.secondary }]}>All orders are subject to acceptance and availability. Payments must be made through approved methods.</Text>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>4. Changes to Terms</Text>
        <Text style={[styles.text, { color: colors.text.secondary }]}>We may update these terms at any time. Continued use of the app means you accept the new terms.</Text>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>5. Contact Us</Text>
        <Text style={[styles.text, { color: colors.text.secondary }]}>For questions, contact support@deligo.com.</Text>
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

export default TermsOfServiceScreen;


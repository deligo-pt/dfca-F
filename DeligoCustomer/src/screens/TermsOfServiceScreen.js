import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../theme';

const TermsOfServiceScreen = ({ navigation }) => (
  <View style={styles.container}>
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Terms of Service</Text>
      <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.closeText}>✕</Text>
      </TouchableOpacity>
    </View>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>Welcome to Deligo</Text>
      <Text style={styles.text}>By using our app, you agree to the following terms. Please read them carefully.</Text>
      <Text style={styles.sectionTitle}>1. Use of Service</Text>
      <Text style={styles.text}>You agree to use Deligo only for lawful purposes and in accordance with these terms.</Text>
      <Text style={styles.sectionTitle}>2. User Accounts</Text>
      <Text style={styles.text}>You are responsible for maintaining the confidentiality of your account and password.</Text>
      <Text style={styles.sectionTitle}>3. Orders & Payments</Text>
      <Text style={styles.text}>All orders are subject to acceptance and availability. Payments must be made through approved methods.</Text>
      <Text style={styles.sectionTitle}>4. Changes to Terms</Text>
      <Text style={styles.text}>We may update these terms at any time. Continued use of the app means you accept the new terms.</Text>
      <Text style={styles.sectionTitle}>5. Contact Us</Text>
      <Text style={styles.text}>For questions, contact support@deligo.com.</Text>
    </ScrollView>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 56,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    position: 'relative',
  },
  headerTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 22,
    color: colors.primary || '#E91E63',
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
    color: '#E91E63',
    fontFamily: 'Poppins-Bold',
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
    color: colors.primary || '#E91E63',
    marginTop: 24,
    marginBottom: 8,
  },
  text: {
    fontFamily: 'Poppins-Regular',
    fontSize: 15,
    color: '#444',
    marginBottom: 8,
    lineHeight: 22,
  },
});

export default TermsOfServiceScreen;


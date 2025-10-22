import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../theme';

const PrivacyPolicyScreen = ({ navigation }) => (
  <View style={styles.container}>
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Privacy Policy</Text>
      <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.closeText}>✕</Text>
      </TouchableOpacity>
    </View>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>Your Privacy Matters</Text>
      <Text style={styles.text}>We value your privacy and are committed to protecting your personal information.</Text>
      <Text style={styles.sectionTitle}>1. Data Collection</Text>
      <Text style={styles.text}>We collect information you provide when you use Deligo, such as your name, email, and order details.</Text>
      <Text style={styles.sectionTitle}>2. Data Usage</Text>
      <Text style={styles.text}>Your data is used to provide and improve our services, process orders, and communicate with you.</Text>
      <Text style={styles.sectionTitle}>3. Data Sharing</Text>
      <Text style={styles.text}>We do not sell your data. We may share it with partners only to fulfill your orders or comply with the law.</Text>
      <Text style={styles.sectionTitle}>4. Security</Text>
      <Text style={styles.text}>We use industry-standard security measures to protect your data.</Text>
      <Text style={styles.sectionTitle}>5. Contact Us</Text>
      <Text style={styles.text}>For privacy questions, contact privacy@deligo.com.</Text>
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

export default PrivacyPolicyScreen;


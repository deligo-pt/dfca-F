import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useTheme } from '../../utils/ThemeContext'; // Adjust path as needed

const ProfileHeader = () => {
  const { colors } = useTheme();

  return (
    <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      <View style={styles.headerContent}>
        <Image
          source={require('../../assets/images/logo.png')} // Adjust path as needed
          style={styles.logoImage}
          resizeMode="contain"
        />
        <View style={styles.headerTextContainer}>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Deligo</Text>
          <Text style={[styles.headerSubtitle, { color: colors.text.secondary }]}>Your favorite food, delivered fast 🍔</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    marginBottom: 12,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoImage: {
    width: 50,
    height: 50,
    marginRight: 16,
  },
  headerTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Poppins-Bold',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
  },
});

export default ProfileHeader;

import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAccessToken, getRefreshToken } from '../../utils/storage';
import { BASE_API_URL, API_ENDPOINTS } from '../../constants/config';
import { useTheme } from '../../utils/ThemeContext';
import { useLanguage } from '../../utils/LanguageContext';
const API_URL = `${BASE_API_URL}${API_ENDPOINTS.PROFILE.GET}`;

export default function UserProfileCard({ user: userProp, navigation }) {
    const { colors } = useTheme();
    const { t } = useLanguage();
    const [profile, setProfile] = useState(userProp || null);
    const [loading, setLoading] = useState(!userProp);
    const [error, setError] = useState(null);

    useEffect(() => {
        // If user prop is provided, no need to fetch; otherwise fetch from API
        if (userProp) return;

        const fetchProfile = async () => {
            try {
                setLoading(true);
                setError(null);

                const authToken = await getAccessToken();
                const refreshToken = await getRefreshToken();

                console.log('Hitting API:', API_URL);
                console.log('With Auth Token:', authToken);
                // Avoid logging full refresh token in production; mask for dev debugging
                console.log('Refresh Token (masked):', refreshToken ? `${refreshToken.slice(0,6)}...${refreshToken.slice(-4)}` : null);

                const response = await fetch(API_URL, {
                    method: 'GET',
                    headers: {
                        'Authorization': authToken,
                        'Accept': 'application/json',
                    },
                });

                if (!response.ok) {
                    setError(`Error ${response.status}: ${response.statusText}`);
                    setLoading(false);
                    return;
                }

                const json = await response.json();
                console.log('resposnejson', json);
                setProfile(json.data); // store only the "data" part

            } catch (err) {
                setError(err.message || 'Something went wrong');
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [userProp]);

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors?.primary || undefined} />
                <Text style={[styles.loadingText, { color: colors?.text?.primary }]}>{'Loading profile...'}</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.centered}>
                <Text style={[styles.errorText, { color: colors?.error || 'red' }]}>Failed to load profile:</Text>
                <Text style={[styles.errorText, { color: colors?.error || 'red' }]}>{error}</Text>
            </View>
        );
    }

    if (!profile) {
        return (
            <View style={styles.centered}>
                <Text style={[styles.noProfileText, { color: colors?.text?.primary }]}>No profile data found.</Text>
            </View>
        );
    }

    // Determine avatar source - try common fields then fallback to local image
    const avatarUri = profile.avatar || profile.profilePhoto || profile.image || null;
    const avatarSource = avatarUri ? { uri: avatarUri } : require('../../assets/images/logonew.png');

    const fullName = `${(profile.name?.firstName || profile.firstName || '')} ${(profile.name?.lastName || profile.lastName || '')}`.trim();
    const email = profile.email || profile.contactEmail || 'Not provided';
    const contact = profile.contactNumber || profile.phone || profile.mobile || 'Not provided';

    return (
        <View style={[styles.card, { backgroundColor: colors?.surface || '#fff', shadowColor: colors?.shadow || '#000' }]}>
            <Image source={avatarSource} style={[styles.avatar, { borderColor: colors?.border || 'transparent' }]} />

            {/* Right content: info stacked above a long button */}
            <View style={styles.contentColumn}>
                <View style={styles.info}>
                    <Text style={[styles.name, { color: colors?.text?.primary }]} numberOfLines={2} ellipsizeMode="tail">{fullName || 'Unnamed User'}</Text>
                    <Text style={[styles.meta, { color: colors?.text?.secondary }]}>{email}</Text>
                    <Text style={[styles.meta, { color: colors?.text?.secondary }]}>{contact}</Text>
                </View>

                {/* Long button stretched across the content area inside the card */}
                {navigation && (
                    <TouchableOpacity
                        onPress={() => navigation.navigate('EditProfile', { user: profile })}
                        style={[styles.longButton, { backgroundColor: colors?.primary }]}
                        accessibilityLabel={t('editProfile')}
                        accessibilityRole="button"
                        hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
                    >
                        <Ionicons name="create-outline" size={16} color="#fff" style={{ marginRight: 10 }} />
                        <Text style={styles.longButtonText}>{t('editProfile')}</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    centered: {
        flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16,
    },
    loadingText: {
        fontFamily: 'Poppins-Regular',
        marginTop: 8,
    },
    noProfileText: {
        fontFamily: 'Poppins-Regular',
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#fff',
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        margin: 12,
        minHeight: 96,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        marginRight: 12,
        backgroundColor: '#eee',
    },
    contentColumn: {
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'center',
    },
    info: {
        flex: 1,
        flexShrink: 1,
    },
    name: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 6,
        fontFamily: 'Poppins-Medium',
    },
    meta: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
        fontFamily: 'Poppins-Regular',
    },
    container: {
        flexGrow: 1,
        padding: 24,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 26,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    section: {
        backgroundColor: '#f5f5f5',
        padding: 16,
        borderRadius: 10,
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    item: {
        fontSize: 16,
        marginBottom: 6,
    },
    errorText: {
        color: 'red',
        textAlign: 'center',
        fontFamily: 'Poppins-Regular',
    },
    longButton: {
        marginTop: 10,
        alignSelf: 'stretch',
        height: 44,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 12,
    },
    longButtonText: {
        fontFamily: 'Poppins-Medium',
        fontSize: 15,
        color: '#fff',
    },
});

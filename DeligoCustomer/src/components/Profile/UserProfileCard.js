import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAccessToken, getRefreshToken, removeAccessToken, removeRefreshToken, removeUser } from '../../utils/storage';
import { BASE_API_URL, API_ENDPOINTS } from '../../constants/config';
import { useTheme } from '../../utils/ThemeContext';
import { useLanguage } from '../../utils/LanguageContext';
import { LinearGradient } from 'expo-linear-gradient';
const API_URL = `${BASE_API_URL}${API_ENDPOINTS.PROFILE.GET}`;

const LOGOUT_URL = `${BASE_API_URL}${API_ENDPOINTS.AUTH.LOGOUT}`;

/**
 * Securely logs out the user.
 * Attempts multiple API strategies to ensure server-side session termination.
 * Always cleans up local storage.
 * 
 * @param {string} authToken
 * @param {string} refreshToken
 * @returns {Promise<Object>} API result of the logout attempt.
 */
export const logoutApi = async (authToken, refreshToken) => {
    const doAttempt = async (attemptName, headersObj, bodyObj) => {
        try {
            const response = await fetch(LOGOUT_URL, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    ...headersObj,
                },
                body: bodyObj ? JSON.stringify(bodyObj) : null,
            });

            const status = response.status;
            const text = await response.text();
            let json;
            try { json = text ? JSON.parse(text) : null; } catch (_e) { json = { message: text }; }

            if (!response.ok) {
                return { success: false, status, message: json?.message || response.statusText, data: json, attempt: attemptName };
            }

            return { success: true, status, data: json, attempt: attemptName };
        } catch (error) {
            return { success: false, error: error.message || String(error), attempt: attemptName };
        }
    };

    const rawAuth = authToken || '';
    const bearerAuth = rawAuth && rawAuth.startsWith('Bearer ') ? rawAuth : rawAuth ? `Bearer ${rawAuth}` : undefined;

    // Retry strategies for different backend auth configurations
    const attempts = [
        {
            name: 'bearer-header+body-refresh',
            headers: bearerAuth ? { Authorization: bearerAuth } : {},
            body: refreshToken ? { refreshToken: refreshToken, token: refreshToken } : null,
        },
        {
            name: 'raw-header+body-refresh',
            headers: rawAuth ? { Authorization: rawAuth } : {},
            body: refreshToken ? { refreshToken: refreshToken, token: refreshToken } : null,
        },
        {
            name: 'no-header+body-refresh',
            headers: {},
            body: refreshToken ? { refreshToken: refreshToken } : null,
        },
        {
            name: 'bearer-header+x-refresh-header',
            headers: bearerAuth ? { Authorization: bearerAuth, 'x-refresh-token': refreshToken } : { 'x-refresh-token': refreshToken },
            body: null,
        },
        {
            name: 'body-accessToken',
            headers: {},
            body: rawAuth ? { accessToken: rawAuth } : null,
        },
        {
            name: 'body-token-access',
            headers: {},
            body: rawAuth ? { token: rawAuth } : null,
        },
        {
            name: 'body-both-tokens',
            headers: {},
            body: { accessToken: rawAuth, refreshToken: refreshToken, token: refreshToken },
        },
    ];

    let lastErr = null;
    for (let i = 0; i < attempts.length; i++) {
        const a = attempts[i];
        const res = await doAttempt(a.name, a.headers, a.body);
        if (res.success) return res;

        // Don't retry if unauthorized (already logged out)
        if (res.status === 401) {
            lastErr = res;
            continue;
        }

        return res;
    }

    return lastErr || { success: false, message: 'Logout failed after retries' };
};

export const performLogout = async () => {
    let apiResult = null;
    try {
        const authToken = await getAccessToken();
        const refreshToken = await getRefreshToken();

        apiResult = await logoutApi(authToken, refreshToken);

        if (apiResult) {
            console.warn('[Helper] Logout result:', { attempt: apiResult.attempt, status: apiResult.status, success: apiResult.success });
        }

        // Clean up local storage regardless of API result
        await removeAccessToken();
        await removeRefreshToken();
        await removeUser();

        return apiResult || { success: true };
    } catch (error) {
        // Fallback cleanup
        try {
            await removeAccessToken();
            await removeRefreshToken();
            await removeUser();
        } catch (e) {
        }
        return { success: false, error: error.message || String(error) };
    }
};

/**
 * UserProfileCard Component
 * 
 * Displays user profile summary with navigation to edit details.
 * Fetches profile data if not provided via props.
 * 
 * @param {Object} props
 * @param {Object} [props.user] - Pre-loaded user object.
 * @param {Object} props.navigation - Navigation prop.
 */
export default function UserProfileCard({ user: userProp, navigation }) {
    const { colors, isDarkMode } = useTheme();
    const { t } = useLanguage();
    const [profile, setProfile] = useState(userProp || null);
    const [loading, setLoading] = useState(!userProp);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (userProp) return;

        const fetchProfile = async () => {
            try {
                setLoading(true);
                setError(null);

                const authToken = await getAccessToken();
                const refreshToken = await getRefreshToken();

                console.log('Hitting API:', API_URL);
                console.log('With Auth Token:', authToken);
                console.log('Refresh Token (masked):', refreshToken ? `${refreshToken.slice(0, 6)}...${refreshToken.slice(-4)}` : null);

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
                setProfile(json.data);

            } catch (err) {
                setError(err.message || 'Something went wrong');
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [userProp]);

    useEffect(() => {
        if (userProp) {
            setProfile(userProp);
            setLoading(false);
            setError(null);
        }
    }, [userProp]);

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors?.primary || undefined} />
                <Text style={[styles.loadingText, { color: colors?.text?.primary }]}>{t('loadingProfile')}</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.centered}>
                <Text style={[styles.errorText, { color: colors?.error || 'red' }]}>{t('failedLoadProfile')}</Text>
                <Text style={[styles.errorText, { color: colors?.error || 'red' }]}>{error}</Text>
            </View>
        );
    }

    if (!profile) {
        return (
            <View style={styles.centered}>
                <Text style={[styles.noProfileText, { color: colors?.text?.primary }]}>{t('noProfileFound')}</Text>
            </View>
        );
    }

    const avatarUri = profile.avatar || profile.profilePhoto || profile.image || null;
    const avatarSource = avatarUri ? { uri: avatarUri } : require('../../assets/images/logonew.png');

    const fullName = `${(profile.name?.firstName || profile.firstName || '')} ${(profile.name?.lastName || profile.lastName || '')}`.trim();
    const email = profile.email || profile.contactEmail || t('notProvided');
    const contact = profile.contactNumber || profile.phone || profile.mobile || t('notProvided');

    return (
        <View style={[{
            marginHorizontal: 16,
            marginTop: 24,
            marginBottom: 12,
            borderRadius: 24,
            padding: 20,
            backgroundColor: colors?.surface || '#fff',
            elevation: 6,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.05,
            shadowRadius: 10,
            borderWidth: 1,
            borderColor: isDarkMode ? '#2A2A2A' : '#F0F0F0'
        }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: 'rgba(220,49,115,0.15)', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: isDarkMode ? '#2A2A2A' : '#F5F5F5', marginRight: 16 }}>
                    <Image source={avatarSource} style={{ width: 72, height: 72, borderRadius: 36 }} resizeMode="cover" />
                </View>

                <View style={{ flex: 1, justifyContent: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                        <Text style={{ fontSize: 20, fontFamily: 'Poppins-Bold', color: colors?.text?.primary, letterSpacing: -0.5 }} numberOfLines={1}>{fullName || t('unnamedUser')}</Text>
                        {(profile.verified || profile.isVerified) && (
                            <Ionicons name="checkmark-circle" size={18} color={colors?.success || '#4CAF50'} style={{ marginLeft: 6 }} />
                        )}
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#F5F5F5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 6 }}>
                        <Ionicons name="mail" size={12} color={colors?.text?.secondary} style={{ marginRight: 6 }} />
                        <Text style={{ fontSize: 11, fontFamily: 'Poppins-Medium', color: colors?.text?.secondary }}>{email}</Text>
                    </View>

                    {contact !== t('notProvided') && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#F5F5F5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' }}>
                            <Ionicons name="call" size={12} color={colors?.text?.secondary} style={{ marginRight: 6 }} />
                            <Text style={{ fontSize: 11, fontFamily: 'Poppins-Medium', color: colors?.text?.secondary }}>{contact}</Text>
                        </View>
                    )}
                </View>
            </View>

            <View style={{ height: 1, backgroundColor: isDarkMode ? '#333' : '#F0F0F0', marginVertical: 16 }} />

            {navigation && (
                <TouchableOpacity onPress={() => navigation.navigate('EditProfile', { user: profile })} activeOpacity={0.8}>
                    <LinearGradient
                        colors={['#DC3173', '#ef5a92']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{ height: 48, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <Ionicons name="create-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={{ fontFamily: 'Poppins-SemiBold', fontSize: 15, color: '#fff' }}>{t('editProfile')}</Text>
                    </LinearGradient>
                </TouchableOpacity>
            )}
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
    avatarContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        overflow: 'hidden',
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
        elevation: 3,
        backgroundColor: 'transparent',
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
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    verifiedIcon: {
        marginLeft: 8,
        marginTop: 2,
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
    divider: {
        height: 1,
        marginTop: 10,
        marginBottom: 8,
        width: '100%',
    },
});
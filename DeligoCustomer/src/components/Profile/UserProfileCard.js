import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAccessToken, getRefreshToken, removeAccessToken, removeRefreshToken, removeUser } from '../../utils/storage';
import { BASE_API_URL, API_ENDPOINTS } from '../../constants/config';
import { useTheme } from '../../utils/ThemeContext';
import { useLanguage } from '../../utils/LanguageContext';
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
    const { colors } = useTheme();
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
        <View style={[styles.card, { backgroundColor: colors?.surface || '#fff', shadowColor: colors?.shadow || '#000' }]}>
            <View style={[styles.avatarContainer, { shadowColor: colors?.shadow || '#000' }]}>
                <Image source={avatarSource} style={[styles.avatar, { borderColor: colors?.border || 'transparent' }]} />
            </View>

            <View style={styles.contentColumn}>
                <View style={styles.info}>
                    <View style={styles.nameRow}>
                        <Text style={[styles.name, { color: colors?.text?.primary }]} numberOfLines={2} ellipsizeMode="tail">{fullName || t('unnamedUser')}</Text>
                        {(profile.verified || profile.isVerified) && (
                            <Ionicons name="checkmark-circle" size={16} color={colors?.success || '#4CAF50'} style={styles.verifiedIcon} />
                        )}
                    </View>
                    <Text style={[styles.meta, { color: colors?.text?.secondary }]}>{email}</Text>
                    <Text style={[styles.meta, { color: colors?.text?.secondary }]}>{contact}</Text>
                </View>

                <View style={[styles.divider, { backgroundColor: colors?.border || '#eee' }]} />

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
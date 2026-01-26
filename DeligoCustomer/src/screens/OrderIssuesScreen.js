import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../utils/LanguageContext';
import { useTheme } from '../utils/ThemeContext';
import { BASE_API_URL, API_ENDPOINTS } from '../constants/config';
import StorageService from '../utils/storage';

/**
 * OrderIssuesScreen
 * 
 * Allows users to select a recent order and report an issue.
 * Since there is no direct "Report Issue" API, it redirects to Chat support with context.
 */
const OrderIssuesScreen = ({ navigation }) => {
    const { t } = useLanguage();
    const { colors } = useTheme();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRecentOrders();
    }, []);

    const fetchRecentOrders = async () => {
        try {
            setLoading(true);
            let token = await StorageService.getAccessToken();
            if (token && typeof token === 'object') {
                token = token.accessToken || token.token || token.value;
            }

            const headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            };

            if (token) {
                const rawToken = token.startsWith('Bearer ') ? token.substring(7) : token;
                headers.Authorization = rawToken;
            }

            // Re-using the orders list endpoint
            const url = `${BASE_API_URL}${API_ENDPOINTS.ORDERS.LIST}`;
            const response = await fetch(url, { method: 'GET', headers });
            const responseData = await response.json();

            if (response.ok && responseData.data) {
                // Show recent orders first
                setOrders(responseData.data.slice(0, 10));
            }
        } catch (error) {
            console.error('[OrderIssues] Failed to fetch orders', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOrderPress = (order) => {
        // Navigate to a detail view or directly to chat with this order context
        // For now, let's show a "Select Issue" modal or simple list
        // But since we want to keep it simple as per plan:
        navigation.navigate('Chat', {
            initialMessage: `I have an issue with my order #${order.orderId || order._id?.slice(-6)}`
        });
    };

    const formatDate = (dateString) => {
        try {
            return new Date(dateString).toLocaleDateString();
        } catch {
            return '';
        }
    };

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
        },
        backButton: {
            marginRight: 16,
        },
        headerTitle: {
            fontSize: 18,
            fontFamily: 'Poppins-SemiBold',
            color: colors.text.primary,
        },
        content: {
            padding: 16,
        },
        subtitle: {
            fontSize: 14,
            fontFamily: 'Poppins-Regular',
            color: colors.text.secondary,
            marginBottom: 16,
        },
        orderCard: {
            flexDirection: 'row',
            padding: 16,
            borderRadius: 12,
            backgroundColor: colors.surface,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
        },
        orderInfo: {
            flex: 1,
        },
        merchantName: {
            fontSize: 16,
            fontFamily: 'Poppins-SemiBold',
            color: colors.text.primary,
            marginBottom: 4,
        },
        orderDate: {
            fontSize: 12,
            fontFamily: 'Poppins-Regular',
            color: colors.text.secondary,
            marginBottom: 2,
        },
        orderPrice: {
            fontSize: 14,
            fontFamily: 'Poppins-Medium',
            color: colors.primary,
        },
        chevron: {
            marginLeft: 8,
        },
        loadingContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
        },
        emptyText: {
            textAlign: 'center',
            marginTop: 40,
            color: colors.text.secondary,
            fontFamily: 'Poppins-Regular',
        }
    });

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('reportIssue') || 'Report an Issue'}</Text>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.content}>
                    <Text style={styles.subtitle}>{t('selectOrderIssue') || 'Select an order to report an issue'}</Text>

                    {orders.length === 0 ? (
                        <Text style={styles.emptyText}>{t('noRecentOrders') || 'No recent orders found'}</Text>
                    ) : (
                        orders.map((order) => (
                            <TouchableOpacity
                                key={order._id}
                                style={styles.orderCard}
                                onPress={() => handleOrderPress(order)}
                            >
                                <View style={styles.orderInfo}>
                                    <Text style={styles.merchantName}>
                                        {order.vendorName || order.vendor?.businessName || 'Order'}
                                        <Text style={{ fontSize: 12, color: colors.text.light }}> (#{order.orderId || order._id?.slice(-6)})</Text>
                                    </Text>
                                    <Text style={styles.orderDate}>{formatDate(order.createdAt)} • {order.items?.length || 0} items</Text>
                                    <Text style={styles.orderPrice}>€{order.totalAmount?.toFixed(2) || order.subTotal?.toFixed(2)}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color={colors.text.light} style={styles.chevron} />
                            </TouchableOpacity>
                        ))
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
};

export default OrderIssuesScreen;

import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, ScrollView } from 'react-native';
import { getAccessToken } from '../../utils/storage';
import { BASE_API_URL, API_ENDPOINTS } from '../../constants/config';
const API_URL = `${BASE_API_URL}${API_ENDPOINTS.PROFILE.GET}`;

export default function ProfileScreen() {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                setLoading(true);
                setError(null);

                const authToken = await getAccessToken();

                console.log('Hitting API:', API_URL);
                console.log('With Auth Token:', authToken);

                const response = await fetch(API_URL, {
                    method: 'GET',
                    headers: {
                        'Authorization': authToken,
                        'Accept': 'application/json',
                    },
                });

                if (!response.ok) {
                    throw new Error(`Error: ${response.status} ${response.statusText}`);
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
    }, []);

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" />
                <Text>Loading profile...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.centered}>
                <Text style={styles.errorText}>Failed to load profile:</Text>
                <Text style={styles.errorText}>{error}</Text>
            </View>
        );
    }

    if (!profile) {
        return (
            <View style={styles.centered}>
                <Text>No profile data found.</Text>
            </View>
        );
    }

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>My Profile</Text>

            {/* Name Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Name</Text>
                <Text style={styles.item}>First Name: {profile.name?.firstName}</Text>
                <Text style={styles.item}>Last Name: {profile.name?.lastName}</Text>
            </View>

            {/* Address Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Address</Text>
                <Text style={styles.item}>Street: {profile.address?.street}</Text>
                <Text style={styles.item}>City: {profile.address?.city}</Text>
                <Text style={styles.item}>State: {profile.address?.state}</Text>
                <Text style={styles.item}>Country: {profile.address?.country}</Text>
                <Text style={styles.item}>Postal Code: {profile.address?.postalCode}</Text>
            </View>

            {/* Orders Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Orders</Text>
                <Text style={styles.item}>Total Orders: {profile.orders?.totalOrders}</Text>
                <Text style={styles.item}>Total Spent: {profile.orders?.totalSpent}</Text>
                <Text style={styles.item}>
                    Last Order: {profile.orders?.lastOrderDate || "No orders yet"}
                </Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    centered: {
        flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16,
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
    },
});

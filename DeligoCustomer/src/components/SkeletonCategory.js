import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { useTheme } from '../utils/ThemeContext';

const { width } = Dimensions.get('window');

/**
 * SkeletonItem Component
 *
 * A primitive UI component that creates a pulsing loading effect.
 * Used as a building block for complex skeleton layouts.
 *
 * @param {Object} props
 * @param {number|string} props.width - Skeleton width.
 * @param {number|string} props.height - Skeleton height.
 * @param {Object} [props.style] - Optional style overrides.
 */
const SkeletonItem = ({ width, height, style }) => {
    const { colors } = useTheme();
    const opacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 0.7,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.3,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [opacity]);

    return (
        <Animated.View
            style={[
                {
                    width,
                    height,
                    backgroundColor: colors.border,
                    opacity,
                    borderRadius: 8,
                },
                style,
            ]}
        />
    );
};

/**
 * SkeletonCategory Component
 *
 * Displays a loading placeholder for the main Category/Home screen.
 * Simulates the layout of headers, horizontal lists, chips, and vertical lists
 * to minimize layout shift during data fetching.
 */
const SkeletonCategory = () => {
    const { colors } = useTheme();

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header Placeholder */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <SkeletonItem width={120} height={20} />
                    <SkeletonItem width={80} height={20} />
                </View>
                <View style={{ marginTop: 15 }}>
                    <SkeletonItem width="100%" height={50} style={{ borderRadius: 25 }} />
                </View>
            </View>

            {/* Business Categories Placeholder */}
            <View style={styles.section}>
                <SkeletonItem width={150} height={20} style={{ marginBottom: 15 }} />
                <View style={styles.horizontalRow}>
                    {[1, 2, 3].map((i) => (
                        <View key={i} style={styles.categoryItem}>
                            <SkeletonItem width={70} height={70} style={{ borderRadius: 35, marginBottom: 8 }} />
                            <SkeletonItem width={50} height={12} />
                        </View>
                    ))}
                </View>
            </View>

            {/* Filter Chips Placeholder */}
            <View style={styles.section}>
                <SkeletonItem width={180} height={20} style={{ marginBottom: 15 }} />
                <View style={styles.horizontalRow}>
                    {[1, 2, 3, 4].map((i) => (
                        <View key={i} style={{ marginRight: 15 }}>
                            <SkeletonItem width={100} height={35} style={{ borderRadius: 20 }} />
                        </View>
                    ))}
                </View>
            </View>

            {/* Restaurant List Placeholder */}
            <View style={styles.section}>
                <SkeletonItem width={120} height={20} style={{ marginBottom: 15 }} />
                {[1, 2, 3].map((i) => (
                    <View key={i} style={styles.restaurantCard}>
                        <SkeletonItem width={80} height={80} style={{ borderRadius: 12, marginRight: 15 }} />
                        <View style={{ flex: 1, justifyContent: 'space-between', height: 70 }}>
                            <SkeletonItem width="80%" height={16} />
                            <SkeletonItem width="50%" height={14} />
                            <SkeletonItem width="30%" height={14} />
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    header: {
        marginBottom: 30,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    section: {
        marginBottom: 30,
    },
    horizontalRow: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        gap: 16,
    },
    categoryItem: {
        alignItems: 'center',
    },
    restaurantCard: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
});

export default SkeletonCategory;

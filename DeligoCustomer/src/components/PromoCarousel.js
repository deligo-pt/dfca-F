import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions } from 'react-native';
import { useTheme } from '../utils/ThemeContext';
import { spacing } from '../theme';
import sponsorshipApi from '../utils/sponsorshipApi';

const { width } = Dimensions.get('window');

const MOCK_PROMOS = [
    {
        id: 2, // Legacy support
        title: 'Free Delivery',
        subtitle: 'On your first 3 orders.',
        brand: 'DeliGo Pro',
        cta: 'JOIN NOW',
        image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
        bgColor: '#1A4D2E',
    }
];

const PromoCarousel = ({ promos: propPromos = [], onPress, refreshTrigger = 0 }) => {
    const { colors } = useTheme();
    const scrollRef = useRef(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [apiPromos, setApiPromos] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSponsorships = async () => {
            try {
                const data = await sponsorshipApi.getAllSponsorships();
                const now = new Date();

                const validSponsorships = data.filter(item => {
                    const startDate = new Date(item.startDate);
                    const endDate = new Date(item.endDate);
                    return item.isActive && !item.isDeleted && now >= startDate && now <= endDate;
                }).map(item => ({
                    _id: item._id,
                    sponsorName: item.sponsorName,
                    sponsorType: item.sponsorType,
                    image: item.bannerImage,
                    isActive: item.isActive,
                    // Default values for layout compatibility
                    title: '',
                    brand: item.sponsorName,
                    subtitle: '',
                    bgColor: colors.primary
                }));

                setApiPromos(validSponsorships);
            } catch (error) {
                console.error("Failed to load sponsorships", error);
            } finally {
                setLoading(false);
            }
        };

        fetchSponsorships();
    }, [colors.primary, refreshTrigger]);

    const finalPromos = useMemo(() => {
        const combined = [...apiPromos];
        // Only add prop promos if they are passed and different from default MOCK (or if we want to fallback)
        // Adjusting logic: if API has data, show API. If props passed, append?
        // Let's simplified: API data + Props (if provided explicitely)
        // If propPromos is MOCK_PROMOS, and we have API data, ignore MOCK.
        // If we have API data, we display it.

        if (propPromos !== MOCK_PROMOS && propPromos.length > 0) {
            combined.push(...propPromos);
        } else if (combined.length === 0 && loading) {
            // While loading, maybe show nothing or keep empty
        } else if (combined.length === 0) {
            // If API returned nothing and no props passed, maybe show MOCK?
            // User requested "it will get data from this api", so probably expects only API data.
            // But strict fallback might be safer. Let's return empty if no API data to be clean.
            return [];
        }

        return combined;
    }, [apiPromos, propPromos, loading]);


    useEffect(() => {
        if (finalPromos.length === 0) return;

        const timer = setInterval(() => {
            let nextIndex = currentIndex + 1;
            if (nextIndex >= finalPromos.length) {
                nextIndex = 0;
            }

            if (scrollRef.current) {
                scrollRef.current.scrollTo({
                    x: nextIndex * (width - 40), // Scroll by card width
                    animated: true,
                });
                setCurrentIndex(nextIndex);
            }
        }, 5000);

        return () => clearInterval(timer);
    }, [currentIndex, finalPromos.length]);


    const snapInterval = (width * 0.88) + 12; // Card width + margin

    // Handle manual scroll updates to keep sync
    const handleScroll = (event) => {
        const contentOffsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(contentOffsetX / snapInterval);
        if (index !== currentIndex) {
            setCurrentIndex(index);
        }
    };

    if (!loading && finalPromos.length === 0) return null;

    return (
        <View style={styles.wrapper}>
            <ScrollView
                ref={scrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.container}
                snapToInterval={snapInterval}
                decelerationRate="fast"
                onMomentumScrollEnd={handleScroll}
                scrollEventThrottle={16}
                style={{ flexGrow: 0 }}
            >
                {finalPromos.map((promo, index) => {
                    // Check if it's a pure image ad (Ads type or missing title)
                    const isPureImage = promo.sponsorType === 'Ads' || !promo.title;
                    const imageUrl = promo.image || promo.banner; // Fallback
                    const bgColor = promo.bgColor || colors.primary;

                    return (
                        <TouchableOpacity
                            key={promo.id || promo._id || index}
                            style={[styles.card, { backgroundColor: isPureImage ? '#fff' : bgColor }]}
                            onPress={() => onPress && onPress(promo)}
                            activeOpacity={0.9}
                        >
                            {isPureImage ? (
                                // Pure Image Layout
                                <Image
                                    source={{ uri: imageUrl }}
                                    style={styles.fullImage}
                                    resizeMode="cover"
                                />
                            ) : (
                                // Standard Layout with Text Overlay
                                <View style={styles.content}>
                                    <View style={styles.textContainer}>
                                        <Text style={styles.brand}>{promo.brand || promo.sponsorName}</Text>
                                        <Text style={styles.title} numberOfLines={2}>
                                            {promo.title}
                                        </Text>
                                        <Text style={styles.subtitle} numberOfLines={2}>
                                            {promo.subtitle}
                                        </Text>

                                        {promo.cta && (
                                            <TouchableOpacity style={styles.ctaButton} onPress={() => onPress && onPress(promo)}>
                                                <Text style={styles.ctaText}>{promo.cta}</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>

                                    <View style={styles.imageContainer}>
                                        <Image
                                            source={{ uri: imageUrl }}
                                            style={styles.image}
                                            resizeMode="cover"
                                        />
                                    </View>
                                </View>
                            )}

                            {/* Sponsor Type Badge */}
                            {(promo.sponsorType || promo.label) && (
                                <View style={styles.sponsorBadge}>
                                    <Text style={styles.sponsorText}>
                                        {promo.sponsorType || promo.label}
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View >
    );
};

const styles = StyleSheet.create({
    wrapper: {
        marginBottom: spacing.xs,
    },
    container: {
        paddingHorizontal: 16,
        paddingTop: spacing.md,
        paddingBottom: spacing.sm,
    },
    card: {
        width: width * 0.88,
        height: 160,
        marginRight: 12,
        borderRadius: 20,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
    },
    fullImage: {
        width: '100%',
        height: '100%',
    },
    sponsorBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        zIndex: 10,
    },
    sponsorText: {
        color: '#fff',
        fontSize: 10,
        fontFamily: 'Poppins-Medium',
        textTransform: 'uppercase',
    },
    content: {
        flex: 1,
        position: 'relative',
    },
    textContainer: {
        width: '60%',
        height: '100%',
        padding: 20,
        justifyContent: 'center',
        zIndex: 2,
    },
    brand: {
        color: '#fff',
        fontSize: 12,
        fontFamily: 'Poppins-Bold',
        opacity: 0.9,
        marginBottom: 4,
    },
    title: {
        color: '#fff',
        fontSize: 18,
        fontFamily: 'Poppins-Bold',
        lineHeight: 22,
        marginBottom: 4,
    },
    subtitle: {
        color: '#fff',
        fontSize: 11,
        fontFamily: 'Poppins-Regular',
        opacity: 0.9,
        marginBottom: 12,
    },
    ctaButton: {
        backgroundColor: '#FF6B00',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        alignSelf: 'flex-start',
    },
    ctaText: {
        color: '#fff',
        fontSize: 10,
        fontFamily: 'Poppins-Bold',
        textTransform: 'uppercase',
    },
    imageContainer: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: '45%',
        zIndex: 1,
    },
    image: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    }
});

export default PromoCarousel;

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions } from 'react-native';
import { useTheme } from '../utils/ThemeContext';
import { spacing, borderRadius } from '../theme';

const { width } = Dimensions.get('window');

const MOCK_PROMOS = [
    {
        id: 1,
        title: 'Food In 15 Mins!',
        subtitle: 'Fresh, hot & crisp delights for you.',
        brand: 'Bolt ⚡',
        cta: 'ORDER NOW',
        image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80', // Fried Rice/Bowl
        bgColor: '#5D1F46', // Deep purple from reference
    },
    {
        id: 2,
        title: 'Free Delivery',
        subtitle: 'On your first 3 orders.',
        brand: 'DeliGo Pro',
        cta: 'JOIN NOW',
        image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80', // Food Spread
        bgColor: '#1A4D2E', // Dark Green
    },
    {
        id: 3,
        title: 'Sweet Cravings?',
        subtitle: 'Get 20% off all desserts.',
        brand: 'Sugar Rush',
        cta: 'TREAT YOURSELF',
        image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80', // Chocolate Cake
        bgColor: '#C2185B', // Pink/Berry
    },
    {
        id: 4,
        title: 'Burger Mania',
        subtitle: 'Buy 1 Get 1 Free today!',
        brand: 'Grill Master',
        cta: 'GRAB DEAL',
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80', // Burger
        bgColor: '#E65100', // Deep Orange
    },
    {
        id: 5,
        title: 'Healthy Eats',
        subtitle: 'Fresh salads & power bowls.',
        brand: 'Green Life',
        cta: 'ORDER NOW',
        image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80', // Salad
        bgColor: '#2E7D32', // Leaf Green
    },
];

const PromoCarousel = ({ promos = MOCK_PROMOS, onPress }) => {
    const { colors } = useTheme();
    const scrollRef = React.useRef(null);
    const [currentIndex, setCurrentIndex] = React.useState(0);

    React.useEffect(() => {
        const timer = setInterval(() => {
            let nextIndex = currentIndex + 1;
            if (nextIndex >= promos.length) {
                nextIndex = 0;
            }

            if (scrollRef.current) {
                scrollRef.current.scrollTo({
                    x: nextIndex * (width - 40), // Scroll by card width
                    animated: true,
                });
                setCurrentIndex(nextIndex);
            }
        }, 5000); // 5 seconds (Industry Standard for readability)

        return () => clearInterval(timer);
    }, [currentIndex, promos.length]);


    const snapInterval = (width * 0.88) + 12; // Card width + margin

    // Handle manual scroll updates to keep sync
    const handleScroll = (event) => {
        const contentOffsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(contentOffsetX / snapInterval);
        if (index !== currentIndex) {
            setCurrentIndex(index);
        }
    };

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
                {promos.map((promo) => (
                    <TouchableOpacity
                        key={promo.id}
                        style={[styles.card, { backgroundColor: promo.bgColor || colors.primary }]}
                        onPress={() => onPress && onPress(promo)}
                        activeOpacity={0.9}
                    >
                        <View style={styles.content}>
                            <View style={styles.textContainer}>
                                <Text style={styles.brand}>{promo.brand}</Text>
                                <Text style={styles.title} numberOfLines={2}>
                                    {promo.title}
                                </Text>
                                <Text style={styles.subtitle} numberOfLines={2}>
                                    {promo.subtitle}
                                </Text>

                                <TouchableOpacity style={styles.ctaButton} onPress={() => onPress && onPress(promo)}>
                                    <Text style={styles.ctaText}>{promo.cta}</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.imageContainer}>
                                <Image
                                    source={{ uri: promo.image }}
                                    style={styles.image}
                                    resizeMode="cover"
                                />
                            </View>
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        marginBottom: spacing.xs, // Reduced margin
    },
    container: {
        paddingHorizontal: 16,
        paddingTop: spacing.md,
        paddingBottom: spacing.sm,
    },
    card: {
        width: width * 0.88, // 88% width to allow peeking
        height: 160,
        marginRight: 12, // Gap between cards
        borderRadius: 20,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
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

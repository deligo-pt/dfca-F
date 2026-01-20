import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    Image,
} from 'react-native';
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../utils/LanguageContext';
import { fontSize, spacing } from '../theme';

const { width } = Dimensions.get('window');

// -------- helpers --------
const getFallbackIcon = (category) => {
    const name = (category.name || category.slug || category.id || '').toLowerCase();
    if (name.includes('restaurant') || name.includes('food')) return '🍕';
    if (name.includes('store') || name.includes('grocery') || name.includes('shop')) return '🛒';
    if (name.includes('pharmacy')) return '💊';
    if (name.includes('coffee') || name.includes('cafe')) return '☕';
    return '🏪';
};

// -------- item --------
const BubbleItem = ({ category, selectedId, onPress, colors }) => {
    const [imageError, setImageError] = React.useState(false);

    const isSelected =
        selectedId === category.id ||
        selectedId === category.slug ||
        (selectedId &&
            category.name &&
            selectedId.toLowerCase() === category.name.toLowerCase());

    const rawIcon = category.icon || category.image;
    const isImage =
        typeof rawIcon === 'string' &&
        rawIcon.startsWith('http') &&
        rawIcon.length > 15 &&
        !imageError;

    const fallbackIcon = getFallbackIcon(category);

    return (
        <TouchableOpacity
            style={styles.bubbleContainer}
            activeOpacity={0.75}
            onPress={() => onPress(category)}
        >
            <View
                style={[
                    styles.bubbleCircle,
                    {
                        backgroundColor: isSelected ? '#FFF' : '#F3F4F6',
                        // Add a subtle border to unselected so it's visible
                        borderWidth: isSelected ? 2 : 1,
                        borderColor: isSelected ? colors.primary : '#E5E7EB'
                    },
                ]}
            >
                {isImage ? (
                    <Image
                        source={{ uri: rawIcon }}
                        style={[
                            styles.bubbleImage,
                            // If selected, we shrink it a bit like in your screenshot
                            // If unselected, it fills the circle but gets clipped by overflow:hidden
                            isSelected ? { width: '60%', height: '60%' } : { width: '100%', height: '100%' }
                        ]}
                        resizeMode={isSelected ? "contain" : "cover"}
                        onError={() => setImageError(true)}
                    />
                ) : (
                    <Text style={styles.bubbleIcon}>{fallbackIcon}</Text>
                )}
            </View>

            <Text
                numberOfLines={1}
                style={[
                    styles.bubbleLabel,
                    { color: colors.text.primary },
                    isSelected && {
                        color: colors.primary,
                        fontFamily: 'Poppins-Bold',
                    },
                ]}
            >
                {category.name}
            </Text>
        </TouchableOpacity>
    );
};

// -------- main --------
const GlovoBubbles = ({ categories, onPress, selectedId }) => {
    const { colors } = useTheme();
    const { t } = useLanguage();

    if (!categories?.length) return null;

    return (
        <View style={styles.container}>
            <Text style={[styles.title, { color: colors.text.primary }]}>
                {t('whatDoYouNeed') || "What's on your mind?"}
            </Text>

            <View style={styles.grid}>
                {categories.map((category, index) => (
                    <BubbleItem
                        key={category.id || category.slug || index}
                        category={category}
                        selectedId={selectedId}
                        onPress={onPress}
                        colors={colors}
                    />
                ))}
            </View>
        </View>
    );
};

// -------- styles --------
const CIRCLE_SIZE = 75; // Increased slightly to match your screenshot better

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: spacing.md,
        marginTop: spacing.md,
    },
    title: {
        fontSize: fontSize.lg,
        fontFamily: 'Poppins-Bold',
        marginBottom: spacing.md,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        gap: 15,
    },
    bubbleContainer: {
        width: 85,
        alignItems: 'center',
        marginBottom: 16,
    },
    bubbleCircle: {
        width: CIRCLE_SIZE,
        height: CIRCLE_SIZE,
        borderRadius: CIRCLE_SIZE / 2, // THIS MAKES IT A CIRCLE
        overflow: 'hidden',           // THIS CLIPS THE IMAGE INSIDE TO THE CIRCLE
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
        // Optional shadows
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    bubbleIcon: {
        fontSize: 32,
    },
    bubbleImage: {
        width: '100%',
        height: '100%',
    },
    bubbleLabel: {
        fontSize: 11,
        fontFamily: 'Poppins-Bold',
        textAlign: 'center',
        textTransform: 'uppercase', // Matches your "STORE" and "RESTAURANTS" screenshot
    },
});

export default GlovoBubbles;
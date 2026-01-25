import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../utils/LanguageContext';

const { width } = Dimensions.get('window');

/**
 * BubbleItem Component
 * 
 * Renders a single category as a circular "bubble" item.
 * Supports visuals via remote URL images or emoji characters.
 * 
 * @param {Object} props
 * @param {Object} props.category - Category data object (id, name, image/icon).
 * @param {string} props.selectedId - ID of the currently active category.
 * @param {Function} props.onPress - Selection handler.
 * @param {Object} props.colors - Theme palette.
 */
const BubbleItem = ({ category, selectedId, onPress, colors }) => {
    const [imageError, setImageError] = React.useState(false);

    // Validate inputs
    if (!category) return null;

    const isSelected = selectedId === category.slug || selectedId === category.id;
    const displayName = category.name || '';
    const iconUrl = category.image || category.icon || null;

    // Theme-aware color derivation
    const backgroundColor = isSelected ? colors.primaryLight : colors.surface;
    const textColor = isSelected ? colors.white : colors.text.primary; // Note: Label uses primary for active, text.secondary for inactive in styles below
    const iconColor = isSelected ? colors.white : colors.primary;

    // Icon Strategy:
    // 1. Remote URL (Http/File) -> Render Image
    // 2. String is Emoji-like -> Render Text
    // 3. Fallback -> Render First Letter
    const isImage = iconUrl && !imageError && (typeof iconUrl === 'string' && (iconUrl.startsWith('http') || iconUrl.startsWith('file')));
    const isEmoji = !isImage && typeof iconUrl === 'string' && iconUrl.match(/\p{Emoji}/u);
    const fallbackLetter = displayName.charAt(0).toUpperCase();

    return (
        <TouchableOpacity
            style={styles.bubbleContainer}
            onPress={() => onPress && onPress(category)}
            activeOpacity={0.7}
        >
            <View style={[
                styles.bubbleCircle,
                {
                    backgroundColor: backgroundColor,
                    borderColor: isSelected ? colors.primary : colors.border,
                    borderWidth: isSelected ? 0 : 1
                }
            ]}>
                {isImage ? (
                    <Image
                        source={{ uri: iconUrl }}
                        style={styles.bubbleImage}
                        onError={() => setImageError(true)}
                        resizeMode="cover"
                    />
                ) : (
                    <Text style={[styles.bubbleEmoji, { fontSize: isEmoji ? 24 : 20, color: iconColor }]}>
                        {isEmoji ? iconUrl : fallbackLetter}
                    </Text>
                )}
            </View>
            <Text
                numberOfLines={1}
                style={[styles.bubbleText, { color: isSelected ? colors.primary : colors.text.secondary, fontWeight: isSelected ? '700' : '500' }]}
            >
                {displayName}
            </Text>
        </TouchableOpacity>
    );
};

/**
 * GlovoBubbles Grid
 * 
 * Displays top-level categories in a grid of circular elements.
 * Optimized for visual exploration of cuisines or store types.
 * 
 * @param {Object} props
 * @param {Array} props.categories - Array of category objects to render.
 * @param {Function} props.onPress - Callback for category selection.
 * @param {string} props.selectedId - Currently selected category ID.
 */
const GlovoBubbles = ({ categories, onPress, selectedId }) => {
    const { colors } = useTheme();
    const { t } = useLanguage();

    const data = Array.isArray(categories) ? categories : [];

    if (data.length === 0) {
        return null;
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text.primary }]}>
                    {t('exploreCategories') || 'Explore Categories'}
                </Text>
            </View>
            <View style={styles.grid}>
                {data.map((category, index) => (
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

const styles = StyleSheet.create({
    container: {
        paddingVertical: 15,
        paddingHorizontal: 15,
    },
    header: {
        marginBottom: 10,
        paddingHorizontal: 5
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        fontFamily: 'Poppins-Bold',
        textAlign: 'left',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
    },
    bubbleContainer: {
        width: (width - 40) / 4, // Calculate width to fit 4 items per row accounting for padding
        alignItems: 'center',
        marginBottom: 15,
    },
    bubbleCircle: {
        width: 65,
        height: 65,
        borderRadius: 32.5,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        // Elevation/Shadow for depth
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 3,
    },
    bubbleImage: {
        width: '60%',
        height: '60%',
        borderRadius: 10, // Soften image corners
    },
    bubbleEmoji: {
        textAlign: 'center',
    },
    bubbleText: {
        fontSize: 12,
        textAlign: 'center',
        width: '100%',
        paddingHorizontal: 2
    }
});

export default GlovoBubbles;
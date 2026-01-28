import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../utils/LanguageContext';

/**
 * BubbleItem Component
 * 
 * Renders a single category as a circular "bubble" item.
 * Updated Style: Swiggy-like (Large circle, flat, image full cover).
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
                    // Subtle border only if selected to highlight, otherwise clean
                    borderColor: isSelected ? colors.primary : 'transparent',
                    borderWidth: isSelected ? 2 : 0
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
                    <Text style={[styles.bubbleEmoji, { fontSize: isEmoji ? 32 : 28, color: colors.primary }]}>
                        {isEmoji ? iconUrl : fallbackLetter}
                    </Text>
                )}
            </View>
            <Text
                numberOfLines={2}
                style={[styles.bubbleText, { color: isSelected ? colors.primary : colors.text.primary, fontWeight: isSelected ? '700' : '500' }]}
            >
                {displayName}
            </Text>
        </TouchableOpacity>
    );
};

/**
 * GlovoBubbles (Horizontal List)
 * 
 * Displays top-level categories in a horizontal scrolling list.
 * Optimized for Swiggy-like "What's on your mind?" visual discovery.
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
                    {t('shopOnDeliGo')}
                </Text>
            </View>

            <ScrollView
                horizontal={true}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                decelerationRate="fast"
                snapToInterval={90} // approximate width + margin
                snapToAlignment="start"
            >
                {data.map((category, index) => (
                    <BubbleItem
                        key={category.id || category.slug || index}
                        category={category}
                        selectedId={selectedId}
                        onPress={onPress}
                        colors={colors}
                    />
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingVertical: 15,
        // No horizontal padding on container so scroll goes edge-to-edge
    },
    header: {
        marginBottom: 15,
        paddingHorizontal: 20 // Align title with general app padding
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        fontFamily: 'Poppins-Bold',
        textAlign: 'left',
        letterSpacing: 0.5,
    },
    scrollContent: {
        paddingHorizontal: 15, // Initial padding for the first item
        paddingBottom: 5,      // Space for any potential shadow clipping
    },
    bubbleContainer: {
        width: 100,          // Widened to fit RESTAURANT
        alignItems: 'center',
        marginRight: 4,     // Spacing between items
    },
    bubbleCircle: {
        width: 74,
        height: 74,
        borderRadius: 37,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
        backgroundColor: '#f5f5f5', // Fallback color
        overflow: 'hidden', // Ensure image stays inside circle
    },
    bubbleImage: {
        width: '100%',
        height: '100%',
    },
    bubbleEmoji: {
        textAlign: 'center',
    },
    bubbleText: {
        fontSize: 12, // Industry standard min
        lineHeight: 16,
        textAlign: 'center',
        width: '100%',
        paddingHorizontal: 0,
        fontFamily: 'Poppins-Bold',
        color: '#000000',
        marginTop: 6,
        textTransform: 'uppercase',
        letterSpacing: 0,
    }
});

export default GlovoBubbles;
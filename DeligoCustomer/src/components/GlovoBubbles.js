import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../utils/LanguageContext';

const { width } = Dimensions.get('window');

const BubbleItem = ({ category, selectedId, onPress, colors }) => {
    const [imageError, setImageError] = React.useState(false);

    // Dynamic checks
    const isSelected = selectedId === category.slug || selectedId === category.id;

    // Safety check for category object
    if (!category) return null;

    const displayName = category.name || '';
    const iconUrl = category.image || category.icon || null;

    // Determine background color
    const backgroundColor = isSelected ? colors.primaryLight : colors.surface;
    const textColor = isSelected ? colors.white : colors.text.primary;
    const iconColor = isSelected ? colors.white : colors.primary;

    // Helper to determine if we should show image or text icon
    const isImage = iconUrl && !imageError && (typeof iconUrl === 'string' && (iconUrl.startsWith('http') || iconUrl.startsWith('file')));
    const isEmoji = !isImage && typeof iconUrl === 'string' && iconUrl.match(/\p{Emoji}/u);

    // If no icon/image, use first letter
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

const GlovoBubbles = ({ categories, onPress, selectedId }) => {
    const { colors } = useTheme();
    // Intentionally unused if not needed, but keeping hook call stable
    const { t } = useLanguage();

    // Ensure we have an array
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
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'left',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
    },
    bubbleContainer: {
        width: (width - 40) / 4, // 4 items per row roughly
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
        // Shadow for depth
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
        borderRadius: 10, // Slight rounding for icons
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
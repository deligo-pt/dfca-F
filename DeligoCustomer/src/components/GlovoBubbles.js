import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    StyleSheet,
    Dimensions,
    ScrollView,
} from 'react-native';
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../utils/LanguageContext';

const { width } = Dimensions.get('window');

const BubbleItem = ({ category, selectedId, onPress, colors }) => {
    const [imageError, setImageError] = React.useState(false);

    if (!category) return null;

    const isSelected = selectedId === category.slug || selectedId === category.id;
    const displayName = category.name || '';
    const iconUrl = category.image || category.icon || null;

    const isValidImageUrl =
        iconUrl &&
        typeof iconUrl === 'string' &&
        iconUrl.trim().startsWith('http') &&
        iconUrl.trim().length > 15;

    const showImage = isValidImageUrl && !imageError;

    const fallbackLetter = displayName.charAt(0).toUpperCase();

    // Match CuisineChip selected styles
    const backgroundColor = isSelected ? (colors.primaryLight || '#FFF0F0') : '#F5F5F5';
    const borderColor = isSelected ? colors.primary : 'transparent';
    const borderWidth = isSelected ? 2 : 0;
    const textColor = isSelected ? colors.primary : (colors.text?.primary || '#1C1C1E');

    return (
        <TouchableOpacity
            style={styles.containerStyle}
            onPress={() => onPress && onPress(category)}
            activeOpacity={0.7}
        >
            <View style={[
                styles.imageContainer,
                {
                    backgroundColor,
                    borderColor,
                    borderWidth
                }
            ]}>
                {showImage ? (
                    <Image
                        source={{ uri: iconUrl }}
                        style={styles.chipImage}
                        resizeMode="cover"
                        onError={() => setImageError(true)}
                    />
                ) : iconUrl && typeof iconUrl === 'string' && !iconUrl.startsWith('http') ? (
                    <Text style={styles.emojiIcon}>
                        {iconUrl}
                    </Text>
                ) : (
                    <Text style={[styles.emojiIcon, { color: colors.primary }]}>
                        {fallbackLetter}
                    </Text>
                )}
            </View>
            <Text
                numberOfLines={2}
                style={[styles.name, { color: textColor }]}
            >
                {displayName}
            </Text>
        </TouchableOpacity>
    );
};

const PremiumCategories = ({
    categories,
    onPress,
    selectedId,
    showTitle = true
}) => {
    const { colors } = useTheme();
    const { t } = useLanguage();

    if (!Array.isArray(categories) || categories.length === 0) return null;

    return (
        <View style={styles.wrapper}>
            {showTitle && (
                <View style={styles.header}>
                    <Text style={styles.title}>
                        {t('shopOnDeliGo')}
                    </Text>
                </View>
            )}

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {categories.map((category, index) => (
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
    wrapper: {
        paddingVertical: 15,
    },
    header: {
        marginBottom: 16,
        paddingHorizontal: 20,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        fontFamily: 'Poppins-Bold',
        letterSpacing: 0.2,
        color: '#1C1C1E',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 8,
    },
    containerStyle: {
        width: 85,          // Fixed width for vertical column alignment
        alignItems: 'center',
        marginRight: 8,
    },
    imageContainer: {
        width: 78,
        height: 78,
        borderRadius: 39, // Fully circular
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        backgroundColor: '#FFFFFF',
        overflow: 'hidden', // Clip image to circle
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 3,
    },
    chipImage: {
        width: '100%',
        height: '100%',
    },
    emojiIcon: {
        fontSize: 28,
        textAlign: 'center',
    },
    name: {
        fontSize: 12,
        fontFamily: 'Poppins-SemiBold',
        fontWeight: '600',
        textAlign: 'center',
        width: '100%',
        lineHeight: 16,
        marginTop: 6,
        textTransform: 'uppercase',
    },
});

export default PremiumCategories;